# 本地摄影原图

这个目录只用于本机暂存摄影归档的 JPG/PNG 原图，不是 Astro 的直接构建输入。原图默认不会进入 Git；网站发布使用的是已经生成并纳入版本控制的 `public/uploads/photos/select/*.webp`，以及 `content/site/photo-archive.json` 中的尺寸、布局、双语 alt 和标签。

如果要从一组完整原图重新生成归档：

```bash
npm run photos:prepare -- <原始照片目录>
```

脚本会按生成图片的 `assetHash` 保留已有的双语 `alt` 描述与标签，即使原图排序变化或中间插入新图也不会按序号错配；新图片会生成“待补充摄影描述”占位，构建前必须改成真实画面描述。摄影页不再维护不会渲染的 `caption` / `label` 字段。脚本还会在来源图片数量少于现有 manifest 时拒绝执行，避免误把不完整的本机目录当成完整归档。只有确认要删除线上图片时，才显式使用 `--allow-shrink`。旧 manifest 可运行 `npm run photos:hashes:migrate` 补齐 hash；`npm run photos:test` 可回归换序与 BOM 兼容性。

原图是否需要长期备份、以及备份到哪里，不由网站仓库自动决定；需要备份时请使用独立的资产存储或备份策略。
