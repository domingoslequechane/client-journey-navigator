import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Loader2,
    Copy,
    Check,
    Upload,
    X,
    Image as ImageIcon,
    MessageSquare,
    Wand2,
    History,
    Languages,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAICaption } from '@/hooks/useAICaption';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

const TONES = [
    { value: 'direto', label: 'Direto', emoji: '😎' },
    { value: 'casual', label: 'Casual', emoji: '🤗' },
    { value: 'persuasivo', label: 'Persuasivo', emoji: '🤩' },
    { value: 'alegre', label: 'Alegre', emoji: '🤣' },
    { value: 'amigavel', label: 'Amigável', emoji: '😊' },
];

const LENGTHS = [
    { value: 'curta', label: 'Curta', description: 'Até 150 caracteres' },
    { value: 'media', label: 'Média', description: '150-400 caracteres' },
    { value: 'longa', label: 'Longa', description: '400-800 caracteres' },
];

const OBJECTIVES = [
    { value: 'venda', label: 'Venda', emoji: '💰' },
    { value: 'conscientizacao', label: 'Autoridade', emoji: '📢' },
    { value: 'engajamento', label: 'Engajamento', emoji: '💬' },
    { value: 'educativo', label: 'Educativo', emoji: '📚' },
    { value: 'institucional', label: 'Institucional', emoji: '🏢' },
];

export default function AICreator() {
    const { organizationId } = useOrganization();
    const [tone, setTone] = useState('direto');
    const [length, setLength] = useState('media');
    const [objective, setObjective] = useState('venda');
    const [topic, setTopic] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [generatedCaption, setGeneratedCaption] = useState('');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { isGenerating, error, generateCaption } = useAICaption();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles].slice(0, 10)); // Limit to 10 for carousel
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (files.length === 0 && !topic) {
            toast.error("Por favor, adicione uma imagem ou um tópico.");
            return;
        }

        const caption = await generateCaption({
            tone,
            length,
            objective,
            topic,
            clientId: null,
            files,
            platforms: ['instagram', 'facebook']
        });

        if (caption) {
            setGeneratedCaption(caption);
            toast.success("Conteúdo gerado com sucesso!");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCaption);
        setCopied(true);
        toast.success("Copiado para a área de transferência");
        setTimeout(() => setCopied(false), 2000);
    };

    const previewUrls = useMemo(() => {
        return files.map(f => URL.createObjectURL(f));
    }, [files]);

    return (
        <div className="container max-w-6xl mx-auto py-8 px-4 h-full flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Legendador</h1>
                    <p className="text-muted-foreground mt-1">
                        Transforme suas imagens em conteúdo profissional com análise inteligente.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Vibe 2026 Edition
                    </Badge>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <X className="h-5 w-5" />
                    <div>
                        <p className="font-bold">Houve um erro ao gerar</p>
                        <p className="opacity-80">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Lado Esquerdo: Configuração */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-primary/10 shadow-lg shadow-primary/5 overflow-hidden">
                        <CardHeader className="pb-4 bg-muted/30">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wand2 className="h-5 w-5 text-primary" />
                                Configuração
                            </CardTitle>
                            <CardDescription>Defina o tom e o objetivo da sua postagem.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {/* Upload de Imagem */}
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold">Imagens para Análise {files.length > 0 && `(${files.length}/10)`}</Label>

                                {previewUrls.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                            {previewUrls.map((url, i) => (
                                                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-primary/20 bg-muted flex-shrink-0 group">
                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removeFile(i)}
                                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                    <Badge variant="secondary" className="absolute bottom-1 right-1 h-4 px-1 text-[8px]">
                                                        #{i + 1}
                                                    </Badge>
                                                </div>
                                            ))}
                                            {files.length < 10 && (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all flex-shrink-0"
                                                >
                                                    <Upload className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">
                                            {files.length > 1 ? "Modo Carrossel ativo: a IA analisará a sequência." : "A IA analisará esta imagem."}
                                        </p>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-muted-foreground group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                            <Upload className="h-6 w-6 group-hover:text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium">Clique para subir imagens</p>
                                            <p className="text-[11px] opacity-60">Suporta múltiplos arquivos (Carrossel)</p>
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>

                            <Separator className="opacity-50" />

                            {/* Parâmetros */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Tom de voz</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TONES.map(t => (
                                            <button
                                                key={t.value}
                                                onClick={() => setTone(t.value)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all text-left",
                                                    tone === t.value
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border hover:bg-muted"
                                                )}
                                            >
                                                <span className="text-base">{t.emoji}</span>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Objetivo</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {OBJECTIVES.map(o => (
                                            <button
                                                key={o.value}
                                                onClick={() => setObjective(o.value)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all text-left",
                                                    objective === o.value
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border hover:bg-muted"
                                                )}
                                            >
                                                <span className="text-base">{o.emoji}</span>
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Tamanho</Label>
                                    <div className="flex gap-2">
                                        {LENGTHS.map(l => (
                                            <button
                                                key={l.value}
                                                onClick={() => setLength(l.value)}
                                                className={cn(
                                                    "flex-1 px-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all",
                                                    length === l.value
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-border hover:bg-muted"
                                                )}
                                            >
                                                {l.value === 'media' ? 'Médio' : l.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Contexto Adicional (opcional)</Label>
                                    <Textarea
                                        placeholder="Algum detalhe específico que a IA deve saber?"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="min-h-[80px] resize-none"
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-6 rounded-xl text-md font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Analisando e Gerando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-5 w-5 mr-2" />
                                        Gerar Conteúdo
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Lado Direito: Resultado */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <Card className="flex-1 border-primary/10 shadow-lg min-h-[500px] flex flex-col overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg">Conteúdo Gerado</CardTitle>
                                </div>
                                {generatedCaption && (
                                    <Button variant="outline" size="sm" onClick={handleCopy} className="h-9 gap-2">
                                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        {copied ? "Copiado" : "Copiar"}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 flex flex-col relative">
                            {isGenerating ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10 p-12 text-center animate-in fade-in duration-500">
                                    <div className="relative mb-6">
                                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                                        <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">A QIA está trabalhando...</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto">
                                        Nossa inteligência artificial está analisando cada detalhe da sua imagem para criar a legenda perfeita.
                                    </p>
                                    <div className="mt-8 w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary animate-progress-flow"></div>
                                    </div>
                                </div>
                            ) : generatedCaption ? (
                                <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <div className="whitespace-pre-wrap leading-relaxed text-base font-medium p-6 rounded-2xl bg-muted/20 border border-primary/5 shadow-inner">
                                            {generatedCaption}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t opacity-80 scale-95 origin-top transition-all">
                                        <div className="p-4 rounded-xl border bg-muted/10 space-y-2">
                                            <div className="flex items-center gap-2 text-primary">
                                                <History className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Dica de Especialista</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground italic">
                                                "O tom <strong>{TONES.find(t => t.value === tone)?.label}</strong> performa melhor em horários de pico."
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl border bg-muted/10 space-y-2">
                                            <div className="flex items-center gap-2 text-primary">
                                                <Languages className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Cross-Platform</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Sugerimos adaptar as hashtags caso publique no LinkedIn.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                                    <ImageIcon className="h-20 w-20 mb-6 text-muted-foreground stroke-[1px]" />
                                    <h3 className="text-xl font-medium mb-2">Pronto para criar?</h3>
                                    <p className="max-w-xs mx-auto text-sm">
                                        Configure as opções à esquerda e clique em "Gerar Conteúdo" para ver a mágica acontecer.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                        {generatedCaption && !isGenerating && (
                            <div className="p-4 bg-muted/30 border-t flex items-center justify-between">
                                <p className="text-[10px] text-muted-foreground truncate max-w-[50%] flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    Gerado por QIA Engine v4.0
                                </p>
                                <Button variant="ghost" size="sm" className="text-xs font-bold hover:text-primary transition-colors group">
                                    Agendar Publicação
                                    <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
