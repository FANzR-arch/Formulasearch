# 这里是你更新网站的地方

首页和 Blog 的日常内容可以只改本文件夹；Projects、Skills、Lab、Photos、Architecture 目前仍是首版目录数据，尚未迁移到统一内容模型。不要把“只改 content”理解为所有页面都已经支持无代码更新。

## 最常用的入口

1. 改首页中文：打开 [`site/home.json`](site/home.json)，按字段更新文字。
2. 改首页英文：同步更新 [`site/home.en.json`](site/home.en.json)，保持 `intro`、`about`、`interest` 的数组长度一致。
3. 放首页图片：把图片拖到 [`../public/uploads/home/`](../public/uploads/home/)；再把图片路径填进两个 JSON 的 `heroImage`。
3. 新增 Blog：复制 [`blog/2026-07-02`](blog/2026-07-02) 文件夹，改成新的发布日期，再修改里面四个文本文件；封面图片放进 `../public/uploads/blog/同一个日期/`。

网站在本地预览运行时，保存文本或放入图片后会自动刷新。正式部署接通后，同样的文件变更会触发网站重新构建。

## 不要动的地方

- 不要修改 `src/`：那是网站的排版和功能。
- 不要修改根目录的 `package.json`：那是构建配置。
- 图片文件名尽量使用英文、小写、短横线，例如 `phil-working-desk.jpg`；不要用空格、中文或括号。

## Blog 内容结构

```text
content/blog/
├─ categories.json       六个文章主题的名称和说明
└─ 2026-07-02/           一篇文章一个日期文件夹
   ├─ 标题.txt
   ├─ 摘要.txt
   ├─ 分类.txt            填 categories.json 中的 id
   └─ 链接.txt            每行一个外链，支持微信和 X

public/uploads/blog/
└─ 2026-07-02/           与文章日期相同
   └─ cover.jpg           文件名不限，目录里放一张封面
```

Blog 页面会自动按日期倒序读取这些内容。`Latest` 显示最近文章，`Series` 按分类整理，`Archive` 显示完整时间归档。

## 后续新增内容的位置

```text
content/
├─ site/                 网站公共文案和首页
├─ blog/                 已接入的文章索引
└─ projects/             后续接入，一个项目一个文件夹
```

当前公开图片放在 `public/uploads/`，因为该目录会被网站直接发布。首页、Blog、Projects、Skills、Lab、Photos、Architecture 的首版内容已经接入可编辑的数据文件；页面源码只保留布局、资源映射和交互逻辑。

站点名、域名、作者地址和 GitHub 地址统一维护在 [`site/site.json`](site/site.json)，不要在页面或脚本中复制粘贴这些稳定身份字段。

## 当前路由

- `/`：首页，文案来自 `content/site/home.json` 和 `content/site/home.en.json`，构建时由 Zod 校验
- 全站一级导航：内容来自 `content/site/navigation.json`，构建时由 `src/data/navigation.ts` 做 Zod 校验
- `/blog`、`/blog/series`、`/blog/archive`：文章索引和归档
- `/blog/series` 的主题分组来自 `content/site/blog-series.json`，构建时由 `src/data/blog-series.ts` 校验
- `/rss.xml`：仅输出已迁移到本站正文的 Blog 文章
- `/projects`、`/skills`、`/lab`：目录内容来自 `content/site/catalog.json`，构建时由 `src/data/catalog.ts` 做 Zod 校验
- `/photos`：照片 manifest 来自 `content/site/photo-archive.json`，构建时由 `src/data/photo-archive.ts` 做 Zod 校验
- `/architecture`：内容来自 `content/site/architecture.json`，构建时由 `src/data/architecture.ts` 做 Zod 校验

照片归档清单可直接编辑 [`site/photo-archive.json`](site/photo-archive.json)；如果需要从原始 JPG/PNG 重新生成图片和清单，可通过 `PHOTO_ARCHIVE_SOURCE` 指向原始目录，再运行 `npm run photos:prepare`。脚本会生成 WebP 和 JSON manifest，并保留已有的图片文案与标签，不会把本机绝对路径写进页面代码。

Blog 正文图片必须填写具体 alt。历史文章的通用 alt 可用 `npm run blog:images:prepare` 按最近章节生成初稿；之后 `npm run blog:images:check` 会阻止新的空 alt 或 `图像` 进入构建。

Blog 内容状态约定：`contentStatus: full` 必须有非空 Markdown 正文；已发布的 `contentStatus: index-only` 必须在 `链接.txt` 中保留至少一个可靠外链。来源未确认或正文未准备好的记录使用 `draft: true`，不会出现在公开 Blog 列表；更新后运行 `npm run blog:check`，输出会列出 full、index-only 与 draft 数量。

Blog 封面尺寸和响应式 WebP 变体由 `content/site/blog-media.json` 统一记录。新增或替换 `public/uploads/blog/` 下的封面后，运行 `npm run blog:media:prepare` 更新清单与 `public/uploads/blog-optimized/` 变体；`npm run blog:media:check` 已接入 `npm run build`，会阻止缺失或过期的媒体元数据进入发布流程。
