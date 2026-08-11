# 首页内容

- `home.json` 是中文首页内容。
- `home.en.json` 是英文首页内容。
- 两个文件的 `intro`、`about`、`interest` 数组必须逐项对应；构建会检查数量。
- `email` 必须是有效邮箱，`social.url` 必须是完整 URL，必填文本不能是空字符串。
- `heroImage` 留空时不显示首页图片；填写时使用 `public/` 下的公开路径，例如 `/uploads/home/portrait.jpg`。

`identity`、`now`、`work`、`writing`、`resources` 是预留字段。页面需要这些内容时，可以直接扩展对应组件，不必再添加新的解析规则。
