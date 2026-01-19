import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { 
  Save, 
  Globe, 
  Undo2, 
  Redo2, 
  Loader2,
  Check,
  GlobeLock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  isPublished: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onPublish: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function EditorToolbar({
  isPublished,
  isSaving,
  hasUnsavedChanges,
  canUndo,
  canRedo,
  onSave,
  onPublish,
  onUndo,
  onRedo,
}: EditorToolbarProps) {
  const { t } = useTranslation('clients');

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-8 w-8"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-8 w-8"
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Save Status */}
      <div className="flex items-center gap-2 flex-1">
        {isSaving ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </span>
        ) : hasUnsavedChanges ? (
          <span className="flex items-center gap-2 text-sm text-amber-600">
            <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            Alterações não salvas
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500" />
            Salvo
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Salvar</span>
        </Button>

        <Button
          variant={isPublished ? 'secondary' : 'default'}
          size="sm"
          onClick={onPublish}
          disabled={isSaving}
          className={cn(
            'gap-2',
            isPublished && 'bg-green-600 hover:bg-green-700 text-white'
          )}
        >
          {isPublished ? (
            <>
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Publicado</span>
            </>
          ) : (
            <>
              <GlobeLock className="h-4 w-4" />
              <span className="hidden sm:inline">Publicar</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
