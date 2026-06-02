import { HymnVerse } from '@/types/slide';

export function generateId(): string {
  return crypto.randomUUID();
}

// Parse hymn text: detect verses by patterns like "1.", "第一节", "副歌", empty lines
export function parseHymnText(raw: string): { title: string; verses: HymnVerse[] } {
  const lines = raw.trim().split('\n');
  if (lines.length === 0) return { title: '', verses: [] };

  let title = '';
  const verses: HymnVerse[] = [];
  let currentLabel = '';
  let currentLines: string[] = [];

  const versePattern = /^(第[一二三四五六七八九十]+[节節]|[Vv]erse\s*\d+|[副歌chorus]+|桥段|bridge|\d+[.、．])\s*/i;

  const flushVerse = () => {
    if (currentLines.length > 0) {
      verses.push({
        id: generateId(),
        label: currentLabel || `第${verses.length + 1}段`,
        text: currentLines.join('\n').trim(),
      });
      currentLines = [];
      currentLabel = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // First non-empty line as title if no title yet
    if (!title && line && !versePattern.test(line)) {
      title = line;
      continue;
    }

    // Empty line = verse break
    if (!line) {
      flushVerse();
      continue;
    }

    // Verse header detection
    const match = line.match(versePattern);
    if (match) {
      flushVerse();
      currentLabel = match[1].replace(/[.、．]\s*$/, '');
      const rest = line.slice(match[0].length).trim();
      if (rest) currentLines.push(rest);
      continue;
    }

    currentLines.push(line);
  }

  flushVerse();
  return { title, verses };
}
