import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, FileText, CheckCircle } from 'lucide-react';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  itemDescription?: string;
  isRequired?: boolean;
  isCompleted: boolean;
  existingReport?: string | null;
  completedAt?: string | null;
  onSave: (report: string) => Promise<void>;
  onUncomplete?: () => Promise<void>;
}

export function ReportModal({
  open,
  onOpenChange,
  itemTitle,
  itemDescription,
  isRequired,
  isCompleted,
  existingReport,
  completedAt,
  onSave,
  onUncomplete,
}: ReportModalProps) {
  const [report, setReport] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUncompleting, setIsUncompleting] = useState(false);

  useEffect(() => {
    if (open) {
      setReport(existingReport || '');
    }
  }, [open, existingReport]);

  const handleSave = async () => {
    if (!report.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(report.trim());
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUncomplete = async () => {
    if (!onUncomplete) return;
    
    setIsUncompleting(true);
    try {
      await onUncomplete();
      onOpenChange(false);
    } finally {
      setIsUncompleting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isCompleted ? 'Relatório da Tarefa' : 'Concluir Tarefa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Task Info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start justify-between">
              <p className="font-medium text-sm">
                {itemTitle}
                {isRequired && <span className="text-destructive ml-1">*</span>}
              </p>
              {isCompleted && (
                <Badge variant="default" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle className="h-3 w-3" />
                  Concluído
                </Badge>
              )}
            </div>
            {itemDescription && (
              <p className="text-xs text-muted-foreground">{itemDescription}</p>
            )}
          </div>

          {/* Report Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isCompleted ? 'Relatório registrado' : 'O que foi realizado?'}
            </label>
            <Textarea
              placeholder="Descreva detalhadamente o que foi feito nesta tarefa..."
              value={report}
              onChange={(e) => setReport(e.target.value)}
              className="min-h-[120px]"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Este relatório ficará registrado no histórico do cliente.
            </p>
          </div>

          {/* Date/Time Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {isCompleted && completedAt 
                ? `Concluído em: ${formatDateTime(completedAt)}` 
                : `Data/Hora: ${formatDateTime(new Date().toISOString())}`
              }
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isCompleted && onUncomplete && (
            <Button
              variant="outline"
              onClick={handleUncomplete}
              disabled={isUncompleting || isSaving}
              className="w-full sm:w-auto"
            >
              {isUncompleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Desmarcar como concluído'
              )}
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={!report.trim() || isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : isCompleted ? (
              'Atualizar Relatório'
            ) : (
              'Concluir e Salvar Relatório'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
