import { useState, useCallback, useId } from 'react';
import { Hymn, HymnVerse } from '@/types/slide';
import { parseHymnText, generateId } from '@/utils/textParser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Plus, Trash2, ChevronDown, ChevronUp, Image, Loader2, RefreshCw, Bookmark, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

const OCR_FN_URL = 'https://cwgxddgoshyiugggjket.supabase.co/functions/v1/ocr-hymn';
const OCR_FN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Z3hkZGdvc2h5aXVnZ2dqa2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDAwNzgsImV4cCI6MjA5MTI3NjA3OH0.a0Cq8a1gwjl1-wzfo-JpWMQsHzFgRtu9Vmvsd--NzKk';

async function callOcrFunction(body: Record<string, unknown>) {
  const res = await fetch(OCR_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OCR_FN_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OCR function error: ${res.status}`);
  return res.json();
}

interface Props {
  hymns: Hymn[];
  myHymns: Hymn[];
  onAdd: (hymn: Hymn) => void;
  onUpdate: (id: string, updates: Partial<Hymn>) => void;
  onRemove: (id: string) => void;
  saveToMyHymns: (hymn: Hymn) => Promise<void>;
  addFromMyHymns: (hymn: Hymn) => void;
  deleteMyHymn: (id: string) => Promise<void>;
}

export default function HymnEditor({ hymns, myHymns, onAdd, onUpdate, onRemove, saveToMyHymns, addFromMyHymns, deleteMyHymn }: Props) {
  const [rawText, setRawText] = useState('');
  const [expandedHymn, setExpandedHymn] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const fileInputId = useId();

  const handleParseAndAdd = () => {
    if (!rawText.trim()) return;
    const result = parseHymnText(rawText);
    if (result.verses.length === 0) {
      toast.error('未识别到歌词段落，请检查格式');
      return;
    }
    const hymn: Hymn = {
      id: generateId(),
      title: result.title || '未命名诗歌',
      verses: result.verses,
    };
    onAdd(hymn);
    setRawText('');
    setExpandedHymn(hymn.id);
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setOcrLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const data = await callOcrFunction({ imageBase64: base64 });
      const text = data?.text;
      if (!text || text === '无法识别') {
        toast.error('无法从图片中识别歌词内容');
        return;
      }

      const result = parseHymnText(text);
      const hymn: Hymn = {
        id: generateId(),
        title: result.title || '图片识别诗歌',
        verses: result.verses,
      };
      onAdd(hymn);
      setExpandedHymn(hymn.id);
    } catch (err) {
      console.error('OCR error:', err);
      toast.error('图片识别失败，请重试');
    } finally {
      setOcrLoading(false);
    }
  }, [onAdd]);

  const generateRepeatStructure = useCallback(async (hymnId: string) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn || hymn.verses.length === 0) return;

    setAiLoading(hymnId);
    try {
      const versesText = hymn.verses.map((v, i) => `[${i}] ${v.label}: ${v.text}`).join('\n\n');

      const data = await callOcrFunction({ mode: 'repeat-structure', versesText, hymnTitle: hymn.title });
      const structure = data?.repeatStructure;
      if (structure && Array.isArray(structure)) {
        onUpdate(hymnId, { repeatStructure: structure });
        toast.success(`已生成演唱顺序：共 ${structure.length} 个片段`);
      } else {
        toast.error('无法识别重复结构');
      }
    } catch (err) {
      console.error('AI repeat error:', err);
      toast.error('AI分析失败，请重试');
    } finally {
      setAiLoading(null);
    }
  }, [hymns, onUpdate]);

  const handleSave = async (hymn: Hymn) => {
    setSavingId(hymn.id);
    await saveToMyHymns(hymn);
    setSavingId(null);
  };

  const updateVerse = (hymnId: string, verseId: string, updates: Partial<HymnVerse>) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn) return;
    onUpdate(hymnId, {
      verses: hymn.verses.map(v => v.id === verseId ? { ...v, ...updates } : v),
    });
  };

  const addVerse = (hymnId: string) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn) return;
    const newVerse: HymnVerse = {
      id: generateId(),
      label: `第${hymn.verses.length + 1}段`,
      text: '',
    };
    onUpdate(hymnId, { verses: [...hymn.verses, newVerse], repeatStructure: undefined });
  };

  const removeVerse = (hymnId: string, verseId: string) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn) return;
    const newVerses = hymn.verses.filter(v => v.id !== verseId);
    let newRepeat: number[] | undefined = undefined;
    if (hymn.repeatStructure) {
      const oldIdx = hymn.verses.findIndex(v => v.id === verseId);
      newRepeat = hymn.repeatStructure
        .filter(i => i !== oldIdx)
        .map(i => i > oldIdx ? i - 1 : i)
        .filter(i => i >= 0 && i < newVerses.length);
      if (newRepeat.length === 0) newRepeat = undefined;
    }
    onUpdate(hymnId, { verses: newVerses, repeatStructure: newRepeat });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="current">
        <TabsList className="w-full bg-secondary/60 border border-border mb-4">
          <TabsTrigger value="current" className="flex-1 data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <Music className="w-4 h-4" /> 当前编辑
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <BookOpen className="w-4 h-4" /> 诗歌库
          </TabsTrigger>
        </TabsList>

        {/* Current session */}
        <TabsContent value="current">
          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-5 h-5 text-accent" />
              <h3 className="font-display text-lg font-semibold text-foreground">添加诗歌</h3>
            </div>
            <Textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="粘贴歌词，系统将自动识别分段；可点击'AI生成演唱顺序'智能生成演唱顺序"
              className="min-h-[160px] bg-background/60 border-border font-body text-sm resize-none"
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={handleParseAndAdd} disabled={!rawText.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" /> 解析并添加
              </Button>
              <label
                htmlFor={fileInputId}
                className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 ${ocrLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
              >
                {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                {ocrLoading ? 'AI识别中...' : '图片OCR识别'}
              </label>
              <input id={fileInputId} type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} disabled={ocrLoading} />
            </div>
          </Card>

          {hymns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">尚未添加诗歌</p>
              <p className="text-xs mt-1">粘贴歌词或上传图片开始</p>
            </div>
          ) : (
            hymns.map((hymn, idx) => (
              <Card key={hymn.id} className="glass-card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => setExpandedHymn(expandedHymn === hymn.id ? null : hymn.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                    <span className="font-display font-semibold text-foreground">{hymn.title}</span>
                    <span className="text-xs text-muted-foreground">{hymn.verses.length} 段</span>
                    {hymn.repeatStructure && (
                      <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        演唱 {hymn.repeatStructure.length} 片段
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); handleSave(hymn); }} disabled={savingId === hymn.id} className="text-muted-foreground hover:text-foreground h-8" title="保存到诗歌库">
                      {savingId === hymn.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bookmark className="w-3 h-3 mr-1" />}
                      保存到诗歌库
                    </Button>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onRemove(hymn.id); }} className="text-muted-foreground hover:text-destructive h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedHymn === hymn.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedHymn === hymn.id && (
                  <div className="border-t border-border p-4 space-y-3">
                    <Input
                      value={hymn.title}
                      onChange={e => onUpdate(hymn.id, { title: e.target.value })}
                      className="font-display font-semibold bg-background/60"
                      placeholder="诗歌标题"
                    />

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateRepeatStructure(hymn.id)}
                        disabled={aiLoading === hymn.id || hymn.verses.length === 0}
                        className="border-accent/30 text-accent hover:bg-accent/10"
                      >
                        {aiLoading === hymn.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        AI生成演唱顺序
                      </Button>
                      {hymn.repeatStructure && (
                        <span className="text-xs text-muted-foreground">
                          顺序: {hymn.repeatStructure.map(i => hymn.verses[i]?.label || i).join(' → ')}
                        </span>
                      )}
                    </div>

                    {hymn.verses.map((verse) => (
                      <div key={verse.id} className="rounded-lg border border-border p-3 bg-background/40">
                        <div className="flex items-center justify-between mb-2">
                          <Input
                            value={verse.label}
                            onChange={e => updateVerse(hymn.id, verse.id, { label: e.target.value })}
                            className="w-32 text-xs font-bold bg-transparent border-none p-0 h-auto text-accent"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeVerse(hymn.id, verse.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <Textarea
                          value={verse.text}
                          onChange={e => updateVerse(hymn.id, verse.id, { text: e.target.value })}
                          className="min-h-[80px] text-sm bg-transparent border-none resize-none p-0"
                          placeholder="歌词内容..."
                        />
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addVerse(hymn.id)} className="w-full border-dashed border-border text-muted-foreground hover:text-foreground">
                      <Plus className="w-3 h-3 mr-1" /> 添加段落
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* My saved hymns */}
        <TabsContent value="saved">
          {myHymns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无已保存的诗歌</p>
              <p className="text-xs mt-1">解析调整后可保存到诗歌库</p>
            </div>
          ) : (
            myHymns.map((hymn) => (
              <Card key={hymn.id} className="glass-card overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold text-foreground">{hymn.title}</span>
                    <span className="text-xs text-muted-foreground">{hymn.verses.length} 段</span>
                    {hymn.repeatStructure && (
                      <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        演唱 {hymn.repeatStructure.length} 片段
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => addFromMyHymns(hymn)} className="border-accent/30 text-accent hover:bg-accent/10 h-8">
                      <Plus className="w-3 h-3 mr-1" /> 添加到PPT
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMyHymn(hymn.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
