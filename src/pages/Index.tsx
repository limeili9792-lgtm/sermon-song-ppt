import { useHymns } from '@/hooks/use-hymns';
import { useAuth } from '@/hooks/use-auth';
import { exportToPptx } from '@/utils/pptxExport';
import { TemplateName } from '@/types/slide';
import { uploadPptx, listPresentations, downloadPptx, deletePresentation, CloudPresentation } from '@/utils/cloudStorage';
import HymnEditor from '@/components/HymnEditor';
import SlidePreview from '@/components/SlidePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Download, Sparkles, LogOut, Cloud, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useCallback } from 'react';

export default function Index() {
  const {
    hymns, myHymns, loading,
    addHymn, updateHymn, removeHymn,
    saveToMyHymns, saveCurrentToMyHymns,
    addFromMyHymns, deleteMyHymn,
  } = useHymns();
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [template] = useState<TemplateName>('default');

  // Cloud save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [cloudNote, setCloudNote] = useState('');

  // Cloud PPT list dialog
  const [showCloudList, setShowCloudList] = useState(false);
  const [cloudPpts, setCloudPpts] = useState<CloudPresentation[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  const hasContent = hymns.length > 0;

  const loadCloudPpts = useCallback(async () => {
    setLoadingCloud(true);
    const data = await listPresentations();
    setCloudPpts(data);
    setLoadingCloud(false);
  }, []);

  const openCloudList = () => {
    setShowCloudList(true);
    loadCloudPpts();
  };

  const handleExportLocal = async () => {
    if (!hasContent) { toast.error('请先添加诗歌内容'); return; }
    setExporting(true);
    try {
      await exportToPptx(hymns, template);
      await saveCurrentToMyHymns();
      toast.success('PPTX 已导出到本地');
    } catch {
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const confirmCloudSave = async () => {
    if (!hasContent) return;
    setShowSaveDialog(false);
    setExporting(true);
    try {
      const blob = await exportToPptx(hymns, template, true) as Blob;
      if (!blob) throw new Error('生成失败');
      const hymnTitle = hymns[0]?.title || '未命名';
      const ok = await uploadPptx(blob, hymnTitle, cloudNote || '', user?.email || '');
      if (ok) {
        toast.success('已保存到云端');
        setCloudNote('');
      } else {
        toast.error('保存到云端失败');
      }
    } catch {
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (pptx: CloudPresentation) => {
    try {
      await downloadPptx(pptx.file_path);
      toast.success('开始下载');
    } catch {
      toast.error('下载失败');
    }
  };

  const handleDelete = async (pptx: CloudPresentation) => {
    const ok = await deletePresentation(pptx.id, pptx.file_path);
    if (ok) {
      setCloudPpts(prev => prev.filter(p => p.id !== pptx.id));
      toast.success('已删除');
    } else {
      toast.error('删除失败');
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
            <Button onClick={handleExportLocal} disabled={!hasContent || exporting} className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" size="sm">
              <Download className="w-4 h-4 mr-1.5" />
              {exporting ? '导出中...' : '导出本地'}
            </Button>
            <Button onClick={() => setShowSaveDialog(true)} disabled={!hasContent || exporting} variant="outline" size="sm">
              <Cloud className="w-4 h-4 mr-1.5" />
              导出云端
            </Button>
            <Button onClick={openCloudList} variant="ghost" size="sm">
              <Cloud className="w-4 h-4 mr-1.5" />
              云端PPT
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
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>保存到云端</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">备注（可选）</label>
            <Input value={cloudNote} onChange={e => setCloudNote(e.target.value)} placeholder='例如：6.7上午' />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>取消</Button>
            <Button onClick={confirmCloudSave} disabled={exporting}>{exporting ? '保存中...' : '确认保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cloud PPT List Dialog */}
      <Dialog open={showCloudList} onOpenChange={setShowCloudList}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>云端PPT</span>
              <Button variant="ghost" size="sm" onClick={loadCloudPpts} disabled={loadingCloud}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingCloud ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">10天后自动清理</p>
          <div className="max-h-80 overflow-y-auto">
            {loadingCloud ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cloudPpts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Cloud className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">还没有云端PPT</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cloudPpts.map(pptx => (
                  <div key={pptx.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{pptx.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {pptx.note && `${pptx.note} · `}{new Date(pptx.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(pptx)}>
                        <Download className="w-3.5 h-3.5 mr-1" /> 下载
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(pptx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
