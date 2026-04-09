import { useState } from 'react';
import { SermonData, SermonSection, SermonImage } from '@/types/slide';
import { parseSermonText, generateId } from '@/utils/textParser';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { BookOpen, Plus, Trash2, Image, Type, Heading1, Heading2, AlignLeft, ImagePlus } from 'lucide-react';

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

  // Attach image to a specific section
  const handleAttachImage = (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const img: SermonImage = {
      id: generateId(),
      url: URL.createObjectURL(file),
      file,
    };
    updateSection(sectionId, { image: img });
  };

  const removeAttachedImage = (sectionId: string) => {
    const section = sermon.sections.find(s => s.id === sectionId);
    if (section?.image) URL.revokeObjectURL(section.image.url);
    updateSection(sectionId, { image: undefined });
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
                <div key={section.id} className="rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-start gap-2 group">
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
                    <label className="shrink-0">
                      <Button variant="ghost" size="icon" asChild className="h-6 w-6 text-muted-foreground hover:text-accent cursor-pointer">
                        <span><ImagePlus className="w-3 h-3" /></span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleAttachImage(section.id, e)} />
                    </label>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => removeSection(section.id)}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {/* Attached image preview */}
                  {section.image && (
                    <div className="ml-6 mt-2 flex items-center gap-2">
                      <img src={section.image.url} alt="" className="w-16 h-12 object-cover rounded border border-border" />
                      <span className="text-xs text-muted-foreground">已插入图片</span>
                      <Button variant="ghost" size="icon" onClick={() => removeAttachedImage(section.id)} className="h-5 w-5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {sermon.sections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">尚未添加讲道内容</p>
          <p className="text-xs mt-1">粘贴讲道大纲开始</p>
        </div>
      )}
    </div>
  );
}
