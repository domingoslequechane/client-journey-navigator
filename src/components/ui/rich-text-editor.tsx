import * as React from "react";
import { Bold, Italic, List, Link as LinkIcon, Type } from "lucide-react";
import { Button } from "./button";
import { AutoResizeTextarea } from "./auto-resize-textarea";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newValue = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    onChange(newValue);

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-t-md border border-b-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyFormat("**")}
          title="Negrito"
          type="button"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyFormat("*")}
          title="Itálico"
          type="button"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyFormat("\n- ")}
          title="Lista"
          type="button"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => applyFormat("[", "](url)")}
          title="Link"
          type="button"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <AutoResizeTextarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-t-none min-h-[80px]"
      />
      <div className="text-[10px] text-muted-foreground px-1">
        Suporta Markdown (Negrito, Itálico, Listas)
      </div>
    </div>
  );
}
