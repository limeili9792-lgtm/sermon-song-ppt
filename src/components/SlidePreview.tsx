import { Hymn, SermonData, SlideData } from '@/types/slide';
import { generateSlides } from '@/utils/pptxExport';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  hymns: Hymn[];
  sermon: SermonData;
}

function SlideRenderer({ slide }: { slide: SlideData }) {
  const isDark = slide.type === 'hymn-title' || slide.type === 'hymn-verse' || slide.type === 'sermon-title';
  const hasImage = !!(slide.image || slide.imageUrl) && slide.type === 'sermon-content';

  return (
    <div
      className={`w-full aspect-video rounded-lg overflow-hidden flex flex-col items-center justify-center p-6 relative ${
        isDark ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'
      }`}
    >
      {slide.type === 'hymn-title' && (
        <div className="text-center space-y-3">
          <h2 className="font-display text-2xl md:text-3xl font-bold">{slide.hymnTitle}</h2>
          <div className="w-16 h-0.5 bg-accent mx-auto" />
          {slide.subtitle && <p className="text-accent text-sm italic">{slide.subtitle}</p>}
        </div>
      )}

      {slide.type === 'hymn-verse' && (
        <div className="text-center space-y-3 max-w-lg w-full h-full flex flex-col items-center pt-2">
          <span className="text-xs font-bold text-accent tracking-widest uppercase">{slide.verseLabel}</span>
          <p className="font-display text-base md:text-lg leading-relaxed whitespace-pre-line flex-1">{slide.content}</p>
          <p className="text-[10px] text-muted-foreground self-end">{slide.hymnTitle}</p>
        </div>
      )}

      {slide.type === 'sermon-title' && (
        <div className="text-center space-y-3">
          <h2 className="font-display text-2xl md:text-3xl font-bold">{slide.title}</h2>
          <div className="w-16 h-0.5 bg-accent mx-auto" />
        </div>
      )}

      {slide.type === 'sermon-content' && (
        <div className={`w-full text-left h-full flex ${hasImage ? 'gap-3' : 'flex-col'}`}>
          <div className={`flex flex-col gap-1 ${hasImage ? 'flex-1' : 'w-full'}`}>
            {slide.subtitle && (
              <h3 className="font-display text-sm font-bold text-foreground">{slide.subtitle}</h3>
            )}
            <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/80">{slide.content}</p>
          </div>
          {hasImage && (
            <div className="w-2/5 h-full flex items-center justify-center">
              <img src={slide.imageUrl || slide.image?.url} alt="" className="max-h-full max-w-full object-contain rounded" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        </div>
      )}
    </div>
  );
}

export default function SlidePreview({ hymns, sermon }: Props) {
  const slides = useMemo(() => generateSlides(hymns, sermon), [hymns, sermon]);
  const [current, setCurrent] = useState(0);

  // Reset current if out of bounds
  const safeIdx = Math.min(current, Math.max(0, slides.length - 1));
  if (safeIdx !== current) setCurrent(safeIdx);

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="text-center">
          <div className="w-24 h-14 rounded-lg border-2 border-dashed border-border mx-auto mb-3" />
          <p className="text-sm">添加内容后预览幻灯片</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main slide */}
      <div className="border border-border rounded-xl overflow-hidden shadow-lg">
        <SlideRenderer slide={slides[safeIdx]} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline" size="icon"
          onClick={() => setCurrent(Math.max(0, safeIdx - 1))}
          disabled={safeIdx === 0}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{safeIdx + 1} / {slides.length}</span>
        <Button
          variant="outline" size="icon"
          onClick={() => setCurrent(Math.min(slides.length - 1, safeIdx + 1))}
          disabled={safeIdx === slides.length - 1}
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Thumbnails - fixed height grid */}
      <div className="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto">
        {slides.map((slide, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`aspect-video rounded-md overflow-hidden border-2 transition-colors ${
              i === safeIdx ? 'border-accent' : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="w-full h-full">
              <div className={`w-full h-full flex items-center justify-center p-1 text-[4px] leading-tight ${
                slide.type === 'hymn-title' || slide.type === 'hymn-verse' || slide.type === 'sermon-title'
                  ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'
              }`}>
                <span className="truncate text-center">
                  {slide.hymnTitle || slide.title || slide.content?.slice(0, 20) || `${i + 1}`}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
