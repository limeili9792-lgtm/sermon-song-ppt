import { useState, useCallback } from 'react';
import { Hymn, HymnVerse } from '@/types/slide';
import { parseHymnText, generateId } from '@/utils/textParser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Music, Plus, Trash2, ChevronDown, ChevronUp, Image, Loader2 } from 'lucide-react';
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
    // For now, use a simple placeholder - OCR would need backend
    const hymn: Hymn = {
      id: generateId(),
      title: '图片识别诗歌（请编辑）',
      verses: [{ id: generateId(), label: '第1段', text: '请手动输入歌词或连接OCR服务' }],
    };
    onChange([...hymns, hymn]);
    e.target.value = '';
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
    updateHymn(hymnId, { verses: [...hymn.verses, newVerse] });
  };

  const removeVerse = (hymnId: string, verseId: string) => {
    const hymn = hymns.find(h => h.id === hymnId);
    if (!hymn) return;
    updateHymn(hymnId, { verses: hymn.verses.filter(v => v.id !== verseId) });
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
          placeholder={`粘贴诗歌歌词，系统将自动识别结构：\n\n奇异恩典\n\n第一节\n奇异恩典 何等甘甜\n我罪已得赦免\n\n第二节\n如此恩典 使我敬畏\n使我心得安慰`}
          className="min-h-[160px] bg-background/60 border-border font-body text-sm resize-none"
        />
        <div className="flex gap-2 mt-3">
          <Button onClick={addHymnFromText} disabled={!rawText.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" /> 解析并添加
          </Button>
          <label>
            <Button variant="outline" asChild className="cursor-pointer border-border text-foreground hover:bg-secondary">
              <span><Image className="w-4 h-4 mr-1" /> 图片OCR识别</span>
            </Button>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
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
