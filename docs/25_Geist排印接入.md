# Geist 科技排印与中文标题子集

日期：2026-10-03。主站采用用户选定的 tech 方向；字体对比页的五个方向与系统字体基准保留在 refs/font-preview。本文记录接入实现与本地验证。

## 字体与规格

| 角色 | 实际字体与 CSS family | 字重 |
| --- | --- | --- |
| 西文标题、正文、界面 | Geist，FS Geist | 标题 600，正文 400 |
| 中文标题 | Noto Sans SC，FS Noto Sans SC | 真正静态 600 子集 |
| 中文正文、描述 | 系统黑体，Windows 优先 Microsoft YaHei UI / YaHei | 400；强调沿用真实系统字重 |
| 日期、编号、eyebrow、代码 | Geist Mono，FS Geist Mono；中文后备系统黑体 | 元信息 400，标签 500 |

三个字体源均为已核验的 Fontsource 5.3.0 包，原字体采用 SIL Open Font License 1.1。生成时检查字重、变化轴、原始版权和字符覆盖；原文许可证复制到 dist/fonts/*-OFL.txt。西文保留 100–900 可变字重、Latin / Latin-ext 与原生斜体，浏览器按字符和样式请求需要的文件。

Noto 源可变字体的内部 family 是 Noto Sans SC Thin，内部名称沿用原字体。这不表示输出为 100 字重：生产文件固定 wght:600，验证 OS/2.usWeightClass === 600、没有变化轴，CSS 也只声明 600。浏览器通过站点别名 FS Noto Sans SC 选择它。

| 角色 | 变量 | 值 |
| --- | --- | --- |
| 页面、首页、文章、摄影主标题 | --text-page-title 及其别名 | clamp(2.75rem, 4.5vw, 4.5rem) |
| 区块标题，包括 Skills | --text-2xl 及其别名 | clamp(2rem, 3.2vw, 3.2rem) |
| 卡片标题 | --text-xl | clamp(1.5rem, 2.2vw, 2.2rem) |
| 导语 | --text-lg / --text-lead | clamp(1.125rem, 1.5vw, 1.375rem) |
| 正文与描述 | --text-base / --text-description | 1rem |
| 小字 | --text-sm / --text-xs | .875rem |
| 标签 | --text-2xs | .75rem |

node scripts/check-typography-scale.mjs 读取基础 CSS 和生产覆盖 CSS 的最终根变量，验证所有 clamp 参数和实际宽度，不依赖手填常量：

| 宽度 CSS px | 页面 h1 | 区块 h2 | 卡片 h3 | 导语 |
| ---: | ---: | ---: | ---: | ---: |
| 375 | 44 | 32 | 24 | 18 |
| 768 | 44 | 32 | 24 | 18 |
| 1024 | 46.08 | 32.77 | 24 | 18 |
| 1280 | 57.6 | 40.96 | 28.16 | 19.2 |
| 1440 | 64.8 | 46.08 | 31.68 | 21.6 |
| 1920 | 72 | 51.2 | 35.2 | 22 |

以 1rem = 16px 计算，所有相邻档在任何宽度的比例均至少 1.25。局部列表、照片组名、资源组名保留原来的较小字号，不因 HTML 标签为 h2/h3 而强行放大。

- 标题 600，西文字距 -.03em，中文字距 0；h1/h2 行高 1.25，h3/h4 为 1.3，保留中文 palt 和平衡换行。
- 正文、导语、描述、中英文章正文行高 1.7。
- 标签西文字距 .06em、中文 .02em；元信息为 --muted，保留 --ink / --copy-ink / --muted 三档文字层级。
- 中文界面的 Phil Carlos 保留西文负字距。文章正文按自身 lang 处理，切换界面语言不会把中文文章标题改成西文负字距。
- Skills 旧 display 标题会超过新页面主标题，已归到 h2 变量；摄影主标题归到页面标题变量。
- 旧衬线消费变量 --font-serif 在生产成为正文无衬线别名；保留摄影、轮播及交互布局逻辑。

### 中西文协调

预览中的全局 font-size-adjust: cap-height 0.72 用于方向比较。生产仅在西文 @font-face 使用 size-adjust：Geist 和 Geist Mono 的真实 unitsPerEm = 1000、capHeight = 710、xHeight = 530，目标 cap-height .72 对应 **101.40845%**，只微调约 1.4%。中文标题与系统中文正文保持原尺寸。

每个西文 face 的真实度量和计算值写入 manifest；不对整页施加 font-size-adjust，避免改变不同平台的系统中文正文。

## 构建与开发

生产覆盖位于 src/styles/typography.css，由 BaseLayout.astro 引入。共用 global.css / blog.css 和字体预览保持现状。新增源角色 --font-latin-body、--font-latin-heading、--font-cjk-heading；现有 heading / display / label / mono 变量消费这些源。

scripts/typography-integration.mjs 在 Astro build:done 阶段读取最终 HTML：

1. 收集 h1–h4、资源卡标题、伙伴姓名和照片数据中会进入灯箱的动态标题。隐藏的两种语言标题都纳入字符集合。
2. scripts/production-fonts.mjs 从现有 Noto 源切片中找出命中的字符，通过 subset-font@2.9.0 的 HarfBuzz WASM 实际裁字、固定 600。
3. 子集保留原始名称、版权、许可、OpenType 特性与字形闭包，不经过不能确认保留 GSUB/GPOS 的合并工具。文件有精确 unicode-range 和内容 hash 名。
4. 每页 head 注入本页字体声明；预载 Geist Latin normal 和当前语言 h1 命中的中文子集，其余按需加载。全部 font-display:swap，全部本地 URL。
5. 按源文件 hash、工具版本、算法版本、实际字符集缓存。缓存文件每次检查真实字形、字重与轴。构建只用仓库依赖和 Node/WASM，不依赖 Python、编译器或网络。

产物在 dist/fonts/，包括许可证与 manifest.json；审阅报告同时保存到 output/geist-adoption/fonts-report.json。新增或修改标题会在下一次构建自动更新；缺字明确中断构建。

开发模式用相同集成生成本地 development.css，使用内容 JSON、Markdown frontmatter/标题及源码静态文案的保守字集。开发字集比最终单页字集宽，仍仅进入标题字体栈。监听相关文件增删改并重新生成、刷新页面。缓存位于 node_modules/.cache/formulasearch-fonts/dev-assets/，不进入生产包。

内容 hash 的 WOFF2 在 Vercel 与本地构建服务器使用一年 immutable 缓存；HTML 和 manifest 不使用该长期缓存。

### 实际体积

| 页面 | 原始 Noto 命中切片合计 | 实际静态标题子集 |
| --- | ---: | ---: |
| /projects | 553.91 KiB | 21.17 KiB |
| /resources | 453.04 KiB | 13.84 KiB |
| /blog | 991.95 KiB | 65.27 KiB |
| 包豪斯文章 | 691.67 KiB | 27.14 KiB |

普通西文正文和元信息另需 Geist Latin normal 28.71 KiB + Geist Mono Latin normal 22.59 KiB，合计 **51.30 KiB**，全站共享缓存。Latin-ext 和原生斜体只有需要时额外请求。原始切片合计按本轮真实标题字集计算，仅作为对照，不是实际网络请求。

113 页共有 478 个去重 WOFF2，合计 1287.6 KiB；这是整个部署的资产，单页只声明和请求自己的子集。字集最大的博客归档中文子集 65.59 KiB。浏览器冷加载数据见 output/geist-adoption/screenshots.json。

## 验证与审阅

独立的 tests/production-typography.spec.mjs 保留现有交互和媒体测试：

- 1440 / 375 × 亮 / 暗 × 中文 / English，覆盖 11 个静态页面类型、项目/课程/建筑详情与真实中文文章，共 120 次页面检查。
- document.fonts 和 Chromium 字形接口共同证明家族和真实字重；标题字形无系统字体回退，中文正文仍系统，西文正文用 Geist，元信息用 Mono。
- 本地字体白名单、实际字节、冷加载预算。构建输出检查验证字体声明、预载及文件存在，防止预览的其他字体进入生产。
- 字体被延迟时后备仍可读；到达后标题真正换为子集，并检查窄屏布局。

375px 的 /projects 延迟字体样例记录到字体到达产生的 layout-shift 合计为 0，证据在 output/geist-adoption/delayed-layout.json；此结果仅对应这个样例。

已通过：npm run check（0 errors / 0 warnings / 2 个既有 hints）、npm run build（113 页）、npm run site:check（115 HTML）、npm run contrast:check、字体专项 10 项。

最终全站回归通过：npm run test:smoke -- --workers=1 --retries=1，190 passed / 5 既有 skipped，4.5 分钟。字体专项最终未触发重试。

已检查 1440px 与 375px、亮色与暗色：首页、项目、技能、资源、博客、包豪斯文章共 24 个视图，另有 4 张文章正文与 4 张资源全页图。无横向滚动或标题重叠。资源全页图先滚动加载懒加载图片再拍摄。截图在 output/playwright/geist-main-*.png，数据在 output/geist-adoption/screenshots.json。

实测字体冷加载：首页手机 28.71 KiB、首页桌面 51.30 KiB、项目 72.47 KiB、技能 53.68 KiB、资源 65.13 KiB、博客 116.56 KiB、包豪斯文章 78.44 KiB。所有请求都是本地内容 hash 字体；未请求原始 Noto 大切片或外部字体。

开发模式实际验证了新增字“霁”进入标题子集、加载真实 600 字形，删除临时页面后该字也从开发字集中移除；证据在 output/geist-adoption/development.json。临时测试页面已清理。

本轮新增 5 个文件、修改 11 个既有文件：

- 新增：src/styles/typography.css、scripts/production-fonts.mjs、scripts/typography-integration.mjs、tests/production-typography.spec.mjs、本说明。
- 修改：astro.config.mjs、src/layouts/BaseLayout.astro、package.json、package-lock.json、scripts/check-typography-scale.mjs、scripts/check-site-output.mjs、scripts/serve-dist.mjs、vercel.json，以及 refs/font-preview 的 README.md、direction-specifications.md、fonts-sources.md 中的生产边界说明。

接入阶段的初始快照中，1488 个其他 tracked 文件哈希保持一致，包括所有资源页改动；原有两项 R100 暂存重命名也保持一致。证据在 output/geist-adoption/scope-audit.json。后续提交与推送记录以 Git 历史为准。
