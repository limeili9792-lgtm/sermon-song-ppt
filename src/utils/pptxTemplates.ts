import type { TemplateName } from '@/types/slide';

export interface TemplateConfig {
  name: TemplateName;
  label: string;
  bg: string;
  text: string;
  accent: string;
  font: string;
}

export const TEMPLATES: Record<TemplateName, TemplateConfig> = {
  default: {
    name: 'default',
    label: '默认',
    bg: 'FFFFFF',
    text: '002147',
    accent: '002147',
    font: 'SimHei',
  },
  minimal: {
    name: 'minimal',
    label: '简约',
    bg: 'FFFFFF',
    text: '000000',
    accent: '000000',
    font: 'Microsoft YaHei',
  },
  glass: {
    name: 'glass',
    label: '玻璃',
    bg: 'F0F4FF',
    text: '1A237E',
    accent: '3D5AFE',
    font: 'Microsoft YaHei',
  },
  playful: {
    name: 'playful',
    label: '童趣',
    bg: 'FFF8E1',
    text: 'E65100',
    accent: 'FF6D00',
    font: 'Microsoft YaHei',
  },
  natural: {
    name: 'natural',
    label: '自然',
    bg: 'F5F0E8',
    text: '2E4A1E',
    accent: '5D8A3C',
    font: 'KaiTi',
  },
  'retro-future': {
    name: 'retro-future',
    label: '复古',
    bg: '0A0A1A',
    text: 'E040FB',
    accent: '00E5FF',
    font: 'Microsoft YaHei',
  },
};
