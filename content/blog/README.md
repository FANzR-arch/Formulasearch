# Blog 内容维护

> 当前状态：26 篇文章索引及其 `index.md` 已经接入；能够与 Philthink 已发布库可靠对应的正文会生成本站阅读页，未匹配文章继续跳转原发布平台。

## 当前目录

每篇文章使用发布日期作为文件夹名：

```text
content/blog/
├─ categories.json
└─ 2026-07-02/
   ├─ 标题.txt
   ├─ 摘要.txt
   ├─ 分类.txt
   ├─ 链接.txt
   └─ index.md

public/uploads/blog/
└─ 2026-07-02/
   └─ cover.jpg
```

文字文件夹和图片文件夹的日期必须一致，系统会自动配对。

## 四个文字文件

- `标题.txt`：文章公开标题，必填。
- `摘要.txt`：用于 Blog 列表的短摘要，必填。
- `分类.txt`：填写 `categories.json` 中的分类 `id`，必填。
- `链接.txt`：一行一个公开链接；支持微信、X 和普通原文链接。已发布的 `index-only` 文章至少保留一行；尚未确认来源的草稿可以为空。

这四个 txt 文件是列表索引的编辑源。`index.md` 是网站内容源：它由迁移脚本创建，之后可以在 frontmatter 中补充 `contentStatus: full` 和正文。不要直接把 `index.md` 当成四个 txt 的替代品，也不要在未迁入正文时手动标记为 `full`。

## 分类配置

六个现有分类统一维护在 [`categories.json`](categories.json)。新增分类时需要同时填写：

- `id`：稳定的英文标识；
- `title`：中文名称；
- `titleEn`：英文名称；
- `description`：分类说明。

不要随意修改已经使用的 `id`，否则现有文章会失去分类。

## Slug 与封面

`slug` 应保持稳定，并只使用小写字母、数字和连字符（例如 `ai-practice-2026-02-22`）；文章公开后不要为了改标题随意修改 slug。

## 封面

封面放在 `public/uploads/blog/<同一日期>/`。当前读取器支持 `avif`、`jpeg`、`jpg`、`png`、`webp`，并按文件名排序取第一张。

现有封面大多是约 `2.36:1–2.5:1` 的超宽横幅。新增封面优先延续横幅构图，避免把关键信息放在最边缘。封面尺寸和 WebP 变体由脚本维护，不要手工编辑 `content/site/blog-media.json`。

## 当前更新方式

1. 复制一篇现有日期文件夹；
2. 把文件夹改成新的 `YYYY-MM-DD`；
3. 修改四个文字文件；
4. 在 `public/uploads/blog/同一日期/` 放一张封面；
5. 运行 `npm run blog:migrate`，为新目录生成或同步受管字段；
6. 如果正文已经确认，从 Philthink 导入或手工写入正文，并把 `contentStatus` 改成 `full`；否则保持 `index-only`；
7. 运行 `npm run blog:check`、`npm run blog:images:check` 和 `npm run build`，确认分类、链接、Markdown、图片 alt 和页面都能被读取。

`blog:migrate` 只创建缺失的 `index.md`，不会覆盖已经存在或已经迁入正文的 Markdown。单独检查内容可运行：

```bash
npm run blog:check
```

## 后续迁移

从 Philthink 的 `02-已发布` 导入正文：

```bash
npm run blog:import -- --source "E:\00_Phil\Philthink\文章产出库\02-已发布"
npm run blog:import -- --source "E:\00_Phil\Philthink\文章产出库\02-已发布" --write
```

第一条命令只预检，第二条才写入尚未迁入正文的文章。脚本只接受原文 URL、完整标题或去除标点后的唯一标题匹配；成功导入后会使用原稿的真实发布日期，并将 `contentStatus` 改为 `full`。已有 `full` 正文默认跳过，确认要用源稿覆盖时才额外加 `--overwrite`。未能唯一匹配的文章保持 `index-only` 和原平台外链；如果目标文章本来是 `draft: true`，导入正文也不会自动把它发布。

现有四个 txt 文件继续作为列表页索引保留，不手工删除。新增或迁移内容时，推荐按“预检 → 写入 → 构建”的顺序操作：

```bash
npm run blog:import -- --source "E:\\00_Phil\\Philthink\\文章产出库\\02-已发布"
npm run blog:import -- --source "E:\\00_Phil\\Philthink\\文章产出库\\02-已发布" --write
npm run blog:check
npm run build
```
