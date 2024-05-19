// client.js
// 客户端
function maskString(str) {
  const len = str.length;
  if (len < 8) {
    const numToReplace = Math.ceil(len * 0.8);
    const start = Math.floor((len - numToReplace) / 2);
    return str.substring(0, start) + '*'.repeat(numToReplace) + str.substring(start + numToReplace);
  } else {
    return str.substring(0, 3) + '*'.repeat(len - 5) + str.substring(len - 2);
  }
}
function formatDuration(duration)  {
    // 将毫秒转换为秒
    let seconds = Math.floor(duration / 1000);
    // 计算小时数
    let hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    // 计算分钟数
    let minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
  
    // 使用Intl.DateTimeFormat格式化
    const formatter = new Intl.DateTimeFormat('cn', {
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false, timeZone: 'UTC'
    });
  
    // 创建一个UTC时间，以便我们可以使用formatter来格式化
    const date = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
  
    // 返回格式化的时间字符串
    return formatter.format(date);
  }
export default async function clientRoutes(fastify, options) {
    const { clientManager } = options.options
    // 处理客户端请求
    await fastify.get('/', async (request, reply) => {
        let clientList = []
        for (let [id, client] of clientManager.clients.entries()) {
            clientList.push(`
            <tr>
                <td>${maskString(id.toString())}</td>
                <td>${client.GetCount}</td>
                <td>${client.PostCount}</td>
                <td>${formatDuration(Date.now() - client.LinkTime)}</td>
            </tr>
        `)
        }
        const helpHtml = `
        <!DOCTYPE html>
        <html lang="zh">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>客户端列表</title>
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
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                table, th, td {
                    border: 1px solid #ddd;
                }
                th, td {
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #007bff;
                    color: white;
                }
            </style>
        </head>
        <body>
            <h1>客户端列表</h1>
            <p>以下是连接到Wormhole系统的客户端列表。您可以查看每个客户端的ID、资源请求数量、接口请求数量以及在线时间。</p>
            <table>
                <tr>
                    <th>客户端ID</th>
                    <th>资源请求数量</th>
                    <th>接口请求数量</th>
                    <th>在线时间</th>
                </tr>
                <!-- 示例数据行 -->
                ${clientList.join('\n')}
                <!-- 更多客户端数据 -->
            </table>
            <!-- 其他内容 -->
        </body>
        </html>
        `
        reply.type('text/html').send(helpHtml)
    });

}



