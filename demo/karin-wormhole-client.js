import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { Cfg, logger } from '#Karin'
const host = new URL(Cfg.config['config.config'].http_render.host)
const server_hostname = host.hostname;
const server_port = host.port;
const clientId = parseInt(Cfg.config['config.config'].http_render.host.split('/').pop())
const wsUrl = 'ws://' + (server_port ? `${server_hostname}:${server_port}` : server_hostname) + '/ws/' + clientId;

let ws;
let reConnect;

const chunkSize = 1024 * 1024 * 3; //文件分片大小

function connect() {
    let heartbeat
    reConnect = undefined;
    ws = new WebSocket(wsUrl);
    ws.on('open', function open() {
        logger.info('连接到wormhole服务器' + wsUrl);
        // 发送心跳
        heartbeat = setInterval(() => {
            ws.send(JSON.stringify({ type: 'heartbeat', date: new Date() }));
        }, 30000); // 每30秒发送一次心跳
    });

    ws.on('message', function incoming(data) {
        try {
            data = JSON.parse(data)
        } catch (error) {
            logger.warn(`收到非法消息${data}`)
        }
        switch (data.type) {
            case 'web':
                if (data.path) {
                    let filePath = data.path
                    const query = data.query
                    if (query.html) {
                        ws.send(JSON.stringify({ type: 'web', command: 'redirect', path: filePath,target: query.html.startsWith('/') ? query.html.slice(1) : query.html }));
                        return
                    }
                    const list = ['.css', '.html', '.ttf', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.woff', '.woff2']
                    if (!list.some(ext => path.extname(filePath).endsWith(ext))) {
                        logger.warn(`拦截非资源文件${filePath}`)
                        ws.send(JSON.stringify({ type: 'web', state: 'error', error: '非资源文件' }));
                        return
                    }
                    logger.info(`获取网页文件数据:${filePath}`)
                    // 获取文件

                    const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
                    let part = 0;

                    stream.on('data', (chunk) => {
                        part++;
                        let message = {
                            type: 'web',
                            path: data.path,
                            command: 'resource',
                            data: chunk,
                            state: 'part',
                            part: part
                        };

                        ws.send(JSON.stringify(message));
                    });

                    stream.on('end', (chunk) => {
                        part++;
                        // 如果是最后一片段，则更新状态为 'complete'
                        if (stream.readableEnded) {
                            ws.send(JSON.stringify({
                                type: 'web',
                                path: data.path,
                                command: 'resource',
                                data: '',
                                state: 'complete',
                                part: part
                            }));
                        }
                    });

                    stream.on('error', (err) => {
                        ws.send(JSON.stringify({ type: 'web', state: 'error', error: err.message }));
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'web', state: 'error', error: '错误的文件路径' }));
                }
                break;
            default:
                break;
        }
    });

    ws.on('close', function close() {
        if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = null
        }
        logger.warn('连接关闭，10秒后尝试重新连接');
        if (!reConnect) {
            reConnect = setTimeout(connect, 10000);
        }
    });

    ws.on('error', function error() {
        if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = null
        }
        logger.warn('连接错误，10秒后尝试重新连接');
        if (!reConnect) {
            reConnect = setTimeout(connect, 10000);
        }
    });

}

if (clientId) {
    connect(); // 初始化连接
}