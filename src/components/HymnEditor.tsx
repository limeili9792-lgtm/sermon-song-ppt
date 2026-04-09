import { useState, useCallback } from 'react';
import { Hymn, HymnVerse } from '@/types/slide';
import { parseHymnText, generateId } from '@/utils/textParser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Music, Plus, Trash2, ChevronDown, ChevronUp, Image, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  hymns: Hymn[];
  onChange: (hymns: Hymn[]) => void;
}

export default function HymnEditor({ hymns, onChange }: Props) {
  const [rawText, setRawText] = useState('');
  const [expandedHymn, setExpandedHymn] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const addHymnFromText = () => {
    if (!rawText.trim()) return;
    const { title, verses } = parseHymnText(rawText);
    const hymn: Hymn = {
      id: generateId(),
      title: title || '未命名诗歌',
      verses,
    };
    onChange([...hymns, hymn]);
    setRawText('');
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

      const { data, error } = await supabase.functions.invoke('ocr-hymn', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      const text = data?.text;
      if (!text || text === '无法识别') {
        toast.error('无法从图片中识别歌词内容');
        return;
      }

      const { title, verses } = parseHymnText(text);
      const hymn: Hymn = {
        id: generateId(),
        title: title || '图片识别诗歌',
        verses,
      };
      onChange([...hymns, hymn]);
      toast.success(`已识别诗歌: ${hymn.title}`);
    } catch (err) {
      console.error('OCR error:', err);
      toast.error('图片识别失败，请重试');
    } finally {
      setOcrLoading(false);
    }
  }, [hymns, onChange]);

  // AI: detect chorus/verse repeat structure
  const generateRepeatStructure = useCallback(async (hymnId: string) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn || hymn.verses.length === 0) return;

    setAiLoading(hymnId);
    try {
      const versesText = hymn.verses.map((v, i) => `[${i}] ${v.label}: ${v.text}`).join('\n\n');

      const { data, error } = await supabase.functions.invoke('ocr-hymn', {
        body: {
          mode: 'repeat-structure',
          versesText,
          hymnTitle: hymn.title,
        },
      });

      if (error) throw error;

      const structure = data?.repeatStructure;
      if (structure && Array.isArray(structure)) {
        onChange(hymns.map(h => h.id === hymnId ? { ...h, repeatStructure: structure } : h));
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
  }, [hymns, onChange]);

  const removeHymn = (id: string) => {
    onChange(hymns.filter(h => h.id !== id));
  };

  const updateHymn = (id: string, updates: Partial<Hymn>) => {
    onChange(hymns.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const updateVerse = (hymnId: string, verseId: string, updates: Partial<HymnVerse>) => {
    onChange(hymns.map(h => {
      if (h.id !== hymnId) return h;
      return { ...h, verses: h.verses.map(v => v.id === verseId ? { ...v, ...updates } : v) };
    }));
  };

  const addVerse = (hymnId: string) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn) return;
    const newVerse: HymnVerse = {
      id: generateId(),
      label: `第${hymn.verses.length + 1}段`,
      text: '',
    };
    // Clear repeat structure since verses changed
    updateHymn(hymnId, { verses: [...hymn.verses, newVerse], repeatStructure: undefined });
  };

  const removeVerse = (hymnId: string, verseId: string) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn) return;
    const newVerses = hymn.verses.filter(v => v.id !== verseId);
    // Auto-adjust repeat structure: remove references to deleted verse index and remap
    let newRepeat: number[] | undefined = undefined;
    if (hymn.repeatStructure) {
      const oldIdx = hymn.verses.findIndex(v => v.id === verseId);
      newRepeat = hymn.repeatStructure
        .filter(i => i !== oldIdx)
        .map(i => i > oldIdx ? i - 1 : i)
        .filter(i => i >= 0 && i < newVerses.length);
      if (newRepeat.length === 0) newRepeat = undefined;
    }
    updateHymn(hymnId, { verses: newVerses, repeatStructure: newRepeat });
  };

  return (
    <div className="space-y-6">
      {/* Input area */}
      <Card className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Music className="w-5 h-5 text-accent" />
          <h3 className="font-display text-lg font-semibold text-foreground">添加诗歌</h3>
        </div>
        <Textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`粘贴诗歌歌词，系统将自动识别结构：\n\n展开清晨的翅膀\n\n第一节\n主耶和华你已经鉴察了我\n我坐下我起来你都已晓得\n\n副歌\n这样的奇妙是我不能测透`}
          className="min-h-[160px] bg-background/60 border-border font-body text-sm resize-none"
        />
        <div className="flex gap-2 mt-3">
          <Button onClick={addHymnFromText} disabled={!rawText.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" /> 解析并添加
          </Button>
          <label>
            <Button variant="outline" asChild disabled={ocrLoading} className="cursor-pointer border-border text-foreground hover:bg-secondary">
              <span>
                {ocrLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Image className="w-4 h-4 mr-1" />}
                {ocrLoading ? 'AI识别中...' : '图片OCR识别'}
              </span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={ocrLoading} />
          </label>
        </div>
      </Card>

      {/* Hymn list */}
      {hymns.map((hymn, idx) => (
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
              <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); removeHymn(hymn.id); }} className="text-muted-foreground hover:text-destructive h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
              {expandedHymn === hymn.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>

          {expandedHymn === hymn.id && (
            <div className="border-t border-border p-4 space-y-3">
              <Input
                value={hymn.title}
                onChange={e => updateHymn(hymn.id, { title: e.target.value })}
                className="font-display font-semibold bg-background/60"
                placeholder="诗歌标题"
              />
              <Input
                value={hymn.author || ''}
                onChange={e => updateHymn(hymn.id, { author: e.target.value })}
                className="text-sm bg-background/60"
                placeholder="作者（可选）"
              />

              {/* AI repeat structure */}
              <div className="flex items-center gap-2">
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
      ))}

      {hymns.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">尚未添加诗歌</p>
          <p className="text-xs mt-1">粘贴歌词或上传图片开始</p>
        </div>
      )}
    </div>
  );
}
