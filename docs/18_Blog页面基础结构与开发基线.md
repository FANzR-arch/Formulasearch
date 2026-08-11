# Blog 页面基础结构与开发基线

> 更新：2026-08-11
> 状态：Phase 0、Phase 1 与详情页骨架已完成；16 篇正文已迁移，另有 10 篇保留为外链索引；封面尺寸清单与 80 个响应式 WebP 变体已接入构建门禁，详情页自动相关内容也已完成。AVIF/更深层图片管线仍待确认发布策略后评估。
> 目标：复用现有 26 篇文章、封面、分类和 Astro 页面，不从零重建 Blog。

## 先看结论

Blog 不需要推翻。当前代码已经完成栏目首页、主题页、归档页、文章详情页、导航、主题切换和内容读取；后续应当在这套骨架上继续补齐三件事：

1. 为剩余 10 篇外链索引补齐可迁移正文；
2. 评估 AVIF 或 Astro 图片管线，并继续完善响应式图片治理；
3. 在现有 Astro 内容集合、SEO 与 sitemap 基础上继续维护文章关联网络；详情页已按 series/category/tags 评分，历史文章缺少 tags 时使用分类兜底。

推荐的视觉组合是：

> **Cloudflare 的阅读骨架 + 当前 Formulasearch 的纸张感与衬线标题 + 现有横幅封面的图片节奏。**

不复制 Cloudflare 的企业导航、标签海和巨大页脚；不改成通用 SaaS 卡片墙。

当前实施结果：

- 已生成并校验 26 个 `content/blog/**/index.md`；
- 已新增 Astro 内容集合 schema、迁移命令与构建前内容检查；
- Blog 首页已改成原比例横幅主图＋编辑型文字布局；
- 平板和移动端继续显示 Recent 封面，不再隐藏图片；
- Blog 样式已从全局样式拆到 `src/styles/blog.css`；
- 已生成 16 个本站文章详情页，10 篇正文缺失的内容继续使用原平台链接；
- 已补齐 Article 元数据、JSON-LD、横版社交分享图和 sitemap 条目。

---

## 1. 现有内容盘点

### 1.1 数量与完整度

| 项目 | 当前结果 |
|---|---:|
| 文章 | 26 篇 |
| 分类 | 6 个 |
| 有标题 | 26 / 26 |
| 有摘要 | 26 / 26 |
| 有封面 | 26 / 26 |
| 同时有微信和 X 链接 | 12 篇 |
| 封面总体积 | 约 13.18 MB |
| 大于 700 KB 的封面 | 8 张 |

当前分类分布：

| 分类 | 数量 |
|---|---:|
| 个人思考 | 7 |
| AI 实践分享 | 6 |
| AI 知识分享 | 4 |
| 提示词美学解码 | 4 |
| 少即是多 | 3 |
| 提示词分享 | 2 |

### 1.2 封面不是普通卡片图

26 张封面全部是横图，主要比例集中在 `2.36:1–2.5:1`，只有少数接近 `16:9`。因此不能直接照搬 Cloudflare 的 `16:9` 或常见 `4:3` 卡片比例：

- 首页主推文章使用约 `5:2` 的横幅容器；
- Recent 缩略图也使用约 `2.35:1`，避免把封面里的标题和构图裁掉；
- 移动端保留整张横幅，放在标题上方；
- 图片缺失时使用纸面占位，不使用随机图库或通用渐变。

### 1.3 当前内容缺口

每篇文章的内容源由四个索引 txt、`index.md` 和一张封面组成：

```text
标题.txt
摘要.txt
分类.txt
链接.txt
封面图片
```

其中 16 篇 `contentStatus: full` 已有本站正文和独立 URL；10 篇 `index-only` 仍是外部文章索引，点击后进入微信、X 或其他原文地址。只有确认可靠原稿后，才应把 `index-only` 改为 `full`。

---

## 2. 什么已经存在，必须复用

### 页面与路由

```text
/blog            Latest：首页与最近文章
/blog/series     当前六个主题的分组浏览
/blog/archive    按年份归档
```

### 代码资产

| 现有文件 | 继续承担的责任 | 是否保留 |
|---|---|---|
| `src/pages/blog/index.astro` | Blog 首页编排 | 保留并收紧结构 |
| `src/pages/blog/series.astro` | 主题/系列浏览 | 保留，后续澄清 taxonomy |
| `src/pages/blog/archive.astro` | 时间归档 | 保留，继续以文字扫描为主 |
| `src/components/BlogPostRow.astro` | 日期、元信息、标题、摘要、封面 | 保留并扩展本地文章链接 |
| `src/components/BlogSectionNav.astro` | Latest / Series / Archive | 保留 |
| `src/layouts/BlogLayout.astro` | 站点头部、主题切换、页脚 | 保留 |
| `src/lib/blog-content.ts` | 内容读取和排序 | 作为过渡适配层，随后改接 Astro 内容集合 |
| `src/styles/global.css` | 全站 token 与当前 Blog 样式 | 保留 token；Blog 样式逐步拆到 `blog.css` |

### 当前验证结果

- 技术栈：Astro `7.2.0`、TypeScript strict、静态输出；
- `npm run build` 已通过；
- Astro 检查结果为 0 error、0 warning、0 hint；
- 当前只生成首页、三个 Blog 栏目页和 sitemap，没有文章详情页。

---

## 3. 旧站里可以借什么

旧站 `D:\00_Formula\03_Coding\20260304_Personal-website` 的 Blog 仍然使用同一批标题、摘要、分类、链接和封面，没有隐藏的完整正文可以直接迁移。

可借的只有两类工程经验：

1. `content-system/core.js`、`scripts/check-content.mjs` 的构建期内容校验思路；
2. `scripts/optimize-images.mjs` 使用 Sharp 旋转、限宽、转 WebP、输出压缩结果的思路。

不直接搬以下代码：

- React 弹窗式 `BlogModalContent.tsx`；
- Vite 内容注册器和生成文件；
- 针对旧目录硬编码的图片任务列表；
- Tailwind 卡片样式。

Astro 内容集合已经能提供类型、校验、查询和 Markdown 渲染，继续维护旧注册器只会形成两套内容系统。

---

## 4. 调研后的页面结构

### 4.1 Blog 首页 `/blog`

目标：第一眼看到作者气质和最新内容，随后用图片与文字快速浏览；不是企业新闻数据库。

```text
[全站 Header]

[Blog 标题 + 一句说明]
[Latest | Series | Archive]

[主推文章]
├─ 5:2 横幅封面
└─ 日期 / 分类 / 大标题 / 摘要 / 阅读入口

[Recent]
├─ 日期 | 分类 / 标题 / 两行摘要 | 2.35:1 封面
├─ 日期 | 分类 / 标题 / 两行摘要 | 2.35:1 封面
└─ 最多展示 10–12 篇

[查看全部文章 → Archive]
[轻量 Footer]
```

具体调整：

- 当前 `Blog` 大标题缩小一级，给最新文章更多首屏面积；
- 主推文章保留图片 + 文字，但图片按素材比例展示，不再用接近方形的容器强裁切；
- Recent 保留编辑式横排，不改成统一圆角卡片网格；
- 桌面端缩略图在右侧，移动端移动到文字上方；
- 本地正文完成后，标题与封面默认进入本站文章页，微信/X 降级为“原发布平台”。

### 4.2 Series `/blog/series`

当前六组其实混合了“广义主题”和“连续系列”：

- `AI 实践分享`、`个人思考` 是主题；
- `少即是多`、`提示词美学解码` 更接近系列。

第一阶段不重分类，继续把六组当作浏览入口，避免迁移期间改动所有文章。内容增长后再拆成：

```text
category: AI / Design / Tools / Personal
series: Less Is More / Prompt Aesthetic Decode / ...
tags: 更细的检索词
```

Series 页保持文字密度，不强行给每篇文章重复封面；可在每组标题旁使用该组最新一篇的窄幅封面作为识别图，但不是首阶段必需。

### 4.3 Archive `/blog/archive`

Archive 的任务是查找，不是展示视觉：

- 年份吸顶或固定在左栏；
- 文章按日期倒序；
- 只显示日期、分类、标题；
- 不显示摘要和封面；
- 26 篇暂时不分页，达到约 80–100 篇后再评估分页。

### 4.4 文章详情 `/blog/[slug]`

以 [Cloudflare 的 Agent Access Model](https://blog.cloudflare.com/the-agent-access-model/) 为阅读结构参考：

```text
[全站 Header]

[面包屑 / 分类 / 系列]
[文章标题]
[发布日期 · 更新日期 · 阅读时间 · 分享]
[5:2 或原比例主图]

桌面：
┌──────────┬────────────────────────┬──────────┐
│ 分享/返回 │ 720–800px 正文阅读栏    │ 章节目录  │
│ 可选吸顶   │ 标题、段落、图片、代码   │ 吸顶       │
└──────────┴────────────────────────┴──────────┘

移动：
[标题与元信息]
[主图]
[可展开目录]
[单栏正文]

[原发布平台]
[上一篇 / 下一篇]
[相关文章或关联 Skill]
[轻量 Footer]
```

Formulasearch 自己的处理：

- 文章标题继续使用现有衬线字体；
- 正文使用中文无衬线字体，提高长文清晰度；
- 正文区域使用纯色纸面，点阵只出现在两侧空白；
- 目录使用 Astro Markdown 自动生成的 heading ID 和 `headings` 数据；
- 不复制 Cloudflare 的企业标签海、登录按钮、销售入口和大页脚。

---

## 5. 内容模型：从四个 txt 过渡到 Markdown

### 5.1 过渡策略

不一次性推倒当前内容目录。每个现有日期文件夹逐步增加一个 `index.md`：

```text
content/blog/2026-07-02/
├─ 标题.txt              迁移核验前保留
├─ 摘要.txt              迁移核验前保留
├─ 分类.txt              迁移核验前保留
├─ 链接.txt              迁移核验前保留
└─ index.md              新的统一元数据与正文
```

第一步可以用脚本把 26 组 txt 自动转换成 26 个 `index.md` 的 frontmatter，正文暂时为空，并标记 `contentStatus: index-only`。只有正文迁移完成并改成 `contentStatus: full` 的文章才生成本地详情页。

### 5.2 建议 frontmatter

```yaml
---
title: "提示词美学解码 × 新粗野主义：反AI味！"
description: "文章摘要"
pubDate: 2026-07-02
updatedDate: 2026-07-02
slug: prompt-aesthetic-brutalism
category: prompt-aesthetic
series: prompt-aesthetic-decode
tags:
  - 新粗野主义
  - 图像提示词
cover: /uploads/blog/2026-07-02/HMMfIQIXkAA-qiW.jpg
coverAlt: "新粗野主义提示词视觉封面"
contentStatus: index-only
featured: true
draft: false
externalLinks:
  - label: 微信
    url: https://mp.weixin.qq.com/...
  - label: X
    url: https://x.com/...
---

正文迁移到这里。
```

原则：

- `description` 是站内摘要和 SEO description，不从正文运行时截断；
- `slug` 一经上线不随标题变化；
- `coverAlt` 描述图片内容，不能继续用空字符串；
- `externalLinks` 保留原发布平台，不再承担本站主链接；
- `contentStatus` 让索引迁移和正文迁移可以分开进行；
- `series` 可选，`category` 必填；
- 阅读时间、上一篇/下一篇和自动相关文章由代码派生，不手填。

---

## 6. Astro 内容集合方案

Astro 官方内容集合可以从项目中任意目录加载 Markdown，并提供 schema、类型检查、查询和渲染。因此可以继续把用户内容留在根目录 `content/blog`，不强迫 Phil 日常进入 `src/`。

计划新增：

```text
src/content.config.ts
src/pages/blog/[slug].astro
src/layouts/BlogPostLayout.astro
src/components/blog/BlogMeta.astro
src/components/blog/BlogToc.astro
src/components/blog/RelatedPosts.astro
src/components/blog/ShareLinks.astro
src/lib/blog.ts
src/styles/blog.css
src/pages/rss.xml.ts
```

内容集合骨架：

```ts
import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const blog = defineCollection({
  loader: glob({
    base: './content/blog',
    pattern: '**/index.md',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    slug: z.string(),
    category: z.string(),
    series: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string(),
    coverAlt: z.string(),
    contentStatus: z.enum(['index-only', 'full']),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    externalLinks: z.array(z.object({
      label: z.enum(['微信', 'X', '原文']),
      url: z.url(),
    })).default([]),
  }),
})

export const collections = { blog }
```

说明：首阶段继续使用 `public/uploads/blog` 的 URL，减少迁移变量。文章路由稳定后，再把封面放到可被 Astro 处理的本地资源目录，使用 `image()`、`<Image />` 或 `<Picture />` 生成 WebP/AVIF、`srcset`、宽高和响应式尺寸。Astro 官方文档明确指出 `public/` 文件会原样复制，不会自动优化。

---

## 7. 代码职责与数据流

```text
content/blog/**/index.md
        ↓ Astro glob loader + schema
src/content.config.ts
        ↓
src/lib/blog.ts
├─ getPublishedPosts()
├─ getFeaturedPost()
├─ getPostsByCategory()
├─ getPostsByYear()
├─ getAdjacentPosts()
└─ getRelatedPosts()
        ↓
页面：/blog /series /archive /[slug] /rss.xml
        ↓
组件：BlogPostRow / BlogMeta / BlogToc / RelatedPosts
```

`src/lib/blog-content.ts` 在迁移期间保留为兼容层；当 26 篇 `index.md` 都生成并通过核验后，再把三个现有栏目页改接 `src/lib/blog.ts`，最后删除旧 txt 读取逻辑。不要同时长期维护两套真实来源。

相关文章优先级：

1. frontmatter 手动指定的相关文章；
2. 同系列；
3. 同分类且标签有交集；
4. 时间相近的最新文章。

最多显示 3 篇，避免文末变成推荐瀑布流。

---

## 8. SEO、GEO 与分享基线

当前 `BaseLayout.astro` 按页面接收 `ogType`、发布时间、更新时间和结构化数据；文章页输出 `article` OG 类型、BlogPosting 与 BreadcrumbList，Person JSON-LD 继续作为全站作者实体。

文章页必须具备：

- 唯一 `title`、description、canonical；
- `og:type=article`；
- `og:image`、Twitter large image card；
- `BlogPosting` JSON-LD：headline、description、image、datePublished、dateModified、author、mainEntityOfPage；
- 面包屑与 `BreadcrumbList`；
- 干净 HTML 正文和稳定 heading ID；
- sitemap 使用真实文章 URL 和 `updatedDate/pubDate`，不能把每个 URL 的 `lastmod` 都写成构建当天；
- RSS 输出已完成本地正文的文章；
- 原平台链接使用普通外链，不把微信 URL 设为本站 canonical。

当前 sitemap 与 RSS 使用 Astro Content Collection 过滤 draft/index-only 状态，并由 `site:check` 校验静态路由、日期、内部链接和草稿排除；如未来切换官方集成，必须保留这些内容状态门禁。

---

## 9. 响应式与可访问性

### 桌面（≥ 1200px）

- 首页：日期 96px / 主文字自适应 / 横幅缩略图约 240px；
- 文章页：正文 720–800px，右目录约 220px，左侧分享栏可选；
- 目录吸顶，但不能盖住全站 Header。

### 平板（768–1199px）

- 首页继续保留缩略图，不直接隐藏；
- 文章页取消左侧分享栏，保留右目录或改成正文前目录；
- 主推文章上下排列，图片保持横幅比例。

### 移动（≤ 767px）

- 每篇 Recent 仍显示封面，图片置顶；
- 标题允许自然换行，不使用截断制造半个中文字符；
- 元信息分行，点击区域至少 44px；
- 目录变成正文前的可展开区；
- 分享使用原生 Web Share（支持时）并提供复制链接回退；
- 代码块和表格横向滚动，页面本身不能横向滚动。

### 必须覆盖的状态

| 状态 | 用户看到什么 |
|---|---|
| 没有主推文章 | 自动使用最新的 `full` 文章 |
| 封面缺失 | 构建失败；不静默上线空白卡片 |
| 正文尚未迁移 | 索引可见，主入口继续去原平台，不生成空文章页 |
| 外链缺失 | 本地正文可读时不影响；无正文又无外链则构建失败 |
| 分类为空 | Series 不渲染空分组 |
| 相关文章不足 | 显示实际数量，不造占位内容 |

---

## 10. 图片与性能计划

现状问题：

- 26 张封面约 13.18 MB；
- 8 张大于 700 KB，其中最大一张约 3.2 MB；
- 原始图片仍来自 `public/`，但构建前会用 Sharp 生成响应式 WebP；
- 当前 `<img>` 已通过 `content/site/blog-media.json` 输出固有宽高，布局抖动风险已受构建门禁控制；
- 当前主推和列表容器会裁切超宽封面。

分两步处理：

1. 页面结构阶段：保留原文件路径，补固定比例、`width/height` 或 `aspect-ratio`，主图设置正确的加载优先级（已完成）；
2. 内容集合稳定后：当前已用独立 Sharp 清单生成多尺寸 WebP，并由 `BlogCover.astro` 统一输出；确认缓存、存储和发布策略后，再评估增加 AVIF，不复用旧硬编码任务表。

性能验收：

- 首页 LCP 主图有明确尺寸和 `fetchpriority=high`；
- 列表图 lazy-load；
- 移动端通过 `srcset` 不下载不必要的桌面尺寸封面；
- 单张列表图目标控制在约 100–180 KB；
- 最大内容宽度下不放大原图；
- 无横向页面溢出。

本阶段新增 `scripts/prepare-blog-media.mjs`：它从实际封面读取宽高和文件大小，生成 `content/site/blog-media.json` 与 80 个响应式 WebP 变体；`blog:media:check` 已接入构建，文章封面、首页精选舞台和列表封面均输出 `width`、`height`、`sizes` 与 WebP `srcset`。

---

## 11. 分阶段实施顺序

### Phase 0：内容转换工具，不改页面（已完成）

1. 新增 `src/content.config.ts`；
2. 写一次性迁移脚本，把 26 组 txt 生成 `index.md` frontmatter；
3. 增加内容校验：日期、分类、URL、封面、slug 唯一性、状态组合；
4. 对比旧读取器与内容集合的 26 条输出，数量、排序、链接完全一致。

验收：现有三个 Blog 页面视觉和链接不变，`npm run build` 通过。

### Phase 1：首页图片 + 文字结构（已完成）

1. 调整 Blog hero 高度；
2. 主推和 Recent 改用现有横幅比例；
3. 移动端恢复列表封面；
4. 拆出 `src/styles/blog.css`；
5. 做 desktop / tablet / mobile 视觉 QA。

验收：26 篇全部可见或可从 Archive 到达；任何断点都没有横向溢出。

### Phase 2：文章详情页骨架（已完成）

1. 新增 `[slug].astro` 与 `BlogPostLayout.astro`；
2. 完成标题、元信息、主图、正文、目录、上一篇/下一篇、相关文章；
3. 先迁移 1 篇代表性长文作为样板；
4. 完成 Article OG、JSON-LD、RSS、sitemap。

验收：样板文章在禁用 JavaScript时仍可完整阅读，目录和锚点可用。

### Phase 3：批量正文迁移（部分完成：16 / 26）

1. 从微信/X/原始 Markdown 找回正文；
2. 清洗标题层级、图片、链接和引用；
3. 每篇核验后将 `contentStatus` 改为 `full`；
4. 原平台链接降级为辅助入口；
5. 迁移完成后移除四个 txt 文件和旧读取器。

验收：每篇文章有本站 URL、正文、封面 alt、正确分类和 canonical。

### Phase 4：图片优化与关联网络

1. 迁移封面到可优化资源目录；
2. 生成响应式图片；
3. 添加文章 ↔ Skill / Project 的自然内链；
4. 根据实际内容量再决定是否拆分 category / series / tags。

---

## 12. 暂不进入首版

| 暂缓项目 | 原因 |
|---|---|
| 站内全文搜索 | 26 篇时分类与归档足够；不要先引入客户端索引 |
| 评论系统 | 增加隐私、审核和脚本成本；外部平台仍可讨论 |
| Newsletter | 还没有确认订阅工具与发送节奏 |
| CMS | 文件式内容与 Git 部署已经足够 |
| 中英双语正文 | 当前先维护中文链路，不额外扩大内容维护范围 |
| 无限标签 | 当前六组已能导航，先修正 series/category 语义 |
| 动态推荐算法 | 使用可解释的同系列/同分类规则即可 |
| 分页 | 当前只有 26 篇，Archive 全量展示更直接 |

---

## 13. 剩余内容前置条件

文章详情页与迁移链路已经跑通。当前 16 篇正文可在本站阅读，剩余 10 篇仍需确认原始 Markdown、公众号后台导出、Obsidian/Philthink 文件或可抓取发布页，确认后再把 `contentStatus` 从 `index-only` 改为 `full`。

这个问题不阻塞当前 Blog 发布，只影响剩余 10 篇是否能生成本站详情页。

---

## 14. 参考与技术依据

视觉参考：

- [Cloudflare · The Agent Access Model](https://blog.cloudflare.com/the-agent-access-model/)：文章阅读栏、元信息、主图、右侧目录；
- [Cloudflare Blog](https://blog.cloudflare.com/)：重点文章的图片 + 文字结构；
- [Linear Now](https://linear.app/now)：统一封面节奏与内容网格；
- [Maggie Appleton](https://maggieappleton.com/)：个人站的作者气质和图文关系。

Astro 官方依据：

- [Content collections](https://docs.astro.build/en/guides/content-collections/)：glob loader、schema、类型安全和内容查询；
- [Routing reference](https://docs.astro.build/en/reference/routing-reference/)：静态动态路由和 `getStaticPaths()`；
- [Images](https://docs.astro.build/en/guides/images/)：本地图片、响应式图片和 `public/` 的处理边界；
- [RSS recipe](https://docs.astro.build/en/recipes/rss/)：使用内容集合生成 RSS；
- [Sitemap integration](https://docs.astro.build/en/guides/integrations-guide/sitemap/)：自动收集静态生成路由；
- [Markdown content](https://docs.astro.build/en/guides/markdown-content/)：heading ID、headings 数据与目录。
