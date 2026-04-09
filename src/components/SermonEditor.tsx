import { useState } from 'react';
import { SermonData, SermonSection, SermonImage } from '@/types/slide';
import { parseSermonText, generateId } from '@/utils/textParser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { BookOpen, Plus, Trash2, Image, Type, Heading1, Heading2, AlignLeft } from 'lucide-react';

interface Props {
  sermon: SermonData;
  onChange: (sermon: SermonData) => void;
}

const levelConfig = {
  title: { icon: Heading1, label: '标题', color: 'text-accent' },
  subtitle: { icon: Heading2, label: '子标题', color: 'text-primary' },
  content: { icon: AlignLeft, label: '内容', color: 'text-muted-foreground' },
};

export default function SermonEditor({ sermon, onChange }: Props) {
  const [rawText, setRawText] = useState('');

  const parseAndSet = () => {
    if (!rawText.trim()) return;
    const sections = parseSermonText(rawText);
    onChange({ ...sermon, sections: [...sermon.sections, ...sections] });
    setRawText('');
  };

  const updateSection = (id: string, updates: Partial<SermonSection>) => {
    onChange({
      ...sermon,
      sections: sermon.sections.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const removeSection = (id: string) => {
    onChange({ ...sermon, sections: sermon.sections.filter(s => s.id !== id) });
  };

  const cycleLevel = (id: string) => {
    const section = sermon.sections.find(s => s.id === id);
    if (!section) return;
    const levels: SermonSection['level'][] = ['title', 'subtitle', 'content'];
    const next = levels[(levels.indexOf(section.level) + 1) % 3];
    updateSection(id, { level: next });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: SermonImage[] = Array.from(files).map(file => ({
      id: generateId(),
      url: URL.createObjectURL(file),
      file,
    }));
    onChange({ ...sermon, images: [...sermon.images, ...newImages] });
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    const img = sermon.images.find(i => i.id === id);
    if (img) URL.revokeObjectURL(img.url);
    onChange({ ...sermon, images: sermon.images.filter(i => i.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Text input */}
      <Card className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-accent" />
          <h3 className="font-display text-lg font-semibold text-foreground">讲道内容</h3>
        </div>
        <Textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`粘贴讲道大纲，系统将自动识别层级：\n\n# 信心的力量\n一、信心的定义\n信心是对未见之事的确信...\n二、信心的实践\n1. 日常祷告\n2. 读经默想`}
          className="min-h-[160px] bg-background/60 border-border font-body text-sm resize-none"
        />
        <Button onClick={parseAndSet} disabled={!rawText.trim()} className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90">
          <Type className="w-4 h-4 mr-1" /> 解析并添加
        </Button>
      </Card>

      {/* Structured sections */}
      {sermon.sections.length > 0 && (
        <Card className="glass-card p-5">
          <h4 className="font-display font-semibold text-foreground mb-3">内容结构</h4>
          <div className="space-y-2">
            {sermon.sections.map(section => {
              const config = levelConfig[section.level];
              const Icon = config.icon;
              return (
                <div key={section.id} className="flex items-start gap-2 group rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                  <button
                    onClick={() => cycleLevel(section.id)}
                    className={`mt-0.5 shrink-0 ${config.color} hover:opacity-70 transition-opacity`}
                    title={`点击切换层级 (当前: ${config.label})`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                  <Input
                    value={section.text}
                    onChange={e => updateSection(section.id, { text: e.target.value })}
                    className={`flex-1 border-none bg-transparent p-0 h-auto ${
                      section.level === 'title' ? 'font-display text-base font-bold' :
                      section.level === 'subtitle' ? 'font-display text-sm font-semibold' :
                      'text-sm'
                    }`}
                  />
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => removeSection(section.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Images */}
      <Card className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-accent" />
            <h4 className="font-display font-semibold text-foreground">插图</h4>
          </div>
          <label>
            <Button variant="outline" size="sm" asChild className="cursor-pointer border-border text-foreground hover:bg-secondary">
              <span><Plus className="w-3 h-3 mr-1" /> 添加图片</span>
            </Button>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        </div>

        {sermon.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {sermon.images.map(img => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border aspect-[4/3]">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <Button
                  variant="destructive" size="icon"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <Image className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">点击上方按钮添加图片</p>
          </div>
        )}
      </Card>

      {sermon.sections.length === 0 && sermon.images.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">尚未添加讲道内容</p>
          <p className="text-xs mt-1">粘贴讲道大纲开始</p>
        </div>
      )}
    </div>
  );
}
