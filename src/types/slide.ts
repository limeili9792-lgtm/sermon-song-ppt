export interface HymnVerse {
  id: string;
  label: string;
  text: string;
  isChorus?: boolean;
}

export interface Hymn {
  id: string;
  title: string;
  verses: HymnVerse[];
  repeatStructure?: number[];
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type TemplateName = 'default' | 'minimal' | 'glass' | 'playful' | 'natural' | 'retro-future';

export interface SlideData {
  type: 'hymn-title' | 'hymn-verse';
  content?: string;
  hymnTitle?: string;
  verseLabel?: string;
}
