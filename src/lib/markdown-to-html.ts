// Convert markdown to clean HTML for web display
export function markdownToHtml(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // Remove horizontal rules (--- or ___ or ***)
  html = html.replace(/^[-_*]{3,}$/gm, '');
  
  // Remove all header symbols (# ## ### etc.) and convert to bold
  html = html.replace(/^#{1,6}\s+(.+)$/gm, '<strong class="block text-base mt-3 mb-1">$1</strong>');
  
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not part of bold markers)
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');
  
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Unordered lists: - item or * item
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li class="ml-4 mb-1">$1</li>');
  
  // Ordered lists: 1. item, 2. item etc
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 mb-1 list-decimal">$1</li>');
  
  // Wrap consecutive list items in ul/ol tags
  html = html.replace(/(<li class="ml-4 mb-1">[\s\S]*?<\/li>)+/g, '<ul class="list-disc pl-4 my-2">$&</ul>');
  html = html.replace(/(<li class="ml-4 mb-1 list-decimal">[\s\S]*?<\/li>)+/g, '<ol class="list-decimal pl-4 my-2">$&</ol>');
  
  // Clean up any remaining asterisks that aren't part of formatting
  html = html.replace(/\*{1,2}([^*]+)\*{1,2}/g, '<strong>$1</strong>');
  
  // Convert double newlines to paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p class="mt-2">');
  
  // Convert single newlines to line breaks
  html = html.replace(/\n/g, '<br/>');
  
  // Wrap in paragraph
  html = `<p>${html}</p>`;
  
  // Clean up empty paragraphs and extra whitespace
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<br\/>\s*<br\/>/g, '</p><p class="mt-2">');
  
  return html;
}
