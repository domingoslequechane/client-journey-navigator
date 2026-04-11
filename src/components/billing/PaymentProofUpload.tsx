import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Upload,
  X,
  FileImage,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentProofUploadProps {
  planKey: string;
  planName: string;
  planPrice: number;
  planPriceFormatted?: string;
  organizationId: string;
  userId: string;
  paymentMethod: 'mpesa' | 'emola' | 'bank_transfer';
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentProofUpload({
  planKey,
  planName,
  planPrice,
  planPriceFormatted,
  organizationId,
  userId,
  paymentMethod,
  onSuccess,
  onCancel,
}: PaymentProofUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    mpesa: 'M-Pesa',
    emola: 'E-Mola',
    bank_transfer: 'Transferência Bancária',
  };

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Ficheiro demasiado grande. Máximo 10 MB.');
      return;
    }
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(f.type)) {
      toast.error('Formato não suportado. Use JPG, PNG, WEBP ou PDF.');
      return;
    }
    setFile(f);
    if (f.type !== 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async () => {
    if (!contactPhone.trim()) {
      toast.error('Informe um número de telefone para contacto.');
      return;
    }
    if (!file) {
      toast.error('Seleccione o comprovativo antes de enviar.');
      return;
    }

    setUploading(true);
    try {
      // 1. Upload para Supabase Storage
      const ext = file.name.split('.').pop();
      const filename = `${organizationId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(filename, file, { upsert: false });

      if (uploadError) throw uploadError;

      // 2. Gerar URL assinada de longa duração (7 dias) para o admin visualizar
      const { data: signedData } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(filename, 60 * 60 * 24 * 7); // 7 dias

      const proofUrl = signedData?.signedUrl || filename;

      // 3. Inserir registo na tabela
      const { error: insertError } = await supabase
        .from('manual_payment_requests')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          plan_type: planKey,
          amount_usd: planPrice,
          payment_method: paymentMethod,
          proof_url: proofUrl,
          proof_filename: file.name,
          reference_code: referenceCode.trim() || null,
          contact_phone: contactPhone.trim(),
          status: 'pending',
        });

      if (insertError) throw insertError;

      setSubmitted(true);
      toast.success('Comprovativo enviado com sucesso!');
      setTimeout(() => onSuccess(), 2500);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Erro ao enviar comprovativo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Comprovativo Enviado!</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            A nossa equipe irá validar o seu pagamento e activar a assinatura em breve (normalmente em 10–15 minutos, durante horário laboral).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Instrução contextual */}
      <div className="rounded-lg bg-muted/50 border p-4 text-sm space-y-2">
        <p className="font-medium text-foreground">
          Após efectuar a transferência via{' '}
          <span className="text-primary">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>, envie aqui
          o screenshot/comprovativo do pagamento de{' '}
          <span className="font-bold">{planPriceFormatted || `$${planPrice}/mês`}</span> para o plano{' '}
          <span className="font-bold">{planName}</span>.
        </p>
        <div className="flex items-start gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <span>A activação ocorre em 10–15 minutos durante horário laboral (Seg–Sáb, 08h–17h).</span>
        </div>
      </div>

      {/* Área de drop */}
      <div>
        <Label className="mb-2 block text-sm font-medium">Comprovativo de Pagamento *</Label>
        <div
          className={cn(
            'relative border-2 border-dashed rounded-xl transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : file
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !file && inputRef.current?.click()}
        >
          {file ? (
            <div className="p-4">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Comprovativo"
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded-full p-1 border"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center py-4">
                  <FileImage className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Arraste o ficheiro aqui</p>
                <p className="text-xs text-muted-foreground mt-1">ou clique para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP ou PDF — Máx. 10 MB</p>
              </div>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
      </div>

      {/* Código de referência (opcional) */}
      <div className="space-y-1.5">
        <Label htmlFor="reference" className="text-sm font-medium">
          Código de Referência da Transferência{' '}
          <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id="reference"
          placeholder="Ex: MPESA-2025-XXXXXXX"
          value={referenceCode}
          onChange={(e) => setReferenceCode(e.target.value)}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          O código de referência aparece no SMS de confirmação da transação.
        </p>
      </div>

      {/* Telefone de Contacto */}
      <div className="space-y-1.5">
        <Label htmlFor="contactPhone" className="text-sm font-medium">
          Telefone para Contacto *
        </Label>
        <Input
          id="contactPhone"
          placeholder="Ex: +258 84 123 4567"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          A equipa de suporte poderá utilizar este número se houver algum problema.
        </p>
      </div>

      {/* Acção */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={uploading}
        >
          Voltar
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={!file || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Comprovativo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
