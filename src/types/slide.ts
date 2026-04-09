export interface HymnVerse {
  id: string;
  label: string; // e.g. "第一节", "副歌"
  text: string;
  isChorus?: boolean; // AI detected chorus section
}

export interface Hymn {
  id: string;
  title: string;
  author?: string;
  verses: HymnVerse[];
  // AI-generated repeat structure: array of verse indices to render
  repeatStructure?: number[];
}

export interface SermonSection {
  id: string;
  level: 'title' | 'subtitle' | 'content';
  text: string;
  image?: SermonImage; // image attached to this section's slide
}

export interface SermonImage {
  id: string;
  url: string;
  file: File;
}

export interface SermonData {
  sections: SermonSection[];
  images: SermonImage[]; // unattached images pool
}

export interface SlideData {
  type: 'hymn-title' | 'hymn-verse' | 'sermon-title' | 'sermon-content' | 'sermon-image';
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  hymnTitle?: string;
  verseLabel?: string;
  image?: SermonImage; // attached image for sermon content slides
}
