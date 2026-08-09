# 这里是你更新网站的地方

你不需要改 `src/`、`package.json` 或任何代码文件。以后只需要操作本文件夹。

## 最常用的两个入口

1. 改首页文字：打开 [`site/home.md`](site/home.md)，按里面的提示替换文字。
2. 放首页图片：把图片拖到 [`../public/uploads/home/`](../public/uploads/home/)；再把图片路径填进 `site/home.md` 顶部的 `heroImage`。

网站在本地预览运行时，保存文本或放入图片后会自动刷新。正式部署接通后，同样的文件变更会触发网站重新构建；不需要修改代码。

## 不要动的地方

- 不要修改 `src/`：那是网站的排版和功能。
- 不要修改根目录的 `package.json`：那是构建配置。
- 图片文件名尽量使用英文、小写、短横线，例如 `phil-working-desk.jpg`；不要用空格、中文或括号。

## 后续新增内容的位置

```text
content/
├─ site/                 网站公共文案和首页
├─ media/                未来项目、文章的原始素材
├─ projects/             一个项目一个文件夹
├─ writing/              一篇文章一个 Markdown 文件
└─ media/                对应项目、文章的原始素材
```

当前公开图片放在 `public/uploads/`，因为该目录会被网站直接发布。第一版只读取 `site/home.md`，以便先把首页做准；等首批真实项目、文章和资源核验完毕后，会把 `projects/`、`writing/` 的模板接入对应页面。
