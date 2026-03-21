import React from 'react';

/**
 * Parses WhatsApp-style formatting into React elements.
 * Supports: *bold*, _italic_, ~strikethrough~, ```monospace```
 */
export function formatWhatsAppText(text: string): React.ReactNode[] {
  if (!text) return [];

  // Split by newlines first, process each line
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      result.push(<br key={`br-${lineIdx}`} />);
    }
    const parsed = parseLine(line, lineIdx);
    result.push(...parsed);
  });

  return result;
}

function parseLine(text: string, lineIdx: number): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  // Regex that matches WhatsApp formatting patterns
  // *bold* | _italic_ | ~strikethrough~ | ```monospace```
  const regex = /(\*([^*\n]+)\*)|(_([^_\n]+)_)|(~([^~\n]+)~)|(```([^`\n]+)```)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const key = `${lineIdx}-${match.index}`;

    if (match[1]) {
      // *bold*
      result.push(
        <strong key={key} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // _italic_
      result.push(
        <em key={key} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // ~strikethrough~
      result.push(
        <s key={key}>
          {match[6]}
        </s>
      );
    } else if (match[7]) {
      // ```monospace```
      result.push(
        <code
          key={key}
          className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[12px] font-mono"
        >
          {match[8]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}
