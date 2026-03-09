import { env, AutoModel, AutoProcessor, RawImage } from '@xenova/transformers';
import type { PreTrainedModel, Processor } from '@xenova/transformers';

// Configure transformers.js environment
// Important for browser context to use WASM
env.allowLocalModels = false;
env.useBrowserCache = true;

// Type definition for the worker messages
export type WorkerMessage =
    | { type: 'init' }
    | { type: 'remove-bg'; id: string; imageBase64: string }
    | { type: 'warmup' };

export type WorkerResponse =
    | { type: 'ready' }
    | { type: 'progress'; status: string; progress: number }
    | { type: 'success'; id: string; imageBase64: string }
    | { type: 'error'; id: string; error: string };

class BackgroundRemovalPipeline {
    static model: PreTrainedModel | null = null;
    static processor: Processor | null = null;
    static isInitializing = false;
    static initializationPromise: Promise<void> | null = null;

    static async init(onProgress?: (info: any) => void) {
        if (this.model && this.processor) return;

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.isInitializing = true;

        this.initializationPromise = (async () => {
            try {
                // We use RMBG-1.4 which is highly optimized for commerce/portraits
                const modelId = 'briaai/RMBG-1.4';

                console.log("Loading background removal model...");

                this.processor = await AutoProcessor.from_pretrained(modelId, {
                    revision: 'main'
                });

                this.model = await AutoModel.from_pretrained(modelId, {
                    // Use WebGPU if available via ONNX Runtime Web, otherwise fallback to WASM
                    quantized: true,
                    revision: 'main',
                    progress_callback: (progressInfo: any) => {
                        if (onProgress) onProgress(progressInfo);
                    }
                });

                console.log("Model loaded successfully");
            } catch (error) {
                console.error("Failed to load model:", error);
                this.model = null;
                this.processor = null;
                throw error;
            } finally {
                this.isInitializing = false;
            }
        })();

        return this.initializationPromise;
    }

    static async removeBackground(imageBase64: string): Promise<string> {
        if (!this.model || !this.processor) {
            await this.init();
        }

        if (!this.model || !this.processor) {
            throw new Error("Model not initialized");
        }

        // Convert base64 to RawImage
        const image = await RawImage.fromURL(imageBase64);

        // Process the image
        const { pixel_values } = await this.processor(image);

        // Run the model
        const { output } = await this.model({ input: pixel_values });

        // Extract the matte (alpha channel)
        // The output is a tensor of shape [1, 1, H, W]
        const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

        // Create new image with transparency
        const canvas = new OffscreenCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context");

        // Draw original image
        const imgData = new ImageData(
            new Uint8ClampedArray(image.data),
            image.width,
            image.height
        );
        ctx.putImageData(imgData, 0, 0);

        // Apply the mask as alpha channel
        const maskData = mask.data;
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < maskData.length; i++) {
            // maskData has 1 channel (grayscale)
            // currentImageData has 4 channels (RGBA)
            // We set the Alpha channel (index + 3) to the mask value
            currentImageData.data[i * 4 + 3] = maskData[i];
        }

        ctx.putImageData(currentImageData, 0, 0);

        // Convert canvas to base64 blob
        const blob = await canvas.convertToBlob({ type: 'image/png' });

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    try {
        switch (message.type) {
            case 'init':
            case 'warmup':
                await BackgroundRemovalPipeline.init((progressInfo) => {
                    self.postMessage({
                        type: 'progress',
                        status: progressInfo.status || 'loading',
                        progress: progressInfo.progress || 0
                    } as WorkerResponse);
                });
                self.postMessage({ type: 'ready' } as WorkerResponse);
                break;

            case 'remove-bg':
                const resultBase64 = await BackgroundRemovalPipeline.removeBackground(message.imageBase64);
                self.postMessage({
                    type: 'success',
                    id: message.id,
                    imageBase64: resultBase64
                } as WorkerResponse);
                break;
        }
    } catch (error: any) {
        console.error("Worker error:", error);
        if (message.type === 'remove-bg') {
            self.postMessage({
                type: 'error',
                id: (message as any).id,
                error: error.message || 'Unknown processing error'
            } as WorkerResponse);
        }
    }
});
