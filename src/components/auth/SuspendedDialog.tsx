import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface SuspendedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuspendedDialog({ open, onOpenChange }: SuspendedDialogProps) {
  const { t } = useTranslation('auth');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <DialogTitle>{t('suspended.title')}</DialogTitle>
          <DialogDescription>
            {t('suspended.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            {t('suspended.understood')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}