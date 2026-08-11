# 首页内容

- `home.json` 是中文首页内容。
- `home.en.json` 是英文首页内容。
- `photo-archive.json` 是 `/photos` 的照片清单；可直接编辑标题、说明、标签和公开图片路径。
- `catalog.json` 是 Projects、Skills、Lab 的目录内容；每个区块必须有中英文标题、说明和至少一条内容。
- `architecture.json` 是 `/architecture` 的页面文案、筛选器和研究图像清单；图片标识对应 `src/data/architecture.ts` 中的构建资源映射。
- `navigation.json` 是全站一级导航和下拉菜单内容；链接应使用站内绝对路径，构建时会校验四组主导航和双语字段。
- 两个文件的 `intro`、`about`、`interest` 数组必须逐项对应；构建会检查数量。
- `email` 必须是有效邮箱，`social.url` 必须是完整 URL，必填文本不能是空字符串。
- `heroImage` 留空时不显示首页图片；填写时使用 `public/` 下的公开路径，例如 `/uploads/home/portrait.jpg`。

`identity`、`now`、`work`、`writing`、`resources` 是预留字段。页面需要这些内容时，可以直接扩展对应组件，不必再添加新的解析规则。

照片清单由 `src/data/photo-archive.ts` 在构建时做结构校验。若要从原始照片重新生成图片尺寸、布局和 WebP 文件，运行 `npm run photos:prepare`；默认原始目录为 `E:/Picture/like/select`，也可通过 `PHOTO_ARCHIVE_SOURCE` 覆盖。重新生成时会更新图片路径、尺寸和布局，并按图片输出路径保留已有的 `alt`、`caption`、`label`、`tags` 编辑内容。

目录清单由 `src/data/catalog.ts` 在构建时做结构校验。修改 `catalog.json` 后运行 `npm run build`，即可同时检查三组目录的结构和双语字段。

建筑档案由 `src/data/architecture.ts` 在构建时做结构校验。修改 `architecture.json` 后运行 `npm run build`，即可检查图片标识、布局、标签和双语文案。
