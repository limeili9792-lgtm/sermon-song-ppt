export interface HymnVerse {
  id: string;
  label: string; // e.g. "第一节", "副歌"
  text: string;
}

export interface Hymn {
  id: string;
  title: string;
  author?: string;
  verses: HymnVerse[];
}

export interface SermonSection {
  id: string;
  level: 'title' | 'subtitle' | 'content';
  text: string;
}

export interface SermonImage {
  id: string;
  url: string;
  file: File;
}

export interface SermonData {
  sections: SermonSection[];
  images: SermonImage[];
}

export interface SlideData {
  type: 'hymn-title' | 'hymn-verse' | 'sermon-title' | 'sermon-content' | 'sermon-image';
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  hymnTitle?: string;
  verseLabel?: string;
}
