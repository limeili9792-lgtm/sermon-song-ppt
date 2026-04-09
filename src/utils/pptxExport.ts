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

function addBackground(slide: PptxGenJS.Slide, dark = false) {
  slide.background = { color: dark ? COLORS.navy : COLORS.cream };
}

function addGoldLine(slide: PptxGenJS.Slide, y: number) {
  slide.addShape('rect', {
    x: 3.5,
    y,
    w: 3,
    h: 0.03,
    fill: { color: COLORS.gold },
  });
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
    for (const verse of hymn.verses) {
      slides.push({
        type: 'hymn-verse',
        hymnTitle: hymn.title,
        verseLabel: verse.label,
        content: verse.text,
      });
    }
  }

  // Sermon slides
  let currentTitle = '';
  let currentSubtitle = '';
  let contentBuffer: string[] = [];

  const flushContent = () => {
    if (contentBuffer.length > 0) {
      slides.push({
        type: 'sermon-content',
        title: currentTitle,
        subtitle: currentSubtitle,
        content: contentBuffer.join('\n'),
      });
      contentBuffer = [];
    }
  };

  for (const section of sermon.sections) {
    if (section.level === 'title') {
      flushContent();
      currentTitle = section.text;
      currentSubtitle = '';
      slides.push({
        type: 'sermon-title',
        title: section.text,
      });
    } else if (section.level === 'subtitle') {
      flushContent();
      currentSubtitle = section.text;
    } else {
      contentBuffer.push(section.text);
      // Flush every ~4 lines to avoid overcrowding
      if (contentBuffer.length >= 4) {
        flushContent();
      }
    }
  }
  flushContent();

  // Image slides
  for (const img of sermon.images) {
    slides.push({
      type: 'sermon-image',
      imageUrl: img.url,
      title: currentTitle,
    });
  }

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

    slide.addText(hymn.title, {
      x: 1,
      y: 1.5,
      w: 8,
      h: 1.5,
      fontSize: 44,
      fontFace: 'Georgia',
      color: COLORS.lightText,
      align: 'center',
      bold: true,
    });

    if (hymn.author) {
      slide.addText(hymn.author, {
        x: 1,
        y: 3.5,
        w: 8,
        h: 0.6,
        fontSize: 18,
        fontFace: 'Georgia',
        color: COLORS.gold,
        align: 'center',
        italic: true,
      });
    }

    // Verse slides
    for (const verse of hymn.verses) {
      const vSlide = pptx.addSlide();
      addBackground(vSlide, true);

      vSlide.addText(verse.label, {
        x: 0.5,
        y: 0.3,
        w: 2,
        h: 0.5,
        fontSize: 14,
        fontFace: 'Arial',
        color: COLORS.gold,
        bold: true,
      });

      vSlide.addText(verse.text, {
        x: 1,
        y: 1.2,
        w: 8,
        h: 4,
        fontSize: 32,
        fontFace: 'Georgia',
        color: COLORS.lightText,
        align: 'center',
        lineSpacingMultiple: 1.6,
      });

      vSlide.addText(hymn.title, {
        x: 0.5,
        y: 6.8,
        w: 9,
        h: 0.4,
        fontSize: 11,
        fontFace: 'Arial',
        color: COLORS.muted,
        align: 'right',
      });
    }
  }

  // Sermon slides
  let sermonTitle = '';
  let sermonSubtitle = '';
  let contentBuf: string[] = [];

  const flushSermonSlide = () => {
    if (contentBuf.length === 0) return;
    const slide = pptx.addSlide();
    addBackground(slide, false);

    if (sermonSubtitle) {
      slide.addText(sermonSubtitle, {
        x: 0.8,
        y: 0.4,
        w: 8.4,
        h: 0.6,
        fontSize: 22,
        fontFace: 'Georgia',
        color: COLORS.navy,
        bold: true,
      });
    }

    slide.addText(contentBuf.join('\n\n'), {
      x: 0.8,
      y: sermonSubtitle ? 1.2 : 0.6,
      w: 8.4,
      h: 5.5,
      fontSize: 20,
      fontFace: 'Arial',
      color: COLORS.darkText,
      lineSpacingMultiple: 1.5,
      valign: 'top',
    });

    // Bottom bar
    slide.addShape('rect', {
      x: 0,
      y: 7.2,
      w: 10,
      h: 0.05,
      fill: { color: COLORS.gold },
    });

    contentBuf = [];
  };

  for (const section of sermon.sections) {
    if (section.level === 'title') {
      flushSermonSlide();
      sermonTitle = section.text;
      sermonSubtitle = '';

      const slide = pptx.addSlide();
      addBackground(slide, true);
      addGoldLine(slide, 3.2);

      slide.addText(section.text, {
        x: 1,
        y: 1.8,
        w: 8,
        h: 1.2,
        fontSize: 40,
        fontFace: 'Georgia',
        color: COLORS.lightText,
        align: 'center',
        bold: true,
      });
    } else if (section.level === 'subtitle') {
      flushSermonSlide();
      sermonSubtitle = section.text;
    } else {
      contentBuf.push(section.text);
      if (contentBuf.length >= 4) flushSermonSlide();
    }
  }
  flushSermonSlide();

  // Image slides with text on left, image on right
  for (const img of sermon.images) {
    const slide = pptx.addSlide();
    addBackground(slide, false);

    // Convert image to base64
    const base64 = await fileToBase64(img.file);
    slide.addImage({
      data: base64,
      x: 5.2,
      y: 0.5,
      w: 4.5,
      h: 6.5,
      sizing: { type: 'contain', w: 4.5, h: 6.5 },
    });

    if (sermonTitle) {
      slide.addText(sermonTitle, {
        x: 0.5,
        y: 2.5,
        w: 4.5,
        h: 1,
        fontSize: 24,
        fontFace: 'Georgia',
        color: COLORS.navy,
        bold: true,
      });
    }
  }

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
