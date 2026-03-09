import { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkerMessage, WorkerResponse } from './bgRemoval.worker';

export function useBackgroundRemoval() {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');

    // Store promises to resolve them when the worker replies
    const callbacksRef = useRef<Map<string, { resolve: (val: string) => void, reject: (err: Error) => void }>>(new Map());

    useEffect(() => {
        // Initialize the worker
        const worker = new Worker(new URL('./bgRemoval.worker.ts', import.meta.url), {
            type: 'module'
        });

        workerRef.current = worker;

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const msg = event.data;

            switch (msg.type) {
                case 'ready':
                    setIsReady(true);
                    setProgressStatus('Modelo de IA carregado');
                    break;
                case 'progress':
                    setProgressStatus(msg.status);
                    setProgress(msg.progress);
                    break;
                case 'success':
                    const successCb = callbacksRef.current.get(msg.id);
                    if (successCb) {
                        successCb.resolve(msg.imageBase64);
                        callbacksRef.current.delete(msg.id);
                    }
                    break;
                case 'error':
                    const errorCb = callbacksRef.current.get(msg.id);
                    if (errorCb) {
                        errorCb.reject(new Error(msg.error));
                        callbacksRef.current.delete(msg.id);
                    }
                    break;
            }
        };

        // Warm up the model (start downloading the ONNX weights)
        worker.postMessage({ type: 'init' } as WorkerMessage);

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    const removeBackground = useCallback(async (imageBase64: string): Promise<string> => {
        if (!workerRef.current) {
            throw new Error("Serviço de IA Offline");
        }

        setIsLoading(true);
        setProgressStatus('Processando imagem (Isto pode levar alguns segundos na primeira vez)...');

        const id = Math.random().toString(36).substring(7);

        try {
            const result = await new Promise<string>((resolve, reject) => {
                callbacksRef.current.set(id, { resolve, reject });
                workerRef.current?.postMessage({
                    type: 'remove-bg',
                    id,
                    imageBase64
                } as WorkerMessage);
            });

            return result;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isReady,
        isLoading,
        progress,
        progressStatus,
        removeBackground
    };
}
