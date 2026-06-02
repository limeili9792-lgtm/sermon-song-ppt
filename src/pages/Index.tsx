import { useHymns } from '@/hooks/use-hymns';
import { useAuth } from '@/hooks/use-auth';
import { exportToPptx } from '@/utils/pptxExport';
import { TEMPLATES } from '@/utils/pptxTemplates';
import { TemplateName } from '@/types/slide';
import HymnEditor from '@/components/HymnEditor';
import SlidePreview from '@/components/SlidePreview';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Download, Sparkles, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Index() {
  const {
    hymns, myHymns, loading,
    addHymn, updateHymn, removeHymn,
    saveToMyHymns, saveCurrentToMyHymns,
    addFromMyHymns, deleteMyHymn,
  } = useHymns();
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [template, setTemplate] = useState<TemplateName>('default');

  const hasContent = hymns.length > 0;

  const handleExport = async () => {
    if (!hasContent) {
      toast.error('请先添加诗歌内容');
      return;
    }
    setExporting(true);
    try {
      await exportToPptx(hymns, template);
      await saveCurrentToMyHymns();
      toast.success('PPTX 已导出，诗歌已保存');
    } catch (err) {
      console.error(err);
      toast.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button
              onClick={handleExport}
              disabled={!hasContent || exporting}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
              size="sm"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {exporting ? '导出中...' : '导出 PPTX'}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9 text-muted-foreground" title="登出">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <HymnEditor
              hymns={hymns}
              myHymns={myHymns}
              onAdd={addHymn}
              onUpdate={updateHymn}
              onRemove={removeHymn}
              saveToMyHymns={saveToMyHymns}
              addFromMyHymns={addFromMyHymns}
              deleteMyHymn={deleteMyHymn}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="sticky top-20">
              <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">预览</h3>
              <SlidePreview hymns={hymns} template={template} />
              {/* 模版选择暂隐藏 */}
              <div className="hidden">
                <ToggleGroup type="single" value={template} onValueChange={(v) => v && setTemplate(v as TemplateName)} className="flex flex-wrap gap-1">
                  {Object.values(TEMPLATES).map((t) => (
                    <ToggleGroupItem key={t.name} value={t.name} className="text-xs h-7 px-3 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                      {t.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
