// Simple markdown to HTML converter for chat messages
export function markdownToHtml(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // Headers: # ## ### to headings
  html = html.replace(/^### (.+)$/gm, '<strong class="text-base block mt-3 mb-1">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong class="text-lg block mt-4 mb-2">$1</strong>');
  html = html.replace(/^# (.+)$/gm, '<strong class="text-xl block mt-4 mb-2">$1</strong>');
  
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Lists: - item or * item or 1. item
  html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-4">• $1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mt-2">');
  html = html.replace(/\n/g, '<br/>');
  
  // Wrap in paragraph
  html = `<p>${html}</p>`;
  
  return html;
}
