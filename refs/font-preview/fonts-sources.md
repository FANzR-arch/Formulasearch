# 字体预览：来源与授权

核验日期：2026-10-02。此清单记录 `refs/font-preview/` 独立本地预览的全部字体选项。主站已采用选定的 Geist、Geist Mono 与 Noto Sans SC 标题子集，生产集成见 [Geist 排印接入](../../docs/25_Geist排印接入.md)。字体包由根项目的 `devDependencies` 提供，字体二进制文件不提交到仓库。选项中的「来源」链接指向字体作者的官方仓库。

核验方式：读取 npm 当前版本信息，使用 `npm pack --ignore-scripts` 检查固定版本归档里的 CSS、字体家族名、字重和切片声明；原字体授权另从作者或官方仓库读取。未执行下载包中的脚本。浏览器实际加载结果由预览验证报告记录，不能仅凭 CSS family 或 `document.fonts.check()` 声称字体已经加载。

## 可选字体

系统基准、5 款中文网页字体和 4 款西文网页字体组成当前预览选项。下表的字重取自实际 `@font-face`，不以浏览器合成粗体补齐缺失字重。西文字体不含中文；组合预览应给中文指定独立的中文字体。

| 显示名称 | 固定 npm 包 | 实际 `font-family` | 实际字重 | 预览角色 | 原字体授权 |
| --- | --- | --- | --- | --- | --- |
| 系统字体（基准） | 无 | 沿用网站的系统字体栈 | 400 / 500 / 600 / 700，由设备决定实际文件 | 标题、正文 | 由操作系统或本机已安装字体提供，无网页字体下载 |
| Noto Serif SC | `@fontsource-variable/noto-serif-sc@5.3.0` | `Noto Serif SC Variable` | 可变范围 200–900 | 标题、正文 | [SIL OFL 1.1](https://github.com/notofonts/noto-cjk/blob/main/Serif/LICENSE) |
| Noto Sans SC | `@fontsource-variable/noto-sans-sc@5.3.0` | `Noto Sans SC Variable` | 可变范围 100–900 | 标题、正文 | [SIL OFL 1.1](https://github.com/notofonts/noto-cjk/blob/main/Sans/LICENSE) |
| 朱雀仿宋 | `@chinese-fonts/zqfs@3.0.0` | `Zhuque Fangsong (technical preview)` | 400 | 标题、正文 | [SIL OFL 1.1](https://github.com/TrionesType/zhuque/blob/main/LICENSE.txt) |
| 霞鹜文楷 | `@chinese-fonts/lxgwwenkai@3.0.0` | `LXGW WenKai` | 400（本次导入 Regular） | 标题、正文 | [SIL OFL 1.1](https://github.com/lxgw/LxgwWenKai/blob/main/OFL.txt) |
| 得意黑 | `@chinese-fonts/dyh@3.0.0` | `Smiley Sans Oblique` | 400 | 仅标题 | [SIL OFL 1.1](https://github.com/atelier-anchor/smiley-sans/blob/main/LICENSE) |
| Geist | `@fontsource-variable/geist@5.3.0` | `Geist Variable` | 可变范围 100–900 | 西文标题、正文 | [SIL OFL 1.1](https://github.com/vercel/geist-font/blob/main/OFL.txt) |
| Inter | `@fontsource-variable/inter@5.3.0` | `Inter Variable` | 可变范围 100–900 | 西文标题、正文 | [SIL OFL 1.1](https://github.com/rsms/inter/blob/master/LICENSE.txt) |
| Source Serif 4 | `@fontsource-variable/source-serif-4@5.3.0` | `Source Serif 4 Variable` | 可变范围 200–900 | 西文标题、正文 | [SIL OFL 1.1](https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md) |
| Geist Mono | `@fontsource-variable/geist-mono@5.3.0` | `Geist Mono Variable` | 可变范围 100–900 | 西文标题、正文，可作为标签 / 数字备选 | [SIL OFL 1.1](https://github.com/vercel/geist-font/blob/main/OFL.txt) |

准确 CSS 入口：

```ts
import '@fontsource-variable/noto-serif-sc/index.css'
import '@fontsource-variable/noto-sans-sc/index.css'
import '@chinese-fonts/zqfs/dist/ZhuqueFangsong-Regular/result.css'
import '@chinese-fonts/lxgwwenkai/dist/LXGWWenKai-Regular/result.css'
import '@chinese-fonts/dyh/dist/SmileySans-Oblique/result.css'
import '@fontsource-variable/geist/index.css'
import '@fontsource-variable/geist/wght-italic.css'
import '@fontsource-variable/inter/standard.css'
import '@fontsource-variable/inter/standard-italic.css'
import '@fontsource-variable/source-serif-4/standard.css'
import '@fontsource-variable/source-serif-4/standard-italic.css'
import '@fontsource-variable/geist-mono/index.css'
import '@fontsource-variable/geist-mono/wght-italic.css'
```

两款中文 Fontsource 可变字体各有 101 段 `unicode-range`。朱雀仿宋有 92 段，文楷 Regular 有 313 段，得意黑有 59 段；浏览器按实际字符加载切片。npm 解包体积分别约为 6.40 MB、4.89 MB、3.36 MB、82.75 MB、1.80 MB，不代表单页下载体积；文楷包包含六套字族，本次只引入其中 Regular。

西文字体的正常字体每款分别有 5 / 7 / 6 / 6 段 `unicode-range`，对应 Geist / Inter / Source Serif 4 / Geist Mono；斜体 CSS 各自也有相同段数。每款同时按需导入正常与原生斜体 CSS，避免正文强调样式只能使用合成斜体。四个包的 npm 解包体积分别约为 0.181 MB、1.909 MB、2.203 MB、0.172 MB；包内还包含未导入的其他轴组合，解包体积同样不等于实际下载体积。

Inter 与 Source Serif 4 的正常、斜体加载入口使用 `standard.css` / `standard-italic.css`，包含真实光学尺寸轴 `opsz` 和字重轴 `wght`；`index.css` / `wght-italic.css` 只有字重轴，无法通过设置 `font-optical-sizing: auto` 获得光学尺寸变化。轴值直接从包内正常和斜体 WOFF2 的 `fvar` 表读取核验：

| 字体 | `wght` 最小 / 默认 / 最大 | `opsz` 最小 / 默认 / 最大 |
| --- | --- | --- |
| Inter Variable | 100 / 400 / 900 | 14 / 14 / 32 |
| Source Serif 4 Variable | 200 / 400 / 900 | 8 / 20 / 60 |
| Geist Variable / Geist Mono Variable | 100 / 400 / 900 | 无此轴，光学尺寸不适用 |

光学尺寸自动值只能在字体实际轴范围内生效：Inter 的大标题在 `opsz: 32` 后不再扩大轴值，Source Serif 4 的上限是 60。此设置随字号选择字形设计，不会改变 CSS 字号阶梯。

四款西文字体的 npm 归档均保留 OFL 1.1 `LICENSE`，原始授权分别来自 Geist 项目、Inter 项目和 Adobe Source Serif 项目；来源链接均核对到官方仓库。加载器在独立预览中调用，生产站点没有这些字体 import。

`@chinese-fonts` 三个包的 npm `license` 是 MIT，覆盖其打包仓库；字体本身应遵守上表的 OFL。OFL 允许使用、嵌入和符合条款的再分发，要求保留版权和许可证，字体不得单独售卖；改版还要遵守 Reserved Font Name。LXGW 当前官方 OFL 附加许可明确允许仅用于网页交付的切片或 WOFF / WOFF2 格式转换保留字体名，并禁止把这些网页改版当作可安装桌面字体提供。

包入口有两处容易误用：

- 三个 `@chinese-fonts` 包的 `package.json` 写了 `main: index.css`，归档内实际没有该文件；README 示例还写过 `results.css`。应使用上面的真实 `result.css` 深层路径。
- 文楷包的 Light 和 Medium 分别声明 `LXGW WenKai Light`（300）、`LXGW WenKai Medium`（500），属于不同 CSS family。本预览不把它们登记成 `LXGW WenKai` 的多字重，以免显示不存在的字重。

`@fontsource/lxgw-wenkai@5.3.0` 也检查过，其 300 / 500 / 700 CSS 没有 `unicode-range`，每个 WOFF2 约 7–9 MB；因此选用文楷 Regular 切片包。朱雀仿宋的 family 明确标记为技术预览版，预览保留这个事实。

## 本次跳过

### MiSans

官方来源：[MiSans 字体官网](https://hyperos.mi.com/font/zh/)。直接下载并读取了小米官网的 [《MiSans 字体知识产权许可协议》PDF](https://hyperos.mi.com/font-download/MiSans%E5%AD%97%E4%BD%93%E7%9F%A5%E8%AF%86%E4%BA%A7%E6%9D%83%E8%AE%B8%E5%8F%AF%E5%8D%8F%E8%AE%AE.pdf)。

官方协议第 2 节要求在软件中特别注明使用 MiSans，禁止对字体或单独组件进行改编、二次开发，禁止单独再次分发字体，并要求副本保留版权声明和协议。免费商用不等于允许第三方改编和重新分发字体。

西文字体接入时重新下载核验同一官方 PDF，其 SHA-256 为 `4a93a27cd2bd81b3b5ecfd0a853144a876fa26938a93a68443c67d74172fcb86`，与首次核验一致，条款未变。

检查了以下候选：

| 包 | npm 声明授权 | 已核验结果 |
| --- | --- | --- |
| `misans-vf-4web@1.1.1` | ISC | 实际入口 `dist/result.css`，family `MiSans VF`，可变范围 150–700，375 段切片；归档没有原字体许可文件 |
| `misans@5.0.0` | Apache-2.0 | 维护者 README 明确区分脚本 Apache 授权与原字体自定义协议，并声明对子集字体进行切片 / WOFF2 转换 |
| `misans-webfont@4.3.1` | Apache-2.0 | README 说明采用字体切片工具，附原字体自定义协议 |

本次没有核实到原字体方对上述切片改编的许可，也未找到能作为开发依赖直接导入 CSS 的官方原始包，故不安装、不列入可选字体。保留系统中已合法安装的 MiSans 或从官方源使用未修改原版，是另一种需要独立配置的方案，当前预览不声称已支持。

### HarmonyOS Sans SC

官方来源：[华为字体设计指南](https://developer.huawei.com/consumer/cn/doc/design-guides/font-0000001828772001)，以及 [华为官方原始 ZIP](https://developer.huawei.com/images/download/next/HarmonyOS-Sans-v2.zip)。ZIP 下载成功，里面是原始 TTF 字体，没有可直接导入的 npm CSS 入口。

原始许可直接读取自 OpenHarmony 官方组织仓库的 [HarmonyOS Sans Fonts License Agreement](https://github.com/openharmony/global_system_resources/blob/master/LICENSE_Fonts)。协议第 2 节仅允许和软件一起使用、嵌入、分发 **unmodified copies**；第 2 条禁止修改字体或任何组件，第 1、4 条要求显著注明字体使用并保留版权、协议；不允许把字体单独再分发。

检查了 `harmonyos-sans-sc-webfont-splitted@1.1.0`：npm 声明 Unlicense，实际入口 `dist/index.css`，family `HarmonyOS Sans SC`，100 / 300 / 400 / 500 / 600 / 700 / 900，共 574 段切片。包 README 自己也说明原字体使用华为自定义协议，因此不能以打包工程的 Unlicense 代替原字体许可。

没有核实到原字体方对第三方切片改编的许可，故不安装、不列入可选字体。未用来源不明或缺少授权说明的包凑齐选项。

西文字体接入时重新读取上述 OpenHarmony 官方许可，第 2 节的 `unmodified copies` 和禁止修改条件未变。也确认 `harmonyos-sans@1.0.0` 只是第三方将 ZIP 包装为 npm 包（npm 工程标注 ISC），没有官方可直接导入的 CSS 入口；本轮仍跳过标题备选。

## 维护约束

- 调整字体选项时，同时更新 `font-preview/src/data/fonts.ts` 和此清单；以归档里的 CSS 实际值为准。
- 字体加载和网络下载大小只在独立预览中测量。当前切片包不进入站点生产页面，不添加生产 `@font-face`。
- 如未来决定在生产站点采用某款字体，应重新核对所选版本的原始许可、保留相应版权和许可证，并测试真实中文样本的加载体积、字形覆盖与布局。
