#Wormhole
---
Wormhole 是一个基于 Fastify 和 WebSocket 的数据传输项目，旨在实现将客户端的web资源代理到公网。

---

## 快速开始

1. 使用git克隆项目:
 ```bash
   git clone https://github.com/HalcyonAlcedo/wormhole.git
```
2. 安装依赖
```bash
   npm install
```
3. 启动
```bash
   npm run app
```
5. 后台运行
```bash
   npm run start
```
6. 开放端口
   开放服务器3000端口

## Karin插件
可用于[Karin](https://github.com/KarinJS/Karin)的渲染代理插件，适用于Karin端在非固定IP的情况下由渲染器访问Wormhole代理生成页面渲染

1. 安装插件
   将`demo/karin-wormhole-client.js`拷贝到`Karin/plugins/karin-plugin-example`目录
2. 调整设置
   修改`Karin/config/config/config.yaml`文件
   - 将`http_render.enable`改为true
   - 将`http_render.host`改为Wormhole的web地址，例如Wormhole部署在 127.0.0.1:3000 这里就填 http://127.0.0.1:3000/web/123456，其中123456为客户端id，建议改为机器人的qq号以保证客户端唯一性

注意：为安全考虑，Karin插件仅代理静态资源`css,html,ttf,jpg,jpeg,png,gif,bmp,ico,woff,woff2`
