# 排印方向规格与验证

记录日期：2026-10-02。本文件保留选择前的方向规格、验收与体积估算；其中 `current` 是正式接入前的系统字体基准。方向定义以 `src/data/directions.ts` 为准，字体家族与入口以 `src/data/fonts.ts`、`src/scripts/font-loaders.ts` 和 [fonts-sources.md](./fonts-sources.md) 为准。主站已于 2026-10-03 采用 `tech` 方向，当前生产规格与实测体积见 [Geist 排印接入](../../docs/25_Geist排印接入.md)。

下表的像素值按 `1rem = 16px`、未开启大小协调、未使用高级覆盖计算。切换方向通过示例容器的 `data-direction` 和生产排印变量生效；真实示例沿用主站类名。

## 五个方向

| id / 名称 | 西文标题 | 西文正文 | 中文标题 | 中文正文 | 等宽 | 适用内容与标签风格 |
| --- | --- | --- | --- | --- | --- | --- |
| `current` 当前站点（基准） | 页面/卡片为现有无衬线栈；首页保留现有衬线栈 | 现有系统栈 | 系统字体 | 系统黑体 | 现有系统等宽栈 | 修正层级后的主站对照；`site-default`，保留主站标签样式 |
| `tech` 科技精致 · Geist | Geist Variable | Geist Variable | Noto Sans SC Variable 600 | 系统黑体 | Geist Mono Variable | Vercel / Linear 类简洁产品排印；日期、编号、eyebrow 使用等宽，`mono-uppercase` |
| `tech-inter` 科技精致 · Inter | Inter Variable，自动光学尺寸 | Inter Variable | Noto Sans SC Variable 600 | 系统黑体 | Geist Mono Variable | 与 Geist 使用同一阶梯，比较西文气质；`mono-uppercase` |
| `editorial` 编辑杂志 · 宋体 | Source Serif 4 Variable 600，自动光学尺寸 | 现有系统无衬线栈 | Noto Serif SC Variable 600 | 系统黑体 | 系统等宽，仅保留代码用途 | Pentagram / Kinfolk 类长文、作品叙述；`muted-plain` |
| `editorial-fangsong` 编辑杂志 · 仿宋 | Source Serif 4 Variable 400，自动光学尺寸 | 现有系统无衬线栈 | Zhuque Fangsong (technical preview) 400 | 系统黑体 | 系统等宽，仅保留代码用途 | 杂志阶梯与仿宋气质；`muted-plain`，中文使用真实 Regular，不合成粗体 |

系统栈来自生产 `:root`：

- 无衬线：`"Avenir Next", "Segoe UI Variable Text", "Segoe UI", "PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`。
- 衬线：`"Iowan Old Style", Georgia, "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", STSong, serif`。
- 等宽：`"Cascadia Code", "SF Mono", Consolas, "JetBrains Mono", monospace`。

实际系统字体文件取决于设备；当前预览不会下载系统字体。仿宋方向的西文与中文标题均为 400，这是方向数据里的明确选择。

## 字号与生产变量映射

`tech-inter` 与 `tech` 共用 `techScale`；`editorial-fangsong` 与 `editorial` 共用 `editorialScale`，不是另建一套字号。

| 数据角色 | 覆盖的生产变量（非 current） | current | tech / tech-inter | editorial / editorial-fangsong |
| --- | --- | --- | --- | --- |
| `pageTitle` | `--text-home-title`、`--text-page-title`、`--text-article-title` | `clamp(2.75rem, 3.5vw, 3.5rem)` | `clamp(2.75rem, 4.5vw, 4.5rem)` | `clamp(3rem, 5.5vw, 5.5rem)` |
| `h2` | `--text-feature-title`、`--text-2xl` | `clamp(2rem, 2.5vw, 2.5rem)` | `clamp(2rem, 3.2vw, 3.2rem)` | `clamp(2rem, 3.5vw, 3.5rem)` |
| `h3` | `--text-xl` | `clamp(1.5rem, 1.875vw, 1.875rem)` | `clamp(1.5rem, 2.2vw, 2.2rem)` | `clamp(1.5rem, 2.25vw, 2.25rem)` |
| `lead` | `--text-lg`、`--text-lead` | `clamp(1.125rem, 1.4vw, 1.4rem)` | `clamp(1.125rem, 1.5vw, 1.375rem)` | `clamp(1.1875rem, 1.75vw, 1.5rem)` |
| `body` | `--text-description`、`--text-base` | `clamp(1.0625rem, 1.2vw, 1.1875rem)` | `1rem` | `1.0625rem` |
| `small` | `--text-sm`、`--text-xs` | `.875rem` | `.875rem` | `.875rem` |
| `label` | `--text-2xs` | `.75rem` | `.75rem` | `.8125rem` |

`current` 保留生产字号、行高、字距和颜色，不把这张映射表整体覆盖回主站。其 `body` 对应描述/文章正文的 `--text-description`，不是所有界面文字的字号。界面基础字仍为 `--text-base: 1rem`；小字 `--text-xs` 仍是 `.8125rem`。首页也保留独立的 `--text-home-title: clamp(3.25rem, 5.7vw, 5.5rem)`，不会缩成页面主标题。

| 方向 / 宽度 | 页面主标题 | h2 | 卡片 h3 | 导语 | 描述/文章正文 | 小字 | 标签 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| current / 1440 | 50.4 | 36 | 27 | 20.16 | 17.28 | 14 | 12 |
| tech / 1440 | 64.8 | 46.08 | 31.68 | 21.6 | 16 | 14 | 12 |
| tech-inter / 1440 | 64.8 | 46.08 | 31.68 | 21.6 | 16 | 14 | 12 |
| editorial / 1440 | 79.2 | 50.4 | 32.4 | 24 | 17 | 14 | 13 |
| editorial-fangsong / 1440 | 79.2 | 50.4 | 32.4 | 24 | 17 | 14 | 13 |
| current / 375 | 44 | 32 | 24 | 18 | 17 | 14 | 12 |
| tech / 375 | 44 | 32 | 24 | 18 | 16 | 14 | 12 |
| tech-inter / 375 | 44 | 32 | 24 | 18 | 16 | 14 | 12 |
| editorial / 375 | 48 | 32 | 24 | 19 | 17 | 14 | 13 |
| editorial-fangsong / 375 | 48 | 32 | 24 | 19 | 17 | 14 | 13 |

单位为 CSS px。current 首页 h1 在 1440px 为 82.08px，在 375px 为 52px；其余方向首页 h1 使用相应 `pageTitle`。

## 字重、字距、行高与标签

| 方向 | 西文/中文标题字重 | 正文 / 标签 / 元信息 | 西文标题字距 | 中文标题字距 | 西文标签字距 | 大标题行高 | 文章正文行高 | labelStyle |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| current | 600 / 600；首页英文 display 400 | 400 / 600 / 400 | `-.04em` | `0` | `.08em` | 中文 1.25；西文保留生产 1.05 | 中文 1.82；英文 1.65 | `site-default` |
| tech | 600 / 600 | 400 / 500 / 400 | `-.03em` | `0` | `.06em` | 1.25 | 1.7 | `mono-uppercase` |
| tech-inter | 600 / 600 | 400 / 500 / 400 | `-.03em` | `0` | `.06em` | 1.25 | 1.7 | `mono-uppercase` |
| editorial | 600 / 600 | 400 / 400 / 400 | `-.025em` | `0` | `0` | 1.25 | 1.8 | `muted-plain` |
| editorial-fangsong | 400 / 400 | 400 / 400 / 400 | `-.025em` | `0` | `0` | 1.25 | 1.8 | `muted-plain` |

所有方向的 h3 使用行高 1.3。中文标题保留 `font-feature-settings: "palt"` 与 `text-wrap: balance`。current 中文标签字距 `.02em`；科技方向中文标签也为 `.02em`，编辑方向为 `0`。字体合成在预览中关闭，不能用不存在的字重补齐选项。

博客标题的实际消费也已绑定共享变量：英文博客 hero、文章 h1 与 h2 使用 `--leading-heading`，文章 h3/h4 使用 `--leading-subheading`，生产基准分别为 1.05 / 1.3；中文再使用对应 CJK 变量覆盖为 1.25 / 1.3。旧声明中的 `.article-header h1: 1.02`、正文标题 `1.22` 不再决定最终样式。非 current 方向的英文大标题与 h2 因此也随方向变为 1.25，不会被旧常量挡住。

中文页面里的首页姓名 `Phil Carlos` 是纯西文。非 current 方向在这个 h1 的局部作用域，将 `--tracking-cjk-heading` 绑定到 `--tracking-heading`，并标记 `lang="en"`：tech / tech-inter 为 `-.03em`，editorial / editorial-fangsong 为 `-.025em`。其余中文标题仍为 0。current 保留生产站点在中文环境下姓名字距为 0 的实际基准；英文页面仍使用生产负字距。

current 还保留界面行高 1.6、导语 1.7、首页英文段落 1.72、首页中文段落 1.8、介绍描述 1.75。`leading.body: 1.82` 描述的是 current 的中文文章阅读角色；不是对整页行高统一覆盖。非 current 的方向把界面、导语、首页段落、文章和描述绑定到各方向的 `leading.body`。

科技方向的日期/编号/eyebrow 使用 Geist Mono、转为大写，颜色为 `--muted`；中文字符由系统黑体提供。编辑方向标签为系统无衬线、`--muted`、不转大写、不增加字距。current 的主站 eyebrow 保留强调色与原大写规则。

## 第一部分：主站标题阶梯

生产阶梯为：

```css
--text-page-title: clamp(2.75rem, 3.5vw, 3.5rem);
--text-2xl: clamp(2rem, 2.5vw, 2.5rem);
--text-xl: clamp(1.5rem, 1.875vw, 1.875rem);
--text-lg: clamp(1.125rem, 1.4vw, 1.4rem);
```

| 视口宽度 | page-title | 2xl | xl | lg | page / 2xl | 2xl / xl | xl / lg |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 375 | 44 | 32 | 24 | 18 | 1.38 | 1.33 | 1.33 |
| 768 | 44 | 32 | 24 | 18 | 1.38 | 1.33 | 1.33 |
| 1024 | 44 | 32 | 24 | 18 | 1.38 | 1.33 | 1.33 |
| 1280 | 44.8 | 32 | 24 | 18 | 1.40 | 1.33 | 1.33 |
| 1440 | 50.4 | 36 | 27 | 20.16 | 1.40 | 1.33 | 1.34 |
| 1920 | 56 | 40 | 30 | 22.4 | 1.40 | 1.33 | 1.34 |

运行 `node scripts/check-typography-scale.mjs` 可从生产 CSS 重新打印。检查除六个样本宽度外，还验证相邻 clamp 的最小值、流动系数、最大值分别满足比例 ≥ 1.25；由 min/max 的单调性可证明其他宽度也不会撞车或倒挂。表内比值显示到两位小数。

页面/文章标题使用 page-title；区块标题使用 2xl；项目卡片使用 xl。博客中曾将 article-title 用于 h2 的系列、年份、精选和封面区块已归回 2xl。

### 墨色与元信息选择器

标题/正文使用 `--ink`，介绍/描述使用 `--copy-ink`，日期、计数和其他元信息使用 `--muted`。强调标签由 `--label-ink` 管理，按钮保留自己的状态样式。

原 500 的次要信息改为 muted / 400：

- `.skill-feature__facts dd`
- `.archive-record figcaption strong`

原 600 的元信息改为 muted / 400：

- `.project-card__meta`
- `.project-showcase__copy p`
- `.project-detail__meta`
- `.project-detail__experiment-tag`
- `.post-row__meta`
- `.article-meta`
- `.article-related__meta`

计数、事实名称和位置等原本为 400 的元信息也绑定 `--weight-meta`。其中 `.project-detail__carousel-count` 从 ink 改为 muted，`.photo-lightbox__index` 从 accent 改为 muted。标题名称、标签和按钮不会因为使用 500 就被归入次要信息。

以下博客摘要、项目实验说明与图片说明从 `--muted` 改为 `--copy-ink`，归入描述层级；仅调整颜色，字重和数据不变：

- `.featured-post__summary`
- `.cover-stage__summary`
- `.post-row__summary`
- `.article-related__description`
- `.project-detail__experiment-copy > p:not(.project-detail__experiment-tag)`
- `.photo-lightbox__caption`

## 已补生产角色与未来采用方向的工作

第一部分已经补齐并绑定实际组件：

| 角色 | 生产变量 |
| --- | --- |
| 字体 | `--font-heading`、`--font-display`、`--font-label` |
| 字重 | `--weight-heading`、`--weight-cjk-heading`、`--weight-display`、`--weight-body`、`--weight-label`、`--weight-meta` |
| 字距 | `--tracking-heading`、`--tracking-cjk-heading`、`--tracking-cjk-label`，并沿用 `--tracking-label` |
| 行高 | `--leading-heading`、`--leading-subheading`、`--leading-cjk-heading`、`--leading-cjk-subheading`、`--leading-body`、`--leading-lead`、`--leading-home-copy`、`--leading-home-copy-zh`、`--leading-article-body`、`--leading-article-body-en`、`--leading-description` |
| 导语与标签 | `--text-lead`、`--label-transform`、`--label-ink` |

预览已能表达五个方向；如果正式采用某个方向，建议再补以下可维护的组合接口：

- `--font-latin-body`：独立指定西文正文家族。
- `--font-latin-heading`：独立指定西文标题家族。
- `--font-cjk-heading`：独立指定中文标题家族，继续用现有 `--font-cjk-sans` 作为中文正文来源。
- `--font-size-adjust-heading`、`--font-size-adjust-body`：默认 `none`，在标题和阅读正文的消费处绑定 `font-size-adjust`，避免把全页协调参数直接写成内联值。必要时为标签另设 `--font-size-adjust-label`。

CSS 自定义属性的别名会在定义作用域完成计算；在子容器只改中文字体变量，已经从根节点继承的组合字体栈不会自动重新拼接。正式接入应在实际消费处组合字体，或在方向作用域一起重建 `--font-heading`、`--font-display`、`--font-sans`、`--font-label`。目前预览的 `apply()` 已显式重建这些角色，没有另写一套平行字号规则。

纯预览布局仅调整样例容器位置。A/B 窄栏中的项目 hero 使用单列，description 显式放回 `grid-column: 1` 并左对齐，避免继承生产双列定位后生成隐式第二列、把「项目」挤成竖排。项目区块标题与卡片同样按窄栏重排；不改变方向字号。

### 大小协调与光学尺寸

本轮选择可直接开关比较的 `font-size-adjust: cap-height 0.72`，默认关闭；通过 `CSS.supports()` 检查浏览器能力。它会调整使用字形的视觉大小，规格表的 CSS 字号仍保持原阶梯。这个参数作用于示例容器中继承该属性的字体，不能宣称只调整西文字形。

自定义 `@font-face` 的 `size-adjust` 可以只调整指定西文家族，但需要额外维护切片源、字重、原生斜体和 `unicode-range`；留待选定方向后与生产子集构建一起确定。上述建议的 token 对应 `font-size-adjust` 属性；若采用 `@font-face size-adjust`，应把比例存入字体构建配置，不把它当成逐元素可继承的 CSS 变量。

Inter 使用真实 `standard.css` / `standard-italic.css` 入口，`opsz` 14–32；Source Serif 4 对应 `opsz` 8–60，预览使用 `font-optical-sizing: auto`。Geist / Geist Mono 没有光学尺寸轴。超出轴上限的标题不会继续增大 `opsz`。

正式采用时还需生成并校验选定中文标题的子集、确认西文家族及字重、保留字体版权与许可证、测量页面加载与缓存；本轮没有向生产页面添加网页字体。

## 接入字体、来源与授权

九个网页字体包仅为开发依赖；系统基准无 npm 字体包。下表版本、真实 family 和授权来自本轮 `npm view`、`npm pack --ignore-scripts` 及原始授权核验。

| 字体 / 版本包 | 实际 family | 可用字重 | 官方来源 | 字体许可 |
| --- | --- | --- | --- | --- |
| `@fontsource-variable/noto-sans-sc@5.3.0` | Noto Sans SC Variable | 100–900 | [Noto CJK](https://github.com/notofonts/noto-cjk) | [OFL 1.1](https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE) |
| `@fontsource-variable/noto-serif-sc@5.3.0` | Noto Serif SC Variable | 200–900 | [Noto CJK](https://github.com/notofonts/noto-cjk) | [OFL 1.1](https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE) |
| `@chinese-fonts/zqfs@3.0.0` | Zhuque Fangsong (technical preview) | 400 | [朱雀仿宋](https://github.com/TrionesType/zhuque) | [OFL 1.1](https://github.com/TrionesType/zhuque/blob/main/LICENSE.txt) |
| `@chinese-fonts/lxgwwenkai@3.0.0` | LXGW WenKai | 400，本轮 Regular | [霞鹜文楷](https://github.com/lxgw/LxgwWenKai) | [OFL 1.1](https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt) |
| `@chinese-fonts/dyh@3.0.0` | Smiley Sans Oblique | 400，仅标题 | [得意黑](https://github.com/atelier-anchor/smiley-sans) | [OFL 1.1](https://github.com/atelier-anchor/smiley-sans/blob/main/LICENSE) |
| `@fontsource-variable/geist@5.3.0` | Geist Variable | 100–900 | [Geist](https://github.com/vercel/geist-font) | [OFL 1.1](https://github.com/vercel/geist-font/blob/main/OFL.txt) |
| `@fontsource-variable/inter@5.3.0` | Inter Variable | 100–900 | [Inter](https://github.com/rsms/inter) | [OFL 1.1](https://github.com/rsms/inter/blob/master/LICENSE.txt) |
| `@fontsource-variable/source-serif-4@5.3.0` | Source Serif 4 Variable | 200–900 | [Source Serif](https://github.com/adobe-fonts/source-serif) | [OFL 1.1](https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md) |
| `@fontsource-variable/geist-mono@5.3.0` | Geist Mono Variable | 100–900 | [Geist](https://github.com/vercel/geist-font) | [OFL 1.1](https://github.com/vercel/geist-font/blob/main/OFL.txt) |

文楷和得意黑保留在高级覆盖中，五个默认方向没有使用它们。`@chinese-fonts` 打包工程标注的 MIT 不替代字体本身的 OFL。准确 CSS 入口、切片数量、光学轴核验及授权细节见 [fonts-sources.md](./fonts-sources.md)； npm 归档证据在 `output/font-research/`。

MiSans 与 HarmonyOS Sans SC 已重新核验官方许可和真实候选包，仍跳过：官方协议限制字体改编，第三方切片包的工程 License 不能证明获得了原字体修改/再分发许可；已取得的官方原始文件也没有可直接导入的官方 npm CSS 入口。具体候选包、官方来源、协议条款与 MiSans PDF 校验值记录于 `fonts-sources.md`，没有使用猜测的包名或 CDN 地址。

## 单页字体下载估算

估算证据：`output/direction-font-size-estimates.json`；重算命令：`node --experimental-strip-types output/estimate-direction-fonts.mjs`。本节估计未来采用方向的字体载荷，当前生产页面实测字体下载为 0。

### 方法与范围

从已构建的 `/projects` 和 `/blog/prompt-aesthetic-2026-06-19` 读取全部 h1/h2/h3，排除隐藏 English 子树及 script/style/svg 文本。项目页 21 个标题、80 个独立中文/全角字符；包豪斯文章页 24 个标题、110 个字符。

按字体真实正常字重选择所有与字符集合相交的 `unicode-range`，对不同 WOFF2 路径去重后读取实际文件字节数。Noto 的 400 与 600 共用可变切片，不重复计费；朱雀只计真实 400。西文按每个家族一个核心 Latin 正常文件计；中文正文保持系统字体。

这是选中现有切片文件的精确字节之和，不是部署后的 Resource Timing 实测，也不是定制子集产物。它包含切片里页面未用的字符，未计 CSS/HTTP 头/Latin-ext/斜体等额外载荷；实际请求还受可见性、缓存、预加载和字符后备影响。原文件 SHA-256 与每个切片的匹配字符保留在 JSON 中。

| 中文标题字体 | 项目页切片 / bytes | 包豪斯文章页切片 / bytes |
| --- | ---: | ---: |
| Noto Sans SC | 10 / 567,208 | 12 / 708,268 |
| Noto Serif SC | 10 / 731,032 | 12 / 918,044 |
| 朱雀仿宋 400 | 19 / 618,712 | 19 / 608,996 |

| 西文正常字体组合 | 精确 bytes | KiB |
| --- | ---: | ---: |
| Geist + Geist Mono | 52,528 | 51.30 |
| Inter（含 opsz）+ Geist Mono | 96,048 | 93.80 |
| Source Serif 4（含 opsz） | 122,360 | 119.49 |

### 每个方向的现有切片方案

| 方向 | 项目页总 bytes / KiB | 包豪斯文章页总 bytes / KiB |
| --- | ---: | ---: |
| current | 0 / 0 | 0 / 0 |
| tech | 619,736 / 605.21 | 760,796 / 742.96 |
| tech-inter | 663,256 / 647.71 | 804,316 / 785.46 |
| editorial | 853,392 / 833.39 | 1,040,404 / 1,016.02 |
| editorial-fangsong | 741,072 / 723.70 | 731,356 / 714.21 |

单位 `KiB = bytes / 1024`。两页数字分别计算，不能相加当成同一页面下载量；跨页访问时共享切片可能命中缓存。

### 构建时标题子集方案：未实测的预算区间

本轮未安装新的子集工具、未生成 FontTools/Brotli 子集文件。JSON 给单个中文正常静态字重保守预算 30–120 KiB，两套独立 400/600 字重为 60–240 KiB；字形轮廓、排版表、依赖字形和可变轴保留策略都可能使实际结果落在区间外。

下表针对上述两页各自的标题字符集，按一个中文标题静态字重加已经测量的西文正常核心组合计算，仅用于方案预算：

| 方向 | 标题构建时子集方案的单页预算 KiB |
| --- | ---: |
| current | 0 |
| tech | 81.30–171.30 |
| tech-inter | 123.80–213.80 |
| editorial | 149.49–239.49 |
| editorial-fangsong | 149.49–239.49 |

这些预算不是已生成文件的尺寸，也不等于浏览器实测下载。正式选择方向后，应生成真实子集并用完整页面、缓存和字形覆盖重新测量。

## 验证与截图证据

第一部分独立提交：`6a47893`（`Fix title hierarchy and Chinese typography roles`）。

| 验收 | 结果 / 证据 |
| --- | --- |
| `npm run check` | 最终复测 0 errors / 0 warnings / 2 既有 hints；`output/direction-final-check.log` |
| `npm run build` | 最终复测 113 pages，通过；`output/direction-final-smoke-complete.log` 的 pretest 构建记录 |
| `npm run site:check` | 最终复测通过；`output/direction-final-site-check.log` |
| `npm run contrast:check` | 最终复测通过；`output/direction-final-contrast.log` |
| `npm run test:smoke -- --workers=1 --retries=1` | 独立 4335；最终完整复测 180 passed / 5 skipped，3.8 分钟；无失败、未触发重试；`output/direction-final-smoke-complete.log` |
| 六宽度阶梯检查 | 通过；`output/direction-phase1-validation/scale.log` |
| 1440 / 375 生产页面视觉检查 | 六布局无横向滚动、标题碰撞或裁切；0 网页字体请求；`output/direction-phase1-validation/screenshots.json` |
| 生产构建隔离 | `dist` 无字体文件、无 font-preview 路由 |

首次并行复测遇到旧截图文件 EPERM 与画布环境失败，改为单进程复测后通过。描述墨色补齐后的中间一轮出现既有缩放动画截图时序波动；最终完整一轮全部通过，未放宽断言或修改动画代码。

第一部分截图均已实际打开检查，存放于 `output/playwright/`：

| 页面 | 1440px 亮色 | 375px 亮色 |
| --- | --- | --- |
| 项目 | `direction-main-projects-1440-light.png` | `direction-main-projects-375-light.png` |
| 博客列表 | `direction-main-blog-1440-light.png` | `direction-main-blog-375-light.png` |
| 包豪斯文章首屏 | `direction-main-article-1440-light.png` | `direction-main-article-375-light.png` |
| 包豪斯文章正文 | `direction-main-article-prose-1440-light.png` | `direction-main-article-prose-375-light.png` |

第二部分全矩阵验证已通过：`output/direction-preview-validation.json` 的 `passed: true`、`failures: []`。启动验证在 `output/direction-preview-startup.json`。字体验证同时检查已加载的 `document.fonts`、计算样式与 CDP 实际字形字体，避免只声明 family 却使用后备字体。

| 验收 | 结果 / 证据 |
| --- | --- |
| `npm run fonts:preview` | 独立预览在 4332 启动；启动报告状态 `ready`、0 failures |
| 五方向字体真实加载 | 30 个字形样本全部通过；系统基准使用本机字体，其余方向的西文/中文标题使用预期网页字体 |
| 西文原生斜体 | 4 个方向样本全部通过；Geist、Inter，以及两个编辑方向的 Source Serif 4 均加载原生斜体 |
| 方向切换、A/B 与移动端 | 方向、URL、分屏同步滚动、900px 以下 A/B 切换、375px 布局通过 |
| 高级覆盖与大小协调 | 单项字体/字重覆盖、`font-size-adjust` 开关、URL 刷新恢复通过 |
| 标题字距与行高最终复测 | `output/direction-preview-leading.json`：五方向 × 中文/英文共 10 cases、0 failures；实际测量首页字距、正文/导语行高、文章 h1/h2/h3 与博客列表 h2。current 中文姓名字距 0、英文 `-.04em`，科技两方向 `-.03em`、编辑两方向 `-.025em`；current 英文大标题/h2 为 1.05、h3 为 1.3，非 current 为 1.25 / 1.3；首页与导语保持各方向前述规格 |
| A/B 项目 hero 定位最终复测 | `output/direction-preview-project-placement.json`：两侧「项目」均为 1 行，description 位于第 1 列、pane 无溢出，截图检查通过 |
| 视觉证据 | 18 张截图；五方向 1440px 亮色、tech/editorial 1440px 深色分屏、tech 375px 亮/暗色，均无横向滚动 |

本轮新增 `--leading-home-copy-zh`，生产默认仍为 1.8；科技方向覆盖为 1.7，编辑方向覆盖为 1.8，中文首页段落与各方向正文行高同步。

### 预览多样例的实际冷加载量

下表来自报告的 `coldRenderTotals.encodedBodySize`，按 1024 换算 KiB；对请求 URL 去重，不含 HTTP 头和额外字形验证触发的下载。

| 方向 | 冷加载字体 KiB |
| --- | ---: |
| current | 0 |
| tech | 627.65 |
| tech-inter | 670.15 |
| editorial | 863.05 |
| editorial-fangsong | 727.33 |

这些是独立预览同时呈现首页、项目、博客列表、文章正文、导航等多类样例的实际字体载荷，不代表将来任一生产页面的单页下载量；生产单页估算应使用前述标题字符集与切片/子集方案。

方向截图路径使用 `output/playwright/direction-preview-<direction>-1440-light-{viewport,projects}.png`，覆盖五个方向；科技/编辑深色分屏为 `direction-preview-tech-editorial-1440-dark-ab-{top,projects}.png`；科技 375px 为 `direction-preview-tech-375-{light,dark}-{viewport,projects}.png`。

预览启动命令：`npm run fonts:preview`，端口 4332。建议对比 URL：`http://localhost:4332/?direction=tech&directionB=editorial&compare=1&theme=dark&locale=zh`。900px 以下通过 A/B 切换查看；高级字体覆盖与大小协调可单独开关。
