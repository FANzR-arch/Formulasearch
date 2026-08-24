# Formulasearch icon system

生产页面的功能图标和自定义鼠标都从这里取用。`icons.ts` 是唯一注册表，`Icon.astro` 是唯一业务调用接口；业务组件不应直接导入 `@lucide/astro`，也不应覆盖图标尺寸或描边。

## 规格

- `meta`: 14px
- `control`: 18px
- `cursor`: 20px glyph，36px 光学圆环外壳
- 所有图标使用 1.75 描边、圆端点、圆连接和 `currentColor`

当前注册表包含 24 个语义名称，对应原有 19 种 Lucide 图标并新增 `Highlighter`、`Circle`（共 21 种）；重复使用的 `Plus`、`X` 等仍以不同语义名称管理。鼠标包含 10 个状态：普通、链接与控件、文字输入、照片导航、高亮、胶囊、媒体预览、打开照片、缩小照片、关闭查看器。

品牌 Logo、GitHub 官方标志、开场动画/博客装饰 SVG 和文章 Emoji 不属于功能图标系统，继续使用原有官方资源或装饰实现。
