# PersonalAI 首页对话模式

## 使用与本地预览

保持 PersonalAI 公开聊天服务运行：在 PersonalAI 目录执行 `npm run dev:chat`（`http://127.0.0.1:5174/chat`）。
网站执行 `npm run dev -- --host 127.0.0.1 --port 4321`，打开 `http://127.0.0.1:4321/`。

- 首页桌面：悬浮照片，等待气泡出现；点击照片只显示邀请，点击气泡进入。键盘聚焦头像也可发现气泡。
- 手机：头像可见时约 5 秒后提示 2 秒，20 秒后最多再提示一次；点头像展开、点气泡进入，点空白收回。交互后停止提示，同一标签页访问记住提示次数。
- 进入：正文轻移淡出，Strands 与原背景交叉淡化，已连接的聊天内容同步淡入，约 520ms 完成；首次与重开使用一致节奏，不重播已展示问候。
- 返回介绍或 Escape：保留会话、草稿和正在进行的生成，约 360ms 恢复介绍与焦点。
- 首页与内页：导航右侧始终显示聊天图标。首页进入沉浸对话，内页打开右下角浮窗；桌面最大 480 × 700px，手机按可用视口留边显示。
- 基础操作常驻：顶部新对话、历史、联系 Phil；底部固定输入和发送/停止；回答下方显示复制、重试、赞同与纠错反馈。复制成功后显示“已复制”，嵌入窗口仅获剪贴板写入权限。
- 消息区独立滚动，历史与留言弹窗适配窗口高度；演示回答及本地保存提示可见。联系入口仍为本地演示留言，不发送真实通知。
- 聊天内推荐“作品档案”或“文章与想法”可跳转本站对应页面。这里是基于公开资料的模拟回答，不是真实上线 AI。

手机验收为浏览器触摸模拟；尚未在实体手机及其软键盘上验证。

## 配置和发布边界

网站本机 `.env.development.local`：

```env
PUBLIC_PERSONAL_AI_DEV_URL=http://127.0.0.1:5174/chat
```

PersonalAI 本机 `.env.chat.local`：

```env
VITE_EMBED_ALLOWED_ORIGINS=http://127.0.0.1:4321,http://127.0.0.1:5175,https://rzcthink.top
```

生产网站需设置 `PUBLIC_PERSONAL_AI_URL=https://你的正式聊天域名/chat` 后重新构建。
生产忽略开发地址；空值、HTTP、本地/IP 主机、凭据或非 `/chat` 路径均隐藏所有 AI 入口，不回退到 localhost。URL 查询与 hash 清除后，由父站加入明确嵌入参数。
聊天生产项目设置 `VITE_EMBED_ALLOWED_ORIGINS=https://rzcthink.top`；如有额外域名，逐项列出实际 origin，不带路径或通配符。

聊天部署响应头需允许父站嵌入（CSP `frame-ancestors`）；不能以 `X-Frame-Options: DENY/SAMEORIGIN` 阻止跨域嵌入。父站若设置 CSP，`frame-src` 也需允许聊天域名。
未部署、未接入真实模型或服务器；未修改管理功能。本地环境文件不提交。

## 实现与文件

| 子系统 | 文件 |
| --- | --- |
| 公开地址校验与构建开关 | `src/lib/personal-ai.mjs`、`src/lib/personal-ai-config.ts`、`.env.example` |
| 头像、导航、公共挂载 | `src/components/HomeAvatar.astro`、`SiteHeader.astro`、`PersonalAI.astro`、`src/layouts/BaseLayout.astro` |
| 宿主状态机、外观 | `src/scripts/personal-ai.ts`、`src/styles/personal-ai.css` |
| 滚动与原背景暂停 | `src/scripts/smooth-scroll.ts`、`public/scripts/liquid-background.js` |
| Strands | `src/scripts/strands.mjs`、`docs/licenses/Strands-LICENSE.md` |
| 图标、依赖、验收入口 | `src/components/icon-system/icons.ts`、`package.json`、`package-lock.json`、`scripts/test-personal-ai.mjs`、`scripts/test-personal-ai-navigation.mjs`、`scripts/test-personal-ai-controls.mjs` |
| PersonalAI 公开嵌入 | `src/lib/host-bridge.ts`、`src/components/host-greeting.tsx`、`src/host-embed.css` |
| PersonalAI 现有聊天复用 | `src/pages/chat.tsx`、`src/components/chat-thread.tsx` |
| 文档 | 本文、网站 `README.md`、PersonalAI `docs/SEPARATE-SITES.md` |

Strands 来源：`https://reactbits.dev/r/Strands-JS-CSS.json`，2026-09-17 获取；上游为 David Haz 的 React Bits。
保留官方 VERT/FRAG 着色器，使用 OGL 1.x；将 React 生命周期改为显式挂载、暂停和清理，不启用无关的玻璃透镜分支。
许可证为 MIT + Commons Clause，完整文本随网站源码保留。作为网站的一部分使用，不单独销售/分发组件。
首页聊天稳定后暂停原 Molten；Strands 待机持续慢流，生成时平滑加速（约 7.8 倍），结束后回到慢流，不跳变相位。关闭后暂停 Strands 并恢复 Molten；后台标签页停止循环。减少动态效果使用静帧，WebGL 不可用时保留 CSS 淡彩背景。Border Glow 保留官方的边缘距离、角度光锥和多层溢光；浮窗沿用站点 paper/ink 色彩。

液态玻璃采用经用户确认的 Glass Surface 适配版，并非 Fluid Glass 的 Three.js 原组件。后者只能折射其画布内的场景，不能直接采样当前 DOM 和跨域 iframe。复用 `GlassSurface.astro` 的位移贴图与色散滤镜，直接应用在导航与原生 dialog 背景，玻璃子层负责染色和鼠标高光；文字与交互不进入滤镜。Safari/Firefox 使用磨砂回退。官方参考源码保存在忽略目录 `output/FluidGlass-JS-CSS.json`、`output/BorderGlow-JS-CSS.json`、`output/Strands-JS-CSS.json`。
导航保留轻微三通道色散；大尺寸聊天卡片使用 `chromatic={false}` 的单次折射，避免三通道采样降低帧率，彩色边缘交由 Border Glow。单次折射与普通磨砂都保留页面背景采样。

## 嵌入协议

保留普通 `embed=1&parentOrigin=...` 兼容模式。新宿主增加 `host=portfolio`，首页再加 `surface=immersive`。
仅在嵌入且父来源受信任时启用新模式。普通独立聊天和旧嵌入保持原有布局。

每条接收消息必须校验 `event.origin` 与 `event.source`；发送使用精确目标 origin，无通配符。聊天正文、会话标识、草稿不传给父站。

| 消息 | 方向与字段 | 行为 |
| --- | --- | --- |
| `pai:ready` | 聊天 → 父站 | 新模式在运行时与保存处理器注册后发送；父站回复状态 |
| `pai:theme` | 父站 → 聊天；`theme: light / dark` | 沿用主题同步 |
| `pai:host-state` | 父站 → 聊天；`requestId, active, locale, reducedMotion, recoveryWarning, links` | 进入阶段即 active，以便内容交叠淡入；链接为已知项目/文章归档路径与标签 |
| `pai:activity` | 聊天 → 父站；`responding: boolean` | 运行时生成状态变化时通知；驱动背景快慢过渡与边缘，结束或组件卸载回到慢流，不含聊天内容 |
| `pai:close` | 聊天 → 父站 | 内部关闭或无嵌套弹窗时的 Escape，返回介绍/关闭侧栏 |
| `pai:prepare-navigation` | 父站 → 聊天；`requestId` | 停止生成，保存部分回答和草稿，等待存储队列 |
| `pai:saved` | 聊天 → 父站；`requestId, ok` | 仅接受当前等待中的请求标识；存储失败不报告成功 |
| `pai:navigate` | 聊天 → 父站；`path` | 仅允许当前父站提供的 `/projects`、`/blog` 及相应英文路由；外部 URL 不接受 |

仅预加载、从未打开的聊天不拦截普通导航。实际使用过且已连接的会话切页时等待保存确认，收到确认即离开，不再额外等待淡出动画；最长 800ms，期间页面保持可见，新的导航点击更新最终目标。超时仍放行导航并在下次打开显示未确认保存提示。
新页面默认收起，重新打开加载同一聊天 origin 中的会话。已中断回答显示“回答已暂停”，不会自动重新请求。
同页收起不卸载 iframe、不取消生成；真正页面离开停止生成。浏览器刷新、关闭或后退无法保证等待异步保存，使用原有 IndexedDB 持续写入和聊天 origin 的 sessionStorage 快照/草稿降低丢失风险。存储受限时不保证跨页恢复。
问候仅为界面内容，不进入模型上下文；每个会话记录已展示状态。输入可在问候播放时使用，发送会补全问候。

## 验证与成果

```powershell
npm run check
npm run build
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4322'
node scripts/run-smoke.mjs
# 两个开发服务运行、dist 为未配置正式地址的构建：
npm run test:personal-ai
# 只需网站开发预览；使用模拟聊天桥，不依赖真实聊天服务：
node scripts/test-personal-ai-navigation-regressions.mjs
# 两个开发服务运行；拦截配置使用 mock，不调用模型：
node scripts/test-ai-motion.mjs
node scripts/test-glass-strands.mjs
# PersonalAI 目录：
npm run check
npm run build:chat
$env:PW_CHANNEL='msedge'
npm run test -- tests/separation.spec.ts
```

已验证桌面与手机模拟：气泡发现/两步触发、转场顺序、问候、双主题/语言、输入保留、焦点、滚动隔离与恢复、同页收起继续生成、切页暂停保存、真实链接跳转、刷新草稿恢复、消息来源拒绝。
已验证减少动态效果、进入时取消、WebGL 失效回退、聊天离线提示与重试、未配置生产入口隐藏。
补充验证：聊天时顶部导航可操作、菜单 Escape 优先关闭、保存确认丢失时超时放行并显示恢复提示。
全站原有回归 97 项通过、3 项按原条件跳过；PersonalAI 独立站与普通嵌入回归 2 项通过。

2026-09-17 基础控件修订：移除嵌入样式中隐藏基础操作的规则，修复复制权限。完整聊天集成脚本及其导航测试通过；新增控件脚本在 1440 × 900、390 × 844、320 × 568 下验证发送/停止/重试、实际剪贴板复制、反馈、演示留言、新建与历史恢复、双主题与英文布局通过。`npm run test:personal-ai` 现包含两套脚本。导航键盘测试改为显式 Enter 激活菜单，不再把指针操作后的程序化 focus 等同于键盘激活。

本次网站构建通过（0 错误、0 警告，113 页）；PersonalAI 类型检查、公开聊天构建及 2 项独立站隔离测试通过。已人工检查本地 Edge 截图；未验证实体手机软键盘。此前动效与声音回归结果属于上一轮，本次未重跑全站动效套件。

本次同时修改相邻 `D:\00_Formula\03_Coding\PersonalAI` 的 `src/host-embed.css` 与 `src/components/chat-thread.tsx`；该目录不属于 Formulasearch Git 仓库。修改前副本位于本站忽略目录 `output/chat-polish/before/`。
截图位于 `output/playwright/personal-ai-*.png`，该目录不提交。
