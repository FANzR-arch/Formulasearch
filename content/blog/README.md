# Blog 内容维护

> 当前状态：26 篇文章索引及其 `index.md` 已经接入；能够与 Philthink 已发布库可靠对应的正文会生成本站阅读页，未匹配文章继续跳转原发布平台。

## 当前目录

每篇文章使用一个稳定的 `sourceId` 文件夹；现有内容沿用原始索引日期。公开发布日期以 `index.md` frontmatter 的 `pubDate` 为准：

```text
content/blog/
├─ categories.json
└─ 2026-07-02/
   └─ index.md              唯一文章内容源（frontmatter + 正文）

public/uploads/blog/
└─ 2026-07-02/
   └─ cover.jpg
```

文章目录和封面目录使用同一个 `sourceId`，Keystatic 会据此保存封面。标题、摘要、分类、外链、草稿状态和正文全部只维护在 `index.md`；旧 txt 已完成语义核对并删除。

## 分类配置

六个现有分类统一维护在 [`categories.json`](categories.json)，页面和文章读取会复用同一个运行时校验入口。新增分类时需要同时填写：

- `id`：稳定的英文标识；
- `title`：中文名称；
- `titleEn`：英文名称；
- `description`：分类说明。

不要随意修改已经使用的 `id`，否则现有文章会失去分类。
分类 ID 重复、格式不合法或文章引用不存在的分类都会让构建失败，不会静默把原始 ID 当作页面文案。

## Slug 与封面

`slug` 应保持稳定，并只使用小写字母、数字和连字符（例如 `ai-practice-2026-02-22`）；`series` 和 `archive` 是 Blog 的保留路由，不能作为文章 slug；文章公开后不要为了改标题随意修改 slug。

文章的 `pubDate` 是首次发布日；只有正文或公开元数据实际修订时才填写 `updatedDate`，且它不能早于 `pubDate`。日期倒退会在构建期失败，不要为了让 sitemap 看起来“更新”而随意改日期。

## 封面

封面放在 `public/uploads/blog/<同一日期>/`，frontmatter 的 `cover` 必须填写单斜杠开头的站内路径（例如 `/uploads/blog/2026-07-02/cover.jpg`），不能写 `//host/...` 或外部 URL。当前读取器支持 `avif`、`jpeg`、`jpg`、`png`、`webp`，并按文件名排序取第一张。

`coverAlt` 是封面的主要视觉描述；如果有可靠的英文视觉描述，再额外填写可选字段 `coverAltEn`。中文文章没有 `coverAltEn` 时，英文 UI 不会伪造通用的 `Article cover`，而是保留原始内容语言；如果 `contentLanguage: en`，则必须填写 `coverAltEn`。

公开文章的列表、精选舞台、相关阅读和页面 metadata 必须填写真正的英文 `titleEn` 与 `descriptionEn`；它们只改善同一 URL 的双语体验，不会自动创建独立的英文正文 SEO 路由。英文正文仍需单独翻译后才可扩展 `/en/blog/:slug`。

所有公开文章的 `titleEn`、`descriptionEn` 与 `coverAltEn` 都是必填字段；如果文章的 `contentLanguage` 设置为 `en`，这些字段同样必须存在。这样文章的可见标题、摘要、封面替代文本和 BlogPosting 结构化数据不会出现语言错配。

现有封面大多是约 `2.36:1–2.5:1` 的超宽横幅。新增封面优先延续横幅构图，避免把关键信息放在最边缘。封面尺寸和 WebP/AVIF 响应式变体由脚本维护，不要手工编辑 `content/site/blog-media.json`；`npm run blog:media:prepare` 也会清理该目录下不再被 manifest 使用的生成文件。

## 当前更新方式

1. 打开 `/keystatic` → “Blog 文章” → “添加”；
2. 使用稳定的 `sourceId`（建议 `YYYY-MM-DD`，同日多篇可加英文后缀）并填写独立的公开 `slug`；
3. 上传封面，填写中英文 metadata、具体封面描述、正文或可靠外链；
4. 未完成时保持 `draft: true`；只有完整正文使用 `contentStatus: full`；
5. 到 `/content-studio/publish` 运行“准备预览”，通过后再确认发布。

正文图片 alt 的维护：旧正文可先运行 `npm run blog:images:prepare`，它只会把空 alt 或“图像”替换成最近章节标题 + “配图”的中文初稿，不会覆盖已有具体描述。Markdown 图片和 HTML `<img>`（引号或无引号 `alt` 写法）都会被检查；提交前运行 `npm run blog:images:report`，查看哪些图片仍是这种上下文初稿、哪些封面 `coverAlt` 仍是文章标题占位，以及正文图片依赖了哪些外部主机和唯一 URL；它们需要结合实际画面逐张改成具体描述，再运行 `npm run blog:images:check`。远程图片尺寸使用 `npm run blog:images:dimensions` 查看、`npm run blog:images:dimensions:check` 校验、`npm run blog:images:dimensions:write` 写入真实元数据。`blog-media-policy.json` 的 `maxExternalImagesWithoutDimensions` 是无尺寸远程图的风险预算，新增远程图片前要先确认是否补齐尺寸或镜像资源。报告只输出到终端，不会生成需要长期维护的快照文件。

`blog:migrate` 是一次性的旧内容兼容迁移命令：核对旧 txt 与 frontmatter、把原始 `<strong>` 转成 Markdown，并补齐稳定 `sourceId`。日常编辑不需要运行它。单独检查内容可运行：

```bash
npm run blog:check
```

## 后续迁移

从 Philthink 的 `02-已发布` 导入正文：

```bash
npm run blog:import -- --source "C:\path\to\Philthink\文章产出库\02-已发布"
npm run blog:import -- --source "C:\path\to\Philthink\文章产出库\02-已发布" --write
```

第一条命令只预检，第二条才写入尚未迁入正文的文章。脚本只接受原文 URL、完整标题或去除标点后的唯一标题匹配；成功导入后会使用原稿的真实发布日期，并将 `contentStatus` 改为 `full`。已有 `full` 正文默认跳过，确认要用源稿覆盖时才额外加 `--overwrite`。未能唯一匹配的文章保持 `index-only` 和原平台外链；如果目标文章本来是 `draft: true`，导入正文也不会自动把它发布。

导入完成后，仍以目标目录的 `index.md` 为唯一来源：

```bash
npm run blog:import -- --source "C:\\path\\to\\Philthink\\文章产出库\\02-已发布"
npm run blog:import -- --source "C:\\path\\to\\Philthink\\文章产出库\\02-已发布" --write
npm run blog:check
npm run build
```
