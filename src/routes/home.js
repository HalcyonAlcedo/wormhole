// home.js
// 首页

export default async function homeRoutes(fastify) {

    // 处理客户端请求
    await fastify.get('/', async (request, reply) => {
        // 项目帮助文档和接口调用介绍的HTML内容
        const helpHtml = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>项目帮助文档</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.6;
                    padding: 20px;
                    max-width: 800px;
                    margin: auto;
                    background-color: #f4f4f4;
                }
                h1, h2, h3 {
                    color: #333;
                }
                p, li {
                    color: #666;
                }
                a {
                    color: #007bff;
                    text-decoration: none;
                }
                a:hover {
                    text-decoration: underline;
                }
                code {
                    background-color: #eee;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                }
                ul {
                    list-style-type: none;
                    padding: 0;
                }
                ul li::before {
                    content: '•';
                    color: #007bff;
                    display: inline-block;
                    width: 1em;
                    margin-left: -1em;
                }
            </style>
        </head>
        <h1>Wormhole</h1>
        <p>欢迎使用本项目。</p>
        <h2>接口列表</h2>
        <ul>
            <li><strong>/ws/:clientId</strong> - WebSocket连接接口，用于客户端与服务器之间的实时通信。</li>
            <li><strong>/web/:clientId/*</strong> - 客户端Web请求接口，用于处理客户端通过WebSocket请求的资源。</li>
        </ul>
        <h2>接口调用示例</h2>
        <p>以下是调用WebSocket接口的示例：</p>
        <code>ws://localhost:3000/ws/12345</code>
        <p>这将会为客户端ID为12345的用户建立一个WebSocket连接。</p>
        <p>以下是调用Web请求接口的示例：</p>
        <code>GET http://localhost:3000/web/12345/path/to/resource</code>
        <p>这将会请求客户端ID为12345的用户的资源。</p>
        `

        // 设置响应类型为HTML并发送内容
        reply.type('text/html').send(helpHtml)
    });

}



