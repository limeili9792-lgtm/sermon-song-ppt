import { HymnVerse, SermonSection } from '@/types/slide';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
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

// Parse sermon text: detect hierarchy by indentation, numbering, markers
export function parseSermonText(raw: string): SermonSection[] {
  const lines = raw.trim().split('\n');
  const sections: SermonSection[] = [];

  const titlePattern = /^(#+\s|【|《|标题[:：]|题目[:：])/i;
  const subtitlePattern = /^([一二三四五六七八九十]+[、.．]|\d+[、.．]|[（(]\d+[)）]|[A-Z][、.．])/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let level: 'title' | 'subtitle' | 'content' = 'content';

    if (titlePattern.test(line)) {
      level = 'title';
    } else if (subtitlePattern.test(line)) {
      level = 'subtitle';
    }

    sections.push({
      id: generateId(),
      level,
      text: line.replace(/^#+\s*/, ''),
    });
  }

  // If first section is content, promote to title
  if (sections.length > 0 && sections[0].level === 'content') {
    sections[0].level = 'title';
  }

  return sections;
}
