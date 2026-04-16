import PptxGenJS from 'pptxgenjs';
import { Hymn, SermonData, SlideData, SermonImage } from '@/types/slide';

export type AspectRatio = '16:9' | '4:3';

// Layout dimensions by aspect ratio
const LAYOUTS: Record<AspectRatio, { layout: string; w: number; h: number }> = {
  '16:9': { layout: 'LAYOUT_WIDE', w: 13.33, h: 7.5 },
  '4:3':  { layout: 'LAYOUT_STANDARD', w: 10.0, h: 7.5 },
};

// Template colors from the church PPT template
const COLORS = {
  navy: '002147',
  white: 'FFFFFF',
  darkText: '002147',
  lightText: 'FFFFFF',
  muted: '8A8A8A',
};

const FONT = 'SimHei';

// Import template images as ES modules (Vite will handle base64 encoding)
import palmTreeUrl from '@/assets/palm-tree.png';
import churchLogoUrl from '@/assets/church-logo.png';

function removePunctuation(text: string): string {
  return text.replace(/[，。！？、；：""''（）《》【】…—·,.!?;:'"()\[\]{}\-–—]/g, '');
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

// Calculate uniform font size for all lyrics slides of a hymn
function calcHymnLyricFontSize(hymn: Hymn): number {
  const verseOrder = hymn.repeatStructure && hymn.repeatStructure.length > 0
    ? hymn.repeatStructure
    : hymn.verses.map((_, i) => i);
  
  let maxLineLen = 0;
  for (const idx of verseOrder) {
    const verse = hymn.verses[idx];
    if (!verse) continue;
    const cleanText = removePunctuation(verse.text);
    const lines = cleanText.split('\n').filter(l => l.trim());
    for (const line of lines) {
      if (line.length > maxLineLen) maxLineLen = line.length;
    }
  }
  
  if (maxLineLen > 16) return 40;
  return 48;
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
          content: chunk,
        });
      }
    }
  }

  // Sermon slides
  let currentTitle = '';
  let currentSubtitle = '';
  let currentSubtitleImage: { image: SermonImage; imageUrl: string } | null = null;
  let contentBuffer: string[] = [];

  const flushContent = () => {
    if (contentBuffer.length > 0 || currentSubtitleImage) {
      const slide: SlideData = {
        type: 'sermon-content',
        title: currentTitle,
        subtitle: currentSubtitle,
        content: contentBuffer.join('\n'),
      };
      if (currentSubtitleImage) {
        slide.image = currentSubtitleImage.image;
        slide.imageUrl = currentSubtitleImage.imageUrl;
        currentSubtitleImage = null;
      }
      slides.push(slide);
      contentBuffer = [];
    }
  };

  for (const section of sermon.sections) {
    if (section.level === 'title') {
      flushContent();
      currentTitle = section.text;
      currentSubtitle = '';
      const titleSlide: SlideData = { type: 'sermon-title', title: section.text };
      if (section.image) {
        titleSlide.image = section.image;
        titleSlide.imageUrl = section.image.url;
      }
      slides.push(titleSlide);
    } else if (section.level === 'subtitle') {
      flushContent();
      currentSubtitle = section.text;
      if (section.image) {
        currentSubtitleImage = { image: section.image, imageUrl: section.image.url };
      }
    } else {
      contentBuffer.push(section.text);
      if (section.image) {
        currentSubtitleImage = { image: section.image, imageUrl: section.image.url };
      }
      if (contentBuffer.length >= 4) flushContent();
    }
  }
  flushContent();

  return slides;
}

// Helper to convert image URL to base64 for embedding in PPTX
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Pre-load template images as base64
let palmTreeBase64: string | null = null;
let churchLogoBase64: string | null = null;

async function loadTemplateImages() {
  if (!palmTreeBase64) {
    palmTreeBase64 = await urlToBase64(palmTreeUrl);
  }
  if (!churchLogoBase64) {
    churchLogoBase64 = await urlToBase64(churchLogoUrl);
  }
}

// Add template elements with dynamic dimensions
function addTemplateElements(slide: PptxGenJS.Slide, sw: number, sh: number, label?: string) {
  slide.background = { color: COLORS.white };

  if (palmTreeBase64) {
    slide.addImage({
      data: palmTreeBase64,
      x: 0, y: 0, w: 1.1, h: 1.4,
      sizing: { type: 'contain', w: 1.1, h: 1.4 },
    });
  }

  if (label) {
    slide.addText(label, {
      x: 1.17, y: 0.48, w: 1.4, h: 0.5,
      fontSize: 21, fontFace: FONT,
      color: COLORS.navy, bold: false,
      align: 'center', valign: 'middle',
    });
  }

  if (churchLogoBase64) {
    slide.addImage({
      data: churchLogoBase64,
      x: sw - 2.6, y: sh - 1.0, w: 2.4, h: 0.8,
      sizing: { type: 'contain', w: 2.4, h: 0.8 },
    });
  }
}

export async function exportToPptx(hymns: Hymn[], sermon: SermonData, aspectRatio: AspectRatio = '16:9') {
  await loadTemplateImages();

  const dim = LAYOUTS[aspectRatio];
  const SW = dim.w;
  const SH = dim.h;

  const pptx = new PptxGenJS();
  pptx.layout = dim.layout as any;
  pptx.author = 'SECSlider AI';
  pptx.title = 'Church Presentation';

  // Hymn slides
  for (const hymn of hymns) {
    const titleSlide = pptx.addSlide();
    addTemplateElements(titleSlide, SW, SH, '众立同唱');

    const titleText = removePunctuation(hymn.title);
    const titleLen = titleText.length;
    const titleSize = titleLen > 12 ? 48 : 60;

    titleSlide.addText(titleText, {
      x: 0, y: 2.0, w: SW, h: 1.2,
      fontSize: titleSize,
      fontFace: FONT,
      color: COLORS.navy,
      align: 'center',
      bold: true,
    });

    const lyricSize = calcHymnLyricFontSize(hymn);

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
        addTemplateElements(vSlide, SW, SH, '众立同唱');

        vSlide.addText(chunk, {
          x: 0, y: 0.9, w: SW, h: 5.5,
          fontSize: lyricSize,
          fontFace: FONT,
          color: COLORS.navy,
          align: 'center',
          valign: 'top',
          bold: true,
          lineSpacingMultiple: 1.6,
        });
      }
    }
  }

  // Sermon slides
  let sermonSubtitle = '';
  let contentBuf: string[] = [];
  let currentImage: { file: File; url: string } | null = null;

  // Image area scales with slide width
  const imgW = SW * 0.36;
  const imgX = SW - imgW - 0.5;

  const flushSermonSlide = async (image?: { file: File; url: string }) => {
    if (contentBuf.length === 0 && !image) return;
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.white };

    const hasImage = !!image;
    const contentW = hasImage ? (imgX - 1.5) : (SW - 2.0);
    const contentX = 1.0;

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

    if (hasImage && image) {
      const base64 = await fileToBase64(image.file);
      slide.addImage({
        data: base64,
        x: imgX, y: 0.5, w: imgW, h: 6.5,
        sizing: { type: 'contain', w: imgW, h: 6.5 },
      });
    }

    slide.addShape('rect', {
      x: 0, y: SH - 0.3, w: SW, h: 0.05,
      fill: { color: COLORS.navy },
    });

    contentBuf = [];
    currentImage = null;
  };

  for (const section of sermon.sections) {
    if (section.level === 'title') {
      await flushSermonSlide();
      sermonSubtitle = '';

      const slide = pptx.addSlide();
      slide.background = { color: COLORS.white };

      slide.addText(section.text, {
        x: 1.5, y: 1.8, w: SW - 3, h: 1.2,
        fontSize: 60, fontFace: FONT,
        color: COLORS.navy,
        align: 'center', bold: true,
      });

      if (section.image) {
        const base64 = await fileToBase64(section.image.file);
        const tImgW = SW * 0.34;
        slide.addImage({
          data: base64,
          x: SW - tImgW - 0.5, y: 3.5, w: tImgW, h: 3.5,
          sizing: { type: 'contain', w: tImgW, h: 3.5 },
        });
      }
    } else if (section.level === 'subtitle') {
      await flushSermonSlide();
      sermonSubtitle = section.text;
      if (section.image) {
        currentImage = section.image;
      }
    } else {
      contentBuf.push(section.text);
      if (section.image) {
        currentImage = section.image;
      }
      if (contentBuf.length >= 4) await flushSermonSlide(currentImage || undefined);
    }
  }
  await flushSermonSlide(currentImage || undefined);

  await pptx.writeFile({ fileName: 'SECSlider_Presentation.pptx' });
}
