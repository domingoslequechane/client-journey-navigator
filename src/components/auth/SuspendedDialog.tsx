import { useTranslation } from 'react-i18next';
import { ShieldAlert, X, Sparkles, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface SuspendedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuspendedDialog({ open, onOpenChange }: SuspendedDialogProps) {
  const { t } = useTranslation('auth');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl [&>button:last-child]:hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Gradient hero */}
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-slate-900 px-8 pt-10 pb-8 text-white text-center">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/10">
              <ShieldAlert className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('suspended.title')}</h2>
            <p className="text-white/90 text-sm leading-relaxed">
              {t('suspended.description')}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5 bg-card">
          <div className="space-y-2.5">
            {[
              'Verifique pendências de pagamento',
              'Contate o suporte para esclarecimentos',
              'Sua conta e dados permanecem seguros'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <div className="h-5 w-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3 w-3 text-red-500" />
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>

          <div className="pt-1">
            <Button
              className="w-full gap-2 h-11 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white border-0 shadow-lg"
              onClick={() => onOpenChange(false)}
            >
              {t('suspended.understood')}
            </Button>
            <Button
              variant="ghost"
              className="w-full mt-2 text-muted-foreground text-xs gap-2"
              onClick={() => window.open('mailto:suporte@exemplo.com')}
            >
              <Mail className="h-3 w-3" />
              Contatar Suporte
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}