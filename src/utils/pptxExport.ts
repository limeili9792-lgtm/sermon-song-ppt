import PptxGenJS from 'pptxgenjs';
import { Hymn, SlideData, TemplateName } from '@/types/slide';
import { TEMPLATES } from '@/utils/pptxTemplates';

const SLIDE_W = 10.0;
const SLIDE_H = 7.5;

import palmTreeUrl from '@/assets/palm-tree.png';
import churchLogoUrl from '@/assets/church-logo.png';

function removePunctuation(text: string): string {
  return text.replace(/[，。！？、；：""''（）《》【】…—·,.!?;:'"()\[\]{}\-–—]/g, '');
}

function splitLyricsForSlides(text: string, maxLines = 4): string[] {
  const lines = text.split('\n').filter(l => l.trim());
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    chunks.push(lines.slice(i, i + maxLines).join('\n'));
  }
  return chunks.length > 0 ? chunks : [text];
}

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

export function generateSlides(hymns: Hymn[]): SlideData[] {
  const slides: SlideData[] = [];

  for (const hymn of hymns) {
    slides.push({
      type: 'hymn-title',
      hymnTitle: hymn.title,
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

  return slides;
}

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

let palmTreeBase64: string | null = null;
let churchLogoBase64: string | null = null;

async function loadTemplateImages() {
  if (!palmTreeBase64) palmTreeBase64 = await urlToBase64(palmTreeUrl);
  if (!churchLogoBase64) churchLogoBase64 = await urlToBase64(churchLogoUrl);
}

function addTemplateElements(slide: PptxGenJS.Slide, sw: number, sh: number, template: TemplateName, label?: string) {
  const t = TEMPLATES[template];

  switch (template) {
    case 'default':
      slide.background = { color: t.bg };
      if (palmTreeBase64) {
        slide.addImage({ data: palmTreeBase64, x: 0, y: 0, w: 1.1, h: 1.4, sizing: { type: 'contain', w: 1.1, h: 1.4 } });
      }
      if (label) {
        slide.addText(label, { x: 1.17, y: 0.48, w: 1.4, h: 0.5, fontSize: 21, fontFace: t.font, color: t.text, bold: false, align: 'center', valign: 'middle' });
      }
      if (churchLogoBase64) {
        slide.addImage({ data: churchLogoBase64, x: sw - 2.6, y: sh - 1.0, w: 2.4, h: 0.8, sizing: { type: 'contain', w: 2.4, h: 0.8 } });
      }
      break;

    case 'minimal':
      slide.background = { color: t.bg };
      break;

    case 'glass':
      slide.background = { color: t.bg };
      slide.addShape('rect', { x: 0.3, y: 0.3, w: sw - 0.6, h: sh - 0.6, fill: { color: 'FFFFFF', transparency: 50 }, line: { color: t.accent, width: 0.5 }, rectRadius: 0.15 });
      slide.addShape('rect', { x: 0, y: sh - 0.15, w: sw, h: 0.15, fill: { color: t.accent, transparency: 30 } });
      break;

    case 'playful':
      slide.background = { color: t.bg };
      const dots = [{ x: 0.5, y: 0.5 }, { x: sw - 0.8, y: 0.8 }, { x: 1.2, y: sh - 1.0 }, { x: sw - 1.5, y: sh - 0.6 }, { x: sw - 2.5, y: 0.3 }];
      dots.forEach(d => {
        slide.addShape('ellipse', { x: d.x, y: d.y, w: 0.35, h: 0.35, fill: { color: t.accent, transparency: 40 } });
      });
      slide.addShape('rect', { x: 0, y: sh - 0.2, w: sw, h: 0.2, fill: { color: t.accent, transparency: 20 } });
      break;

    case 'natural':
      slide.background = { color: t.bg };
      slide.addShape('rect', { x: 0, y: sh - 0.3, w: sw, h: 0.3, fill: { color: t.accent, transparency: 85 } });
      slide.addShape('rect', { x: 0, y: sh - 0.05, w: sw, h: 0.05, fill: { color: t.accent } });
      if (label) {
        slide.addText(label, { x: 0.4, y: 0.3, w: 1.6, h: 0.45, fontSize: 16, fontFace: t.font, color: t.accent, bold: false, align: 'center', valign: 'middle' });
      }
      break;

    case 'retro-future':
      slide.background = { color: t.bg };
      slide.addShape('rect', { x: 0.15, y: 0.15, w: sw - 0.3, h: sh - 0.3, fill: { type: 'none' }, line: { color: t.accent, width: 1.5 }, rectRadius: 0.05 });
      slide.addShape('rect', { x: 0, y: sh - 0.1, w: sw, h: 0.1, fill: { color: t.accent, transparency: 20 } });
      if (label) {
        slide.addText(label, { x: 0.4, y: 0.3, w: 1.6, h: 0.45, fontSize: 15, fontFace: t.font, color: t.accent, bold: true, align: 'center', valign: 'middle' });
      }
      break;
  }
}

export async function exportToPptx(hymns: Hymn[], template: TemplateName = 'default') {
  await loadTemplateImages();

  const t = TEMPLATES[template];
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_4x3';
  pptx.author = 'SECSlider AI';
  pptx.title = 'Church Presentation';

  for (const hymn of hymns) {
    const titleSlide = pptx.addSlide();
    addTemplateElements(titleSlide, SLIDE_W, SLIDE_H, template, template === 'default' ? '众立同唱' : undefined);

    const titleText = removePunctuation(hymn.title);
    const titleSize = titleText.length > 12 ? 48 : 60;

    titleSlide.addText(titleText, {
      x: 0, y: 2.0, w: SLIDE_W, h: 1.2,
      fontSize: titleSize,
      fontFace: t.font,
      color: t.text,
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
        addTemplateElements(vSlide, SLIDE_W, SLIDE_H, template, template === 'default' ? '众立同唱' : undefined);

        vSlide.addText(chunk, {
          x: 0, y: 1.14, w: SLIDE_W, h: 5.5,
          fontSize: lyricSize,
          fontFace: t.font,
          color: t.text,
          align: 'center',
          valign: 'top',
          bold: true,
          lineSpacingMultiple: 1.2,
        });
      }
    }
  }

  await pptx.writeFile({ fileName: 'SECSlider_Presentation.pptx' });
}
