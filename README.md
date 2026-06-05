# SECSlider AI

教会诗歌幻灯片制作工具。支持文字录入/OCR识别、AI演唱顺序分析、PPTX导出、云端共享。

🔗 **线上地址**：[secsliderai.vercel.app](https://secsliderai.vercel.app)

📖 **架构文档**：[项目介绍.md](./项目介绍.md)

## 功能

- 诗歌文字录入 + OCR图片识别（Gemini）
- AI 自动分析演唱顺序（主歌→副歌→结束）
- 幻灯片实时预览 + 拖拽排序
- PPTX 导出到本地 / 保存到云端
- 6套视觉模板
- 云端 PPT 共享库（10天自动清理）
- 邮箱+密码注册登录

## 技术栈

React 18 + TypeScript + Vite 5 · Tailwind CSS + shadcn/ui · Supabase (Auth/DB/Storage) · Gemini 2.0 Flash · Vercel

## 快速开始

```bash
bun install
bun run dev     # 本地开发 → localhost:8080
bun run build   # 构建生产包
```
