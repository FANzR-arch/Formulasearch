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
- `链接.txt`：一行一个公开链接；支持微信、X 和普通原文链接，至少一行。

## 分类配置

六个现有分类统一维护在 [`categories.json`](categories.json)。新增分类时需要同时填写：

- `id`：稳定的英文标识；
- `title`：中文名称；
- `titleEn`：英文名称；
- `description`：分类说明。

不要随意修改已经使用的 `id`，否则现有文章会失去分类。

## 封面

封面放在 `public/uploads/blog/<同一日期>/`。当前读取器支持 `avif`、`jpeg`、`jpg`、`png`、`webp`，并按文件名排序取第一张。

现有封面大多是约 `2.36:1–2.5:1` 的超宽横幅。新增封面优先延续横幅构图，避免把关键信息放在最边缘；后续会统一接入响应式图片优化。

## 当前更新方式

1. 复制一篇现有日期文件夹；
2. 把文件夹改成新的 `YYYY-MM-DD`；
3. 修改四个文字文件；
4. 在 `public/uploads/blog/同一日期/` 放一张封面；
5. 运行 `npm run blog:migrate`，为新目录生成 `index.md`；
6. 运行 `npm run build`，确认分类、链接、Markdown 和页面都能被读取。

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

第一条命令只预检，第二条才写入。脚本只接受原文 URL、完整标题或去除标点后的唯一标题匹配；成功导入后会使用原稿的真实发布日期，并将 `contentStatus` 改为 `full`。未能唯一匹配的文章保持 `index-only` 和原平台外链。

现有四个 txt 文件继续作为列表页索引保留，不手工删除。
