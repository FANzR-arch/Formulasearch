# 首页与站点内容

- `home.json` 是中文首页内容。
- `home.en.json` 是英文首页内容。
- `email`、`social` 和 `heroImage` 是中英文共用字段，两个文件必须保持一致；`contactLabel`、`contactEmailPrefix` 和 `heroImageAlt` 分别填写对应语言的首页文案/替代文本。
- `photo-archive.json` 是 `/photos` 的页面文案、筛选器和照片清单；可直接编辑标题、说明、标签和公开图片路径。图片必须使用单斜杠开头的站内绝对路径（例如 `/uploads/photos/...`），不能写 `//host/...`。
- `catalog.json` 是 Projects、Skills、Lab 的目录内容；每个区块必须有中英文标题、说明和至少一条内容。
- `architecture.json` 是 `/architecture` 的页面文案、筛选器和研究图像清单；图片标识对应 `src/data/architecture.ts` 中的构建资源映射。
- 两个档案 manifest 的第一个筛选器必须是 `all`，新增筛选器必须至少命中一个条目的 `tags`；构建会检查筛选器和实际图片资源是否同步。
- `navigation.json` 是全站一级导航和下拉菜单内容；链接应使用站内绝对路径，构建时会校验四组主导航和双语字段。
- `navigation.json` 的下拉 hash 必须对应 Blog 主题或 Projects、Skills、Lab 的真实 section ID；修改这些 manifest 后运行 `npm run build` 检查导航是否仍然同步。
- 所有站点 manifest 的 `{ zh, en }` 文案字段共用 `src/lib/i18n.ts` 的 `localizedCopySchema`；修改双语必填规则时只需要维护这一处。
- `blog-navigation.json` 是 Blog 最新、主题、归档子导航的双语文案和路径；页面组件只负责渲染，构建时会校验三项 ID 与路由一致。
- `ui-copy.json` 是共享 UI 文案的双语唯一来源，包含 Blog 工具栏、档案控件、平台标签、导航/主题控件和常用返回操作；修改后运行 `npm run build` 校验字段。
- `ui-copy.json` 中带 `{label}`、`{name}`、`{minutes}` 或 `{title}` 的文案是占位模板，由 `src/lib/i18n.ts` 插值；构建会校验中英文占位符集合一致，新增动态 UI 文案时优先复用这个机制，不要在 Astro 模板里拼接双语句子。
- `ui-copy.json` 的 `navigation.backgroundCycle` 和 `backgroundVariants` 供首页 WebGL 背景按钮使用；脚本只读取 data 属性，不要在 `public/scripts/liquid-background.js` 中直接新增用户可见的中英文文案。
- `site-routes.json` 的 `static` 清单维护中文公开页面，`localized` 清单维护已有完整双语数据的 English SSR 页面；新增语言路由时必须同时补充页面、sitemap、LLM 输出和回归测试。
- `/en/...` 页面只覆盖已有双语 manifest 的首页、目录、档案和 Blog 索引；中文正文文章仍链接回 `/blog/...`，不会把缺少英文正文的数据伪装成英文文章页。
- `site.json` 是站点名、正式域名、作者身份、作者地址和 GitHub 地址的唯一来源；页面、JSON-LD、RSS、sitemap 和构建检查都会读取它。作者的别名、职业和知识领域也在这里维护。
- `site.json` 的 `themeColors.light/dark` 是浏览器地址栏主题色的唯一来源，同时供 SSR 初始值和主题切换脚本使用；使用 6 位十六进制颜色。
- `page-meta.json` 是首页、Blog、Blog 归档和 Blog 主题页的双语 SEO 标题/描述唯一来源；修改后运行 `npm run build` 校验字段。
- `blog-series.json` 是 Blog 主题页的分组和分类映射；新增主题时填写唯一的 `id`，并把对应分类 ID 放入 `categoryIds`。
- `blog-media.json` 是 Blog 封面的尺寸和响应式 WebP/AVIF 变体清单；它由 `npm run blog:media:prepare` 从 `public/uploads/blog/` 生成，不要手工填写宽高或变体路径。脚本会同时维护 `public/uploads/blog-optimized/` 下的生成文件，并在检查模式拒绝孤儿变体。
- 两个文件的 `intro`、`about`、`interest` 数组必须逐项对应；构建会检查数量。
- `email` 必须是有效邮箱，`social.url` 必须是完整 URL，必填文本不能是空字符串。
- `heroImage` 留空时不显示首页图片；填写时使用 `public/` 下的公开路径，例如 `/uploads/home/portrait.jpg`，并在中英文文件中填写对应的 `heroImageAlt`。
- Photography 与 Architecture 归档的每条 `alt` 都是 `{ zh, en }` 双语对象，必须描述画面内容，而不是只写“作品 + 编号”；摄影归档构建会拒绝已知的占位式 alt。

`identity`、`now`、`work`、`writing`、`resources` 是预留字段。页面需要这些内容时，可以直接扩展对应组件，不必再添加新的解析规则。

照片清单由 `src/data/photo-archive.ts` 在构建时做结构校验。若要从原始照片重新生成图片尺寸、布局和 WebP 文件，运行 `npm run photos:prepare -- <原始照片目录>`，或先设置 `PHOTO_ARCHIVE_SOURCE`；脚本不再内置某台机器的本地路径。重新生成时会更新图片路径、尺寸和布局，并按图片输出路径保留已有的 `alt`、`tags` 编辑内容；摄影页不再维护不会渲染的 `caption` / `label` 字段。新图片的 alt 会明确标记为待补充，构建不会允许占位文本发布；来源数量少于现有归档时还会阻止无意缩减。

Blog 正文图片的外部主机由 `blog-media-policy.json` 显式维护；`npm run blog:images:check` 会拒绝未列入策略的新主机。策略中的 `maxExternalImagesWithoutDimensions` 是当前无尺寸远程图的风险预算，超过预算必须先补齐尺寸、镜像资源，或经过评审后显式调整。策略只控制依赖边界，不代表远程图片已经具备离线尺寸或永久可用性。

远程正文图片的已确认宽高维护在 `blog-image-dimensions.json`。`npm run blog:images:dimensions` 只报告 URL、已确认和待确认数量；发布前运行 `npm run blog:images:dimensions:check`，在网络可用且确认允许读取源站时运行 `npm run blog:images:dimensions:write`，脚本会用真实图片元数据写入宽高，Markdown 构建会自动把已确认尺寸注入 `<img>`，`site:check` 还会逐张核对最终 HTML。失败的 URL 不会写入假尺寸，仍由无尺寸预算、临时比例和失败占位共同兜底。

目录清单由 `src/data/catalog.ts` 在构建时做结构校验。修改 `catalog.json` 后运行 `npm run build`，即可同时检查三组目录的结构和双语字段。

建筑档案由 `src/data/architecture.ts` 在构建时做结构校验。修改 `architecture.json` 后运行 `npm run build`，即可检查图片标识、布局、标签和双语文案。
