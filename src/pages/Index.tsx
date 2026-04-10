import { useState } from 'react';
import { Hymn, SermonData } from '@/types/slide';
import { exportToPptx, AspectRatio } from '@/utils/pptxExport';
import HymnEditor from '@/components/HymnEditor';
import SermonEditor from '@/components/SermonEditor';
import SlidePreview from '@/components/SlidePreview';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Music, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Index() {
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [sermon, setSermon] = useState<SermonData>({ sections: [], images: [] });
  const [exporting, setExporting] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

  const hasContent = hymns.length > 0 || sermon.sections.length > 0;

  const handleExport = async () => {
    if (!hasContent) {
      toast.error('请先添加诗歌或讲道内容');
      return;
    }
    setExporting(true);
    try {
      await exportToPptx(hymns, sermon);
      toast.success('PPTX 文件已导出！');
    } catch (err) {
      console.error(err);
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">
              SEC<span className="gold-accent">Slider</span> AI
            </h1>
          </div>
          <Button
            onClick={handleExport}
            disabled={!hasContent || exporting}
            className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? '导出中...' : '导出 PPTX'}
          </Button>
        </div>
      </header>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Editor */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="hymn" className="w-full">
              <TabsList className="w-full bg-secondary/60 border border-border mb-4">
                <TabsTrigger value="hymn" className="flex-1 data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                  <Music className="w-4 h-4" /> 诗歌
                </TabsTrigger>
                <TabsTrigger value="sermon" className="flex-1 data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                  <BookOpen className="w-4 h-4" /> 讲道
                </TabsTrigger>
              </TabsList>
              <TabsContent value="hymn">
                <HymnEditor hymns={hymns} onChange={setHymns} />
              </TabsContent>
              <TabsContent value="sermon">
                <SermonEditor sermon={sermon} onChange={setSermon} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-20">
              <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">预览</h3>
              <SlidePreview hymns={hymns} sermon={sermon} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
