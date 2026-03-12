import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SocialPlatform, ContentType } from '@/lib/social-media-mock';

interface GenerateOptions {
    platforms?: SocialPlatform[];
    contentType?: ContentType;
    tone: string;
    length: string;
    objective: string;
    topic?: string;
    clientId: string | null;
    files?: File[];
    mediaUrls?: string[];
}

export function useAICaption() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const compressMedia = (source: File | string, maxWidth = 800, quality = 0.6): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            const isFile = source instanceof File;
            const url = isFile ? URL.createObjectURL(source) : (source as string);

            img.crossOrigin = "anonymous";
            img.onload = () => {
                if (isFile) URL.revokeObjectURL(url);
                try {
                    const canvas = document.createElement('canvas');
                    let w = img.width;
                    let h = img.height;
                    if (w > maxWidth) {
                        h = Math.round((h * maxWidth) / w);
                        w = maxWidth;
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(null); return; }
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch (e) {
                    console.error("Canvas error:", e);
                    resolve(null);
                }
            };
            img.onerror = () => {
                console.error("Image load error for URL:", url);
                if (isFile) URL.revokeObjectURL(url);
                resolve(null);
            };
            img.src = url;
        });
    };

    const generateCaption = async (options: GenerateOptions): Promise<string | null> => {
        setIsGenerating(true);
        setError(null);
        try {
            const {
                platforms = [],
                contentType = 'feed',
                tone,
                length,
                objective,
                topic,
                clientId,
                files = [],
                mediaUrls = []
            } = options;

            // Gather base64 versions of local File objects
            const sources: File[] = files.filter(f => f && f.type.startsWith('image/'));
            const mediaData: string[] = [];

            if (sources.length > 0) {
                const compressed = await Promise.all(sources.slice(0, 10).map(f => compressMedia(f)));
                compressed.forEach(d => { if (d) mediaData.push(d); });
            }

            // Filter remote URLs - GPT cannot fetch local blob URLs
            const remoteUrls = mediaUrls.filter(url => {
                const isVideo = url.includes('video') || /\.(mp4|mov|avi|webm|m4v)$/i.test(url);
                const isBlob = url.startsWith('blob:');
                return !isVideo && !isBlob;
            });

            const { data, error: invokeError } = await supabase.functions.invoke('generate-social-caption', {
                body: {
                    platforms,
                    content_type: contentType,
                    media_data: mediaData,
                    media_urls: remoteUrls,
                    tone,
                    length,
                    objective,
                    topic: topic?.trim() || undefined,
                    client_id: clientId,
                },
            });

            if (invokeError) throw invokeError;
            if (data?.error) {
                const detailedMsg = data.details ? `${data.error} (${data.details})` : data.error;
                throw new Error(detailedMsg);
            }

            return data.caption || null;
        } catch (err: any) {
            console.error('Error generating caption:', err);
            const msg = err.message || 'Erro ao gerar legenda. Tente novamente.';
            setError(msg);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isGenerating,
        error,
        generateCaption,
        compressMedia
    };
}
