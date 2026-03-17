"use client";

import { useState, useRef } from 'react';
import {
    Sparkles, Loader2, Upload, X, Zap, Image as ImageIcon, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { StudioTool, ToolGenerationSettings, StudioImageSize } from '@/types/studio';
import { useAuth } from '@/contexts/AuthContext';

interface ToolGenerationPanelProps {
    tool: StudioTool;
    onGenerate: (settings: ToolGenerationSettings) => Promise<void>;
    isGenerating: boolean;
    dailyCount?: number;
}

const SIZE_LIST: { value: StudioImageSize; label: string; aspect: string; w: number; h: number }[] = [
    { value: '1080x1080', label: 'Post', aspect: '1:1', w: 1, h: 1 },
    { value: '1080x1920', label: 'Stories', aspect: '9:16', w: 9, h: 16 },
    { value: '1920x1080', label: 'Banner', aspect: '16:9', w: 16, h: 9 },
    { value: '1080x1350', label: 'Carrossel', aspect: '4:5', w: 4, h: 5 },
    { value: '1280x720', label: 'YouTube', aspect: '16:9', w: 16, h: 9 },
];

const DAILY_LIMIT = 10;
const EXEMPT_EMAILS = ['domingosf.lequechane@gmail.com'];

export function ToolGenerationPanel({
    tool,
    onGenerate,
    isGenerating,
    dailyCount = 0,
}: ToolGenerationPanelProps) {
    const { user } = useAuth();
    const isExempt = user?.email && EXEMPT_EMAILS.includes(user.email);
    const limitReached = !isExempt && dailyCount >= DAILY_LIMIT;

    const [prompt, setPrompt] = useState('');
    const [size, setSize] = useState<StudioImageSize>('1080x1080');
    const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');
    const [model, setModel] = useState<'gemini-flash' | 'gemini-pro'>('gemini-flash');
    const [inputImage, setInputImage] = useState<string>('');
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
            toast.error('Imagem muito grande (máx 8MB)');
            return;
        }
        setUploading(true);
        try {
            const fileName = `tool-inputs/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('studio-assets').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('studio-assets').getPublicUrl(fileName);
            setInputImage(publicUrl);
            toast.success('Imagem carregada!');
        } catch {
            toast.error('Erro ao carregar imagem');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        if (limitReached) return;
        if (!prompt.trim()) {
            toast.error('Adicione uma descrição antes de gerar.');
            return;
        }
        if (tool.requiresInputImage && !inputImage) {
            toast.error(`Por favor carregue uma imagem: ${tool.inputLabel}`);
            return;
        }
        await onGenerate({ toolId: tool.id, prompt: prompt.trim(), size, style, model, inputImage: inputImage || undefined });
    };

    const canGenerate = prompt.trim().length > 0 && !isGenerating && !limitReached &&
        (!tool.requiresInputImage || !!inputImage);

    return (
        <div className="space-y-5">
            {/* Daily limit badge */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-tighter">
                        Studio AI Active
                    </span>
                </div>
                {!isExempt ? (
                    <Badge variant={limitReached ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {Math.max(0, DAILY_LIMIT - dailyCount)} / {DAILY_LIMIT} hoje
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                        Dev: Ilimitado
                    </Badge>
                )}
            </div>

            {limitReached && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                    <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                    <p><strong>Limite diário atingido.</strong> Você pode gerar até {DAILY_LIMIT} imagens por dia. O limite reseta à meia-noite.</p>
                </div>
            )}

            {/* Input Image Upload (conditional) */}
            {tool.requiresInputImage && (
                <div className="space-y-2">
                    <Label className="text-xs font-medium">{tool.inputLabel || 'Imagem de entrada'}</Label>
                    {inputImage ? (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border group max-h-48">
                            <img src={inputImage} alt="Input" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => setInputImage('')}
                                className="absolute top-2 right-2 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={uploading || limitReached}
                            className={cn(
                                'w-full h-28 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all',
                                'hover:border-primary/60 hover:bg-primary/5',
                                limitReached ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                            )}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-xs text-muted-foreground">A carregar...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Clique para carregar</span>
                                    <span className="text-[10px] text-muted-foreground/60">PNG, JPG · máx 8MB</span>
                                </>
                            )}
                        </button>
                    )}
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
            )}

            {/* Prompt */}
            <div className="space-y-2">
                <Label htmlFor="tool-prompt" className="text-xs font-medium">Descrição / Prompt</Label>
                <Textarea
                    id="tool-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={tool.promptPlaceholder}
                    className="min-h-[90px] resize-none text-sm"
                    disabled={limitReached}
                />
            </div>

            {/* Size */}
            <div className="space-y-2">
                <Label className="text-xs font-medium">Tamanho</Label>
                <div className="grid grid-cols-5 gap-1.5">
                    {SIZE_LIST.map((option) => {
                        const maxDim = 36;
                        const ratio = Math.max(option.w, option.h);
                        const w = Math.round((option.w / ratio) * maxDim);
                        const h = Math.round((option.h / ratio) * maxDim);
                        return (
                            <Tooltip key={option.value}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setSize(option.value)}
                                        className={cn(
                                            'flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all',
                                            size === option.value
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-border hover:border-primary/50'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'rounded-sm border-2 transition-colors',
                                                size === option.value ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
                                            )}
                                            style={{ width: `${w}px`, height: `${h}px` }}
                                        />
                                        <span className="text-[9px] font-medium text-muted-foreground">{option.aspect}</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom"><p>{option.label} ({option.value})</p></TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </div>

            {/* Model & Style */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Modelo IA</Label>
                    <Select value={model} onValueChange={(v) => setModel(v as any)}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gemini-flash">
                                <span className="flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> Nano 2 (Rápido)</span>
                            </SelectItem>
                            <SelectItem value="gemini-pro">
                                <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Nano Pro</span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Estilo</Label>
                    <div className="flex gap-1.5">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setStyle('vivid')}
                                    className={cn(
                                        'flex-1 flex items-center justify-center p-2 rounded-lg border transition-all',
                                        style === 'vivid' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                    )}
                                >
                                    <Sparkles className={cn('h-4 w-4', style === 'vivid' ? 'text-primary' : 'text-muted-foreground')} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Vivid (Vibrante)</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => setStyle('natural')}
                                    className={cn(
                                        'flex-1 flex items-center justify-center p-2 rounded-lg border transition-all',
                                        style === 'natural' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                                    )}
                                >
                                    <ImageIcon className={cn('h-4 w-4', style === 'natural' ? 'text-primary' : 'text-muted-foreground')} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Natural</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full gap-2"
                size="lg"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        A gerar...
                    </>
                ) : limitReached ? (
                    <>
                        <Lock className="h-4 w-4" />
                        Limite Diário Atingido
                    </>
                ) : (
                    <>
                        <Sparkles className="h-4 w-4" />
                        Gerar com IA
                    </>
                )}
            </Button>

            {isGenerating && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    <div className="text-xs text-muted-foreground space-y-0.5">
                        <p className="font-medium text-primary">IA a processar...</p>
                        <p>Preparando, gerando e otimizando a imagem</p>
                    </div>
                </div>
            )}
        </div>
    );
}
