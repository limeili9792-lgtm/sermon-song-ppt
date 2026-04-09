import PptxGenJS from 'pptxgenjs';
import { Hymn, SermonData, SlideData } from '@/types/slide';

const COLORS = {
  navy: '1C2B3A',
  gold: 'C88B2B',
  cream: 'F7F4EF',
  darkText: '1C2B3A',
  lightText: 'F7F4EF',
  muted: '8A8A8A',
};

const FONT = 'SimHei';

function removePunctuation(text: string): string {
  return text.replace(/[，。！？、；：""''（）《》【】…—·,.!?;:'"()\[\]{}\-–—]/g, '');
}

function addBackground(slide: PptxGenJS.Slide, dark = false) {
  slide.background = { color: dark ? COLORS.navy : COLORS.cream };
}

function addGoldLine(slide: PptxGenJS.Slide, y: number) {
  slide.addShape('rect', {
    x: 3.5, y, w: 3, h: 0.03,
    fill: { color: COLORS.gold },
  });
}

// Split long text into slide-sized chunks (max ~4 lines per slide for lyrics)
function splitLyricsForSlides(text: string, maxLines = 4): string[] {
  const lines = text.split('\n').filter(l => l.trim());
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines).join('\n'));
  }
  return chunks.length > 0 ? chunks : [text];
}

export function generateSlides(hymns: Hymn[], sermon: SermonData): SlideData[] {
  const slides: SlideData[] = [];

  // Hymn slides
  for (const hymn of hymns) {
    slides.push({
      type: 'hymn-title',
      hymnTitle: hymn.title,
      subtitle: hymn.author,
    });

    // Use repeat structure if available, otherwise just play verses in order
    const verseOrder = hymn.repeatStructure && hymn.repeatStructure.length > 0
      ? hymn.repeatStructure
      : hymn.verses.map((_, i) => i);

    for (const idx of verseOrder) {
      const verse = hymn.verses[idx];
      if (!verse) continue;
      
      const textChunks = splitLyricsForSlides(removePunctuation(verse.text));
      for (const chunk of textChunks) {
        slides.push({
          type: 'hymn-verse',
          hymnTitle: hymn.title,
          verseLabel: verse.label,
          content: chunk,
        });
      }
    }
  }

  // Sermon slides
  let currentTitle = '';
  let currentSubtitle = '';
  let contentBuffer: string[] = [];

  const flushContent = () => {
    if (contentBuffer.length > 0) {
      // Find if there's an image attached to these sections
      const slide: SlideData = {
        type: 'sermon-content',
        title: currentTitle,
        subtitle: currentSubtitle,
        content: contentBuffer.join('\n'),
      };
      slides.push(slide);
      contentBuffer = [];
    }
  };

  for (const section of sermon.sections) {
    if (section.level === 'title') {
      flushContent();
      currentTitle = section.text;
      currentSubtitle = '';
      slides.push({ type: 'sermon-title', title: section.text });
    } else if (section.level === 'subtitle') {
      flushContent();
      currentSubtitle = section.text;
    } else {
      contentBuffer.push(section.text);
      if (contentBuffer.length >= 4) flushContent();
    }
    // Attach image to current slide if section has one
    if (section.image) {
      flushContent();
      slides.push({
        type: 'sermon-content',
        title: currentTitle,
        subtitle: currentSubtitle,
        content: '',
        image: section.image,
        imageUrl: section.image.url,
      });
    }
  }
  flushContent();

  return slides;
}

export async function exportToPptx(hymns: Hymn[], sermon: SermonData) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'SECSlider AI';
  pptx.title = 'Church Presentation';

  // Hymn title slides
  for (const hymn of hymns) {
    const slide = pptx.addSlide();
    addBackground(slide, true);
    addGoldLine(slide, 3.2);

    // Title: 60pt bold centered, shrink if too long
    const titleLen = hymn.title.length;
    const titleSize = titleLen > 12 ? 48 : 60;

    slide.addText(removePunctuation(hymn.title), {
      x: 1, y: 1.5, w: 8, h: 1.5,
      fontSize: titleSize,
      fontFace: FONT,
      color: COLORS.lightText,
      align: 'center',
      bold: true,
    });

    if (hymn.author) {
      slide.addText(hymn.author, {
        x: 1, y: 3.5, w: 8, h: 0.6,
        fontSize: 18, fontFace: FONT,
        color: COLORS.gold, align: 'center',
        italic: true,
      });
    }

    // Use repeat structure
    const verseOrder = hymn.repeatStructure && hymn.repeatStructure.length > 0
      ? hymn.repeatStructure
      : hymn.verses.map((_, i) => i);

    for (const idx of verseOrder) {
      const verse = hymn.verses[idx];
      if (!verse) continue;

      const cleanText = removePunctuation(verse.text);
      const textChunks = splitLyricsForSlides(cleanText);

      for (const chunk of textChunks) {
        const vSlide = pptx.addSlide();
        addBackground(vSlide, true);

        vSlide.addText(verse.label, {
          x: 0.5, y: 0.3, w: 2, h: 0.5,
          fontSize: 14, fontFace: FONT,
          color: COLORS.gold, bold: true,
        });

        // Lyrics: 44pt, shrink if line is too long
        const maxLineLen = Math.max(...chunk.split('\n').map(l => l.length));
        const lyricSize = maxLineLen > 16 ? 36 : 44;

        vSlide.addText(chunk, {
          x: 0.5, y: 0.8, w: 9, h: 5.5,
          fontSize: lyricSize,
          fontFace: FONT,
          color: COLORS.lightText,
          align: 'center',
          valign: 'top',
          lineSpacingMultiple: 1.6,
        });

        vSlide.addText(removePunctuation(hymn.title), {
          x: 0.5, y: 6.8, w: 9, h: 0.4,
          fontSize: 11, fontFace: FONT,
          color: COLORS.muted, align: 'right',
        });
      }
    }
  }

  // Sermon slides
  let sermonTitle = '';
  let sermonSubtitle = '';
  let contentBuf: string[] = [];

  const flushSermonSlide = (image?: { file: File; url: string }) => {
    if (contentBuf.length === 0 && !image) return;
    const slide = pptx.addSlide();
    addBackground(slide, false);

    const hasImage = !!image;
    const contentW = hasImage ? 4.5 : 8.4;
    const contentX = 0.8;

    if (sermonSubtitle) {
      slide.addText(sermonSubtitle, {
        x: contentX, y: 0.4, w: contentW, h: 0.8,
        fontSize: 28, fontFace: FONT,
        color: COLORS.navy, bold: true,
      });
    }

    if (contentBuf.length > 0) {
      slide.addText(contentBuf.join('\n\n'), {
        x: contentX,
        y: sermonSubtitle ? 1.4 : 0.6,
        w: contentW,
        h: 5.5,
        fontSize: 20, fontFace: FONT,
        color: COLORS.darkText,
        lineSpacingMultiple: 1.5,
        valign: 'top',
      });
    }

    // Bottom bar
    slide.addShape('rect', {
      x: 0, y: 7.2, w: 10, h: 0.05,
      fill: { color: COLORS.gold },
    });

    contentBuf = [];
    return slide;
  };

  const pendingImageSlides: { file: File; contentBuf: string[]; subtitle: string }[] = [];

  for (const section of sermon.sections) {
    if (section.level === 'title') {
      flushSermonSlide();
      sermonTitle = section.text;
      sermonSubtitle = '';

      const slide = pptx.addSlide();
      addBackground(slide, true);
      addGoldLine(slide, 3.2);

      slide.addText(section.text, {
        x: 1, y: 1.8, w: 8, h: 1.2,
        fontSize: 60, fontFace: FONT,
        color: COLORS.lightText,
        align: 'center', bold: true,
      });
    } else if (section.level === 'subtitle') {
      flushSermonSlide();
      sermonSubtitle = section.text;
    } else {
      contentBuf.push(section.text);
      if (contentBuf.length >= 4) flushSermonSlide();
    }

    // Handle attached image
    if (section.image) {
      const slide = flushSermonSlide() || pptx.addSlide();
      // If flushSermonSlide returned nothing, we need a fresh slide with content
      if (!slide.background) addBackground(slide, false);
      
      const base64 = await fileToBase64(section.image.file);
      slide.addImage({
        data: base64,
        x: 5.5, y: 0.5, w: 4.2, h: 6.5,
        sizing: { type: 'contain', w: 4.2, h: 6.5 },
      });
    }
  }
  flushSermonSlide();

  await pptx.writeFile({ fileName: 'SECSlider_Presentation.pptx' });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
