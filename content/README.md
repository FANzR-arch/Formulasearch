# 这里是你更新网站的地方

首页、Blog、Projects、Skills、Lab、Photos、Architecture 的公开内容都已经进入本文件夹或其对应的内容 manifest；页面源码主要保留布局、资源映射和交互逻辑。不要把“只改 content”理解为所有功能都已经支持无代码更新，新增字段仍需先扩展 schema 和页面消费逻辑。

## 最常用的入口

1. 改首页中文：打开 [`site/home.json`](site/home.json)，按字段更新文字。
2. 改首页英文：同步更新 [`site/home.en.json`](site/home.en.json)，保持 `intro`、`about`、`interest` 的数组长度一致。
3. 放首页图片：把图片拖到 [`../public/uploads/home/`](../public/uploads/home/)；再把图片路径和对应双语 `heroImageAlt` 填进两个 JSON。填写 `heroImage` 时必须同时填写具体 alt。
4. 新增 Blog：复制 [`blog/2026-07-02`](blog/2026-07-02) 文件夹，改成新的发布日期，再修改里面四个文本文件；封面图片放进 `../public/uploads/blog/同一个日期/`。

网站在本地预览运行时，保存文本或放入图片后会自动刷新。正式部署接通后，同样的文件变更会触发网站重新构建。

## 不要动的地方

- 不要修改 `src/`：那是网站的排版和功能。
- 内容编辑不需要修改根目录的 `package.json`；脚本或依赖发生变化时由工程维护者同步它。
- 图片文件名尽量使用英文、小写、短横线，例如 `phil-working-desk.jpg`；不要用空格、中文或括号。

## Blog 内容结构

```text
content/blog/
├─ categories.json       六个文章主题的名称和说明
└─ 2026-07-02/           一篇文章一个日期文件夹
   ├─ 标题.txt
   ├─ 摘要.txt
   ├─ 分类.txt            填 categories.json 中的 id
   ├─ 链接.txt            每行一个外链，支持微信和 X
   └─ index.md            由迁移脚本维护的 frontmatter，可选本站正文

public/uploads/blog/
└─ 2026-07-02/           与文章日期相同
   └─ cover.jpg           文件名不限，目录里放一张封面
```

Blog 页面会自动按日期倒序读取这些内容。`Latest` 显示最近文章，`Series` 按分类整理，`Archive` 显示完整时间归档。

Blog 列表和文章详情共用 Astro Content Collection；修改 `index.md` 的 frontmatter 后只需运行一次 `npm run build`，不需要再同步另一套页面解析逻辑。

Blog 迁移目录的外链由 `npm run blog:migrate` 按 URL 写入稳定平台 ID：`wechat`、`x`、`original`。页面上的中文/英文名称统一来自 `content/site/ui-copy.json`，不要把显示文案直接写回 frontmatter。

日常 Blog 更新建议依次运行 `npm run blog:check`、`npm run blog:images:check`、`npm run blog:media:check`，最后运行 `npm run build`。

需要了解双语内容覆盖率时运行 `npm run i18n:report`；它会统计站点 manifest 的双语文案数量、Blog 文章语言分布，以及 `titleEn` / `descriptionEn` / `coverAltEn` 覆盖率。`npm run i18n:check` 只在标记为 `contentLanguage: en` 的文章缺少必需英文 metadata 时失败，不会要求中文文章伪造英文翻译。

Blog 首页精选数量、近期文章数量、相关推荐数量和 `readingUnitsPerMinute` 阅读时长估算速率统一维护在 [`site/blog-settings.json`](site/blog-settings.json)，中文文章按字符、英文文章按词估算，调整内容展示策略时不需要修改页面模板。

## 后续新增内容的位置

```text
content/
├─ site/                 网站公共文案和首页
├─ blog/                 已接入的文章索引
└─ projects/             后续接入，一个项目一个文件夹
```

当前公开图片放在 `public/uploads/`，因为该目录会被网站直接发布。首页、Blog、Projects、Skills、Lab、Photos、Architecture 的内容已经接入可编辑的数据文件；页面源码只保留布局、资源映射和交互逻辑。

站点名、域名、作者身份、作者地址和 GitHub 地址统一维护在 [`site/site.json`](site/site.json)，不要在页面或脚本中复制粘贴这些稳定身份字段。首页与 Blog 入口页的双语 SEO 标题/描述统一维护在 [`site/page-meta.json`](site/page-meta.json)，共享 UI 文案维护在 [`site/ui-copy.json`](site/ui-copy.json)，公开路由和需要生成的静态页面维护在 [`site/site-routes.json`](site/site-routes.json)，页面源码只消费经过 Zod 校验的数据。

## 当前路由

- `/`：首页，文案来自 `content/site/home.json` 和 `content/site/home.en.json`，构建时由 Zod 校验
- 全站一级导航：内容来自 `content/site/navigation.json`，构建时由 `src/data/navigation.ts` 做 Zod 校验
- `/blog`、`/blog/series`、`/blog/archive`：文章索引和归档
- `/blog/series` 的主题分组来自 `content/site/blog-series.json`，构建时由 `src/data/blog-series.ts` 校验
- `/rss.xml`：仅输出已迁移到本站正文的 Blog 文章
- `/projects`、`/skills`、`/lab`：目录内容来自 `content/site/catalog.json`，构建时由 `src/data/catalog.ts` 做 Zod 校验
- `/photos`：照片 manifest 来自 `content/site/photo-archive.json`，构建时由 `src/data/photo-archive.ts` 做 Zod 校验
- `/architecture`：内容来自 `content/site/architecture.json`，构建时由 `src/data/architecture.ts` 做 Zod 校验
- 路由增删或改名：先更新 `content/site/site-routes.json`；不要在检查脚本或 Astro 模板里复制粘贴路由字符串

照片归档清单可直接编辑 [`site/photo-archive.json`](site/photo-archive.json)；如果需要从原始 JPG/PNG 重新生成图片和清单，可通过 `PHOTO_ARCHIVE_SOURCE` 或 `npm run photos:prepare -- <原始照片目录>` 指向原始目录，再运行脚本。脚本会生成 WebP 和 JSON manifest，并保留已有的图片文案与标签，不会把本机绝对路径写进页面代码。新图片会生成明确的“待补充摄影描述”双语占位，构建会拒绝它，必须先补写画面描述。

Photography / Architecture manifest 还负责归档交互策略：`initialVisibleCount` 控制首屏数量（Architecture 可写 `all`），`loadMoreBatchSize` 控制每次加载数量，`eagerImageCount` 控制首屏优先加载的图片数量。

Blog 正文图片必须填写具体 alt。历史文章的通用 alt 可用 `npm run blog:images:prepare` 按最近章节生成初稿；之后 `npm run blog:images:check` 会阻止新的空 alt、`图像` 或绕过 Markdown 语法的无 alt HTML 图片进入构建。代码围栏中的示例不会被误判。

Blog 内容状态约定：`contentStatus: full` 必须有非空 Markdown 正文；已发布的 `contentStatus: index-only` 必须在 `链接.txt` 中保留至少一个可靠外链。`tags` 不能重复或为空，单篇文章也不能重复外链。来源未确认或正文未准备好的记录使用 `draft: true`，不会出现在公开 Blog 列表；更新后运行 `npm run blog:check`，输出会列出 full、index-only 与 draft 数量。

Blog 封面尺寸和响应式 WebP/AVIF 变体由 `content/site/blog-media.json` 统一记录。新增或替换 `public/uploads/blog/` 下的封面后，运行 `npm run blog:media:prepare` 更新清单与 `public/uploads/blog-optimized/` 变体；`npm run blog:media:check` 已接入 `npm run build`，会阻止缺失或过期的媒体元数据进入发布流程。
