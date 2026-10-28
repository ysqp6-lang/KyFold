# KyFold

KyFold 官网与 Color Studio 调色工作台。静态 HTML / CSS / JavaScript 项目，无需安装依赖或构建。

## 查看网站

直接打开 `index.html`，或将整个仓库目录部署到静态服务器。顶部导航、首页介绍区和页脚都提供调色工作台入口。

## 文件结构

- `index.html`、`app.js`：官网与页面路由。
- `styles.css`、`clarity.css`、`content.css`、`hero-art.css`、`studio-entry.css`：官网样式。
- `assets/`：原版图标和账户链接标记。
- `color-studio/index.html`：完整在线工作台。
- `color-studio/engine.js`、`style.css`、`source-data.js`：可直接编辑的工作台源文件。
- `color-studio/KyFold_Color_Studio_v2_4.html`：独立离线版。

## Color Studio

支持按部位调整 RGB / HEX、最多三色渐变、渐变位置、背景画笔与模糊。原版高光可调节强度、颗粒保留量与颗粒强度，并保留重制高光选项。支持配色工程保存 / 导入、透明 K SVG、完整 PNG、背景 PNG 和 ZIP 素材包导出。

无需登录。所有颜色和画笔操作在浏览器内完成；自动记忆按浏览器与网站地址隔离，重要配色请另存工程。SVG 保留矢量高光，颗粒效果保存在 PNG 和素材包细节层中。

## 产品与账户状态

官网中的 KyRemote、课堂 AI 助手仍处于产品设计与开发测试阶段。登录、统一账户、第三方绑定及设备操作均为本地演示，没有接入真实 OAuth、数据库或收费功能；Color Studio 为可实际使用的浏览器工具。

## 当前版本

官网 V1.4 / Color Studio V2.4。保留确认过的首屏构图、K 图标与账户链接标记。
