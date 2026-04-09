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

  return (
    <div
      className={`w-full aspect-video rounded-lg overflow-hidden flex flex-col items-center justify-center p-8 relative ${
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
        <div className="text-center space-y-4 max-w-lg">
          <span className="text-xs font-bold text-accent tracking-widest uppercase">{slide.verseLabel}</span>
          <p className="font-display text-lg md:text-xl leading-relaxed whitespace-pre-line">{slide.content}</p>
          <p className="text-[10px] text-muted-foreground absolute bottom-3 right-4">{slide.hymnTitle}</p>
        </div>
      )}

      {slide.type === 'sermon-title' && (
        <div className="text-center space-y-3">
          <h2 className="font-display text-2xl md:text-3xl font-bold">{slide.title}</h2>
          <div className="w-16 h-0.5 bg-accent mx-auto" />
        </div>
      )}

      {slide.type === 'sermon-content' && (
        <div className="w-full text-left space-y-2">
          {slide.subtitle && (
            <h3 className="font-display text-lg font-bold text-foreground">{slide.subtitle}</h3>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">{slide.content}</p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
        </div>
      )}

      {slide.type === 'sermon-image' && (
        <div className="flex w-full h-full items-center gap-4">
          <div className="flex-1">
            {slide.title && <h3 className="font-display text-lg font-bold">{slide.title}</h3>}
          </div>
          {slide.imageUrl && (
            <div className="flex-1 h-full flex items-center justify-center">
              <img src={slide.imageUrl} alt="" className="max-h-full max-w-full object-contain rounded" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SlidePreview({ hymns, sermon }: Props) {
  const slides = useMemo(() => generateSlides(hymns, sermon), [hymns, sermon]);
  const [current, setCurrent] = useState(0);

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="w-24 h-14 rounded-lg border-2 border-dashed border-border mx-auto mb-3" />
          <p className="text-sm">添加内容后预览幻灯片</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main slide */}
      <div className="border border-border rounded-xl overflow-hidden shadow-lg">
        <SlideRenderer slide={slides[current]} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline" size="icon"
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
          className="h-8 w-8"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{current + 1} / {slides.length}</span>
        <Button
          variant="outline" size="icon"
          onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))}
          disabled={current === slides.length - 1}
          className="h-8 w-8"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((slide, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`shrink-0 w-24 rounded-md overflow-hidden border-2 transition-colors ${
              i === current ? 'border-accent' : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="scale-[0.15] origin-top-left w-[640px] pointer-events-none">
              <SlideRenderer slide={slide} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
