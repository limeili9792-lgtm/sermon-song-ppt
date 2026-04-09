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
  const isHymn = slide.type === 'hymn-title' || slide.type === 'hymn-verse';
  const isSermonTitle = slide.type === 'sermon-title';
  const hasImage = !!(slide.image || slide.imageUrl) && slide.type === 'sermon-content';

  // Template style: white bg, navy text for all slides
  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden relative bg-white border border-border">
      {/* Hymn slides: template style */}
      {isHymn && (
        <div className="w-full h-full flex flex-col items-center justify-start p-4 pt-2">
          {/* Palm tree placeholder + label */}
          <div className="self-start flex items-center gap-1 mb-2">
            <span className="text-[8px] text-[#002147] font-bold">🌿 众立同唱</span>
          </div>
          {slide.type === 'hymn-title' ? (
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-2xl md:text-3xl font-bold text-[#002147] text-center" style={{ fontFamily: 'SimHei, sans-serif' }}>
                {slide.hymnTitle}
              </h2>
            </div>
          ) : (
            <div className="flex-1 flex items-start justify-center w-full pt-4">
              <p className="text-sm md:text-base font-bold text-[#002147] text-center whitespace-pre-line leading-relaxed" style={{ fontFamily: 'SimHei, sans-serif' }}>
                {slide.content}
              </p>
            </div>
          )}
        </div>
      )}

      {isSermonTitle && (
        <div className="w-full h-full flex items-center justify-center p-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#002147] text-center" style={{ fontFamily: 'SimHei, sans-serif' }}>
            {slide.title}
          </h2>
          {hasImage && slide.imageUrl && (
            <img src={slide.imageUrl} alt="" className="absolute right-4 bottom-4 max-h-[40%] max-w-[35%] object-contain rounded" />
          )}
        </div>
      )}

      {slide.type === 'sermon-content' && (
        <div className={`w-full h-full text-left flex ${hasImage ? 'gap-3' : 'flex-col'} p-4`}>
          <div className={`flex flex-col gap-1 ${hasImage ? 'flex-1' : 'w-full'}`}>
            {slide.subtitle && (
              <h3 className="text-sm font-bold text-[#002147]" style={{ fontFamily: 'SimHei, sans-serif' }}>{slide.subtitle}</h3>
            )}
            <p className="text-xs leading-relaxed whitespace-pre-line text-[#002147]/80">{slide.content}</p>
          </div>
          {hasImage && (
            <div className="w-2/5 h-full flex items-center justify-center">
              <img src={slide.imageUrl || slide.image?.url} alt="" className="max-h-full max-w-full object-contain rounded" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#002147]" />
        </div>
      )}
    </div>
  );
}

export default function SlidePreview({ hymns, sermon }: Props) {
  const slides = useMemo(() => generateSlides(hymns, sermon), [hymns, sermon]);
  const [current, setCurrent] = useState(0);

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
      <div className="border border-border rounded-xl overflow-hidden shadow-lg">
        <SlideRenderer slide={slides[safeIdx]} />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrent(Math.max(0, safeIdx - 1))} disabled={safeIdx === 0} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{safeIdx + 1} / {slides.length}</span>
        <Button variant="outline" size="icon" onClick={() => setCurrent(Math.min(slides.length - 1, safeIdx + 1))} disabled={safeIdx === slides.length - 1} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-1.5 max-h-[300px] overflow-y-auto">
        {slides.map((slide, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`aspect-video rounded-md overflow-hidden border-2 transition-colors ${
              i === safeIdx ? 'border-accent' : 'border-border hover:border-accent/50'
            }`}
          >
            <div className={`w-full h-full flex items-center justify-center p-1 text-[4px] leading-tight bg-white text-[#002147]`}>
              <span className="truncate text-center">
                {slide.hymnTitle || slide.title || slide.content?.slice(0, 20) || `${i + 1}`}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
