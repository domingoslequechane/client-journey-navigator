import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Check, Loader2, AlertCircle } from 'lucide-react';
import type { LinkBlock, LinkPageTheme } from '@/types/linktree';
import { supabase } from '@/integrations/supabase/client';

interface ContactFormBlockPreviewProps {
  block: LinkBlock;
  theme: LinkPageTheme;
  isPreview?: boolean;
  onRecordClick?: (blockId: string) => void;
  linkPageName?: string;
}

interface ContactFormConfig {
  title?: string;
  description?: string;
  submitButtonText?: string;
  successMessage?: string;
  recipientEmail?: string;
  fields?: {
    name: boolean;
    email: boolean;
    phone: boolean;
    message: boolean;
  };
}

export function ContactFormBlockPreview({ 
  block, 
  theme, 
  isPreview = false,
  onRecordClick,
  linkPageName = 'Página de Links'
}: ContactFormBlockPreviewProps) {
  const formConfig = (block.content.formConfig as ContactFormConfig) || {
    title: 'Entre em contato',
    description: 'Preencha o formulário abaixo',
    submitButtonText: 'Enviar',
    successMessage: 'Mensagem enviada com sucesso!',
    fields: { name: true, email: true, phone: false, message: true },
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (isPreview) {
      // No actual submission in preview mode
      return;
    }

    // Validate recipient email
    if (!formConfig.recipientEmail) {
      setErrorMessage('Formulário não configurado corretamente.');
      return;
    }

    onRecordClick?.(block.id);
    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke('send-contact-form', {
        body: {
          recipientEmail: formConfig.recipientEmail,
          pageName: linkPageName,
          senderName: formData.name || undefined,
          senderEmail: formData.email,
          senderPhone: formData.phone || undefined,
          message: formData.message || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar mensagem');
      }

      setIsSuccess(true);
      setFormData({ name: '', email: '', phone: '', message: '' });

      // Reset success state after a delay
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (error: any) {
      console.error('Error sending contact form:', error);
      setErrorMessage(error.message || 'Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonRadius = 
    theme.buttonRadius === 'pill' ? 'rounded-full' :
    theme.buttonRadius === 'rounded' ? 'rounded-xl' :
    theme.buttonRadius === 'soft' ? 'rounded-lg' : 'rounded';

  if (isSuccess) {
    return (
      <div 
        className={`p-6 ${buttonRadius} text-center`}
        style={{ 
          backgroundColor: `${theme.primaryColor}20`,
          color: theme.textColor,
        }}
      >
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <Check className="h-6 w-6" style={{ color: theme.textColor }} />
        </div>
        <p className="font-medium">{formConfig.successMessage}</p>
      </div>
    );
  }

  return (
    <div 
      className={`p-4 ${buttonRadius}`}
      style={{ 
        backgroundColor: `${theme.primaryColor}15`,
      }}
    >
      {formConfig.title && (
        <h3 
          className="text-lg font-semibold text-center mb-1"
          style={{ color: theme.textColor }}
        >
          {formConfig.title}
        </h3>
      )}
      
      {formConfig.description && (
        <p 
          className="text-sm text-center mb-4 opacity-80"
          style={{ color: theme.textColor }}
        >
          {formConfig.description}
        </p>
      )}

      {errorMessage && (
        <div 
          className="flex items-center gap-2 p-3 rounded-lg mb-4"
          style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {formConfig.fields?.name && (
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Seu nome"
            required
            className="bg-background/80"
            disabled={isPreview}
          />
        )}

        {formConfig.fields?.email && (
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Seu email"
            required
            className="bg-background/80"
            disabled={isPreview}
          />
        )}

        {formConfig.fields?.phone && (
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Seu telefone"
            className="bg-background/80"
            disabled={isPreview}
          />
        )}

        {formConfig.fields?.message && (
          <Textarea
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            placeholder="Sua mensagem"
            required
            rows={3}
            className="bg-background/80 resize-none"
            disabled={isPreview}
          />
        )}

        <Button
          type="submit"
          className={`w-full ${buttonRadius}`}
          style={{
            backgroundColor: theme.primaryColor,
            color: theme.textColor,
          }}
          disabled={isSubmitting || isPreview}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {formConfig.submitButtonText || 'Enviar'}
        </Button>
      </form>
    </div>
  );
}
