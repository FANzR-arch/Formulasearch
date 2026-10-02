# 排印方向对比

独立开发工具，复用主站 global.css、blog.css 和真实内容，生产仍使用系统字体。

```sh
npm run fonts:preview
```

打开 <http://localhost:4332/>。推荐先看 [Geist 与编辑杂志的深色 A/B](http://localhost:4332/?direction=tech&directionB=editorial&compare=1&theme=dark&locale=zh)。方向会同时替换中西文字体搭配、字号阶梯、字重、字距、行高和标签角色；切换西文字体后，首页 Phil Carlos 也会变化。

- 方向 A/B 可独立选择。桌面两栏按各自全文的滚动比例同步；900px 以下用 A/B 按钮切换同一套样例。
- 高级折叠区保留中文标题、正文和字重的独立覆盖，仅影响 A。随方向表示无覆盖；选择不支持的字重会自动回到随方向，不用合成粗体。
- 控件底部始终显示中文即时样例；English 模式也能看出中文标题和正文的独立变化。
- URL 保存 direction、directionB、compare、theme、locale、heading、body、weight、adjust、pane；刷新可恢复。
- 规格表显示当前视口的实际字号、角色字体、实际支持的字重及 Resource Timing 字体下载统计。统计是当前页面累计；切换过方向后缓存仍计入。若浏览器未提供大小，显示不可用，不把零误报为无下载。

大小协调开关使用原生 `font-size-adjust: cap-height 0.72`。它能直接覆盖整套字体栈并保留已有 unicode-range 切片和 Inter / Source Serif 4 的 optical sizing。另包 @font-face 的 size-adjust 需要复制每段来源与覆盖范围，容易漂移，本次未采用。cap-height 是比较实验而非通用的最佳值，正式采用前仍需逐家族视觉校准；不支持的浏览器明确报错。`font-synthesis: none` 避免给只有 Regular 的朱雀仿宋、文楷、得意黑伪造粗体。

## 结构

- src/data/directions.ts：五个完整方向和变量值。
- src/data/fonts.ts、src/scripts/font-loaders.ts：已核验字体与按需导入。
- src/scripts/preview.ts：方向到主站变量的映射、字体验证、A/B、URL 和规格统计。
- src/components/Specimens.astro、samples.ts、ProjectCard.astro：真实导航、首页、项目组、博客行与正文；实例前缀避免 A/B 重复锚点。
- src/styles/preview.css：工具控件与样例摆放。字号和字体角色由主站样式消费，不复制一套页面排印规则。
- fonts-sources.md：包、入口、字体轴、原字体许可与跳过依据。
- direction-specifications.md：完整规格、验收和正式采用的体积估算。

方向容器显式重组 font-sans / font-serif / heading / display / label：根节点已计算的自定义变量不会因子容器改中文字体而自动重新计算。这是独立控制真正生效的必要绑定。

## 生产边界

全部字体仅为 devDependencies，导入仅存在 refs/font-preview。主站构建不包含本预览，也不复制 node_modules 字体。运行 npm run build 与 npm run site:check 后，检查 dist 无预览页面和 woff / woff2 / ttf / otf 文件。
