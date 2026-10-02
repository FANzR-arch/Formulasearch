# 中文字体预览

只在开发时运行的字体对比工具。独立 Astro root 为 `refs/font-preview`；主站构建不导入预览代码或字体 CSS，候选字体仅在根项目 `devDependencies` 中安装，不复制到 `public/`。

从仓库根目录启动：

```sh
npm install
npm run fonts:preview
```

打开 <http://localhost:4332/>。标题与正文可以分别选中文字体，选择会即时保存到 URL，复制地址或刷新可恢复字体、字重、主题、语言和并排视图。400 / 500 / 600 / 700 中不受标题字体支持的档位会禁用。得意黑只出现在标题选项中；并排视图中它的正文保留系统字体。

加载状态必须显示「已验证当前字体」才算切换完成；失败会显示错误。动态 CSS 导入后，工具逐个检查 `document.fonts.load()` 返回的 FontFace 确实为 `loaded`，同时检查 `document.fonts.check()`。系统字体没有可下载的 FontFace，沿用生产字体栈作为基准。

## 与生产样式的关系

直接导入主站 `src/styles/global.css` 和 `src/styles/blog.css`，复用真实类名、Lucide Icon、ThemeImage 和真实内容。预览专用 ProjectCard 适配独立 Astro root 的相对图片 glob，markup 与生产卡片一致。首页内容来自 `home-content`；项目页和三张项目卡来自 catalog；博客选段来自包豪斯文章。`samples.ts` 记录文字来源，以及仅预览时为演示 h3 / inline code 作的语义标记。

切换只覆盖第一阶段拆出的 CJK 角色变量和标题字重变量。标题与正文的 scope 分别重新组合 `--font-sans` / `--font-serif`，保留原有西文字体前缀。预览没有为样例另写字号、字距、行高或新的字体栈；`preview.css` 安排工具控制面板、样例摆放和变量作用域。原本继承生产 body 字体的样例容器与项目卡 h3，在预览里绑定同一个 `--font-sans` token：CSS 继承的是祖先已经计算完的字体字符串，单改后代变量不会重新计算这个继承值。

## 来源、授权和下载量

实际包版本、CSS 入口、字体家族、可用字重、官方来源和许可链接见 [fonts-sources.md](./fonts-sources.md)。当前接入 Noto Serif SC、Noto Sans SC、朱雀仿宋、霞鹜文楷、得意黑，均为 OFL 1.1。MiSans 和 HarmonyOS Sans SC 的官方协议限制字体改编，未核实到第三方切片包的相应授权，本次跳过。

字体信息栏以 Performance Resource Timing 统计本次页面累计实际加载的切片；切换后不会把已下载的字形清零。KiB 是字体文件 `encodedBodySize`，必要时回退到 `transferSize`，不计 CSS 和图片。并排对比会加载全部候选，下载量会增加。

2026-10-02 冷缓存实测，本页真实样例全文的中英字符经过加载校验后，字体文件下载量如下。该样本同时覆盖标题与正文；它不是只含首页标题的最小子集，生产采用字体后需针对实际页面再测。

| 字体 | 实际请求切片 | 字体文件大小 |
| --- | ---: | ---: |
| 系统字体 | 0 | 0 KiB |
| Noto Serif SC | 17 | 1,215.8 KiB |
| Noto Sans SC | 17 | 938.1 KiB |
| 朱雀仿宋 | 32 | 1,174.3 KiB |
| 霞鹜文楷 | 24 | 818.3 KiB |
| 得意黑 | 17 | 472.1 KiB |

本地验证报告为 `output/font-preview-validation.json`。截图位于 `output/playwright/font-preview-{system|serif-system|wenkai-body}-{light|dark}.png`，分别是系统基准、宋体标题与系统正文、文楷正文的亮暗两版；另有 375px 响应式证据。`output/` 不提交。

## 文件

- `src/data/fonts.ts`：实际字体来源、许可、角色和字重。
- `src/scripts/font-loaders.ts`：独立应用的动态字体 CSS 入口。
- `src/scripts/preview.ts`：变量切换、字体加载校验、URL 状态和下载量。
- `src/components/Specimens.astro` / `samples.ts`：生产内容样例。
- `src/pages/index.astro` / `src/styles/preview.css`：工具界面和样例容器。

选定字体后，需要另行实施生产字体交付；本工具中的选择不会修改主站字体。
