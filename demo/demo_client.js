import WebSocket from 'ws'
import fs from 'fs'

const wsUrl = 'ws://localhost:3000/ws/'
let ws
let reConnect

const chunkSize = 1024 * 1024 * 3 //文件分片大小

function connect() {
    let heartbeat
    reConnect = undefined
    ws = new WebSocket(wsUrl)
    ws.on('open', function open() {
        console.log('连接到服务器')
        // 发送心跳
        heartbeat = setInterval(() => {
            ws.send(JSON.stringify({ type: 'heartbeat', date: new Date() }))
        }, 30000) // 每30秒发送一次心跳
    })

    ws.on('message', function incoming(data) {
        try {
            data = JSON.parse(data)
        } catch (error) {
            console.warn(`非法消息${data}`)
        }
        switch (data.type) {
            case 'web':
                if (data.path) {
                    const path = data.path
                    console.log(`获取网页文件数据:${path}`)
                    // 获取文件

                    const stream = fs.createReadStream(path, { highWaterMark: chunkSize })
                    let part = 0

                    stream.on('data', (chunk) => {
                        part++
                        let message = {
                            type: 'web',
                            path: path,
                            command: 'resource',
                            data: chunk.toString('base64'),
                            state: 'part',
                            part: part
                        }

                        ws.send(JSON.stringify(message))
                    })

                    stream.on('end', (chunk) => {
                        part++
                        // 如果是最后一片段，则更新状态为 'complete'
                        if (stream.readableEnded) {
                            ws.send(JSON.stringify({
                                type: 'web',
                                path: path,
                                command: 'resource',
                                data: '',
                                state: 'complete',
                                part: part
                            }))
                        }
                    })

                    stream.on('error', (err) => {
                        ws.send(JSON.stringify({ type: 'web', state: 'error', error: err.message }))
                    })
                } else {
                    ws.send(JSON.stringify({ type: 'web', state: 'error', error: '错误的文件路径' }))
                }
                break
            default:
                break
        }
        console.log('收到消息：', data)
    })

    ws.on('close', function close() {
        if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = null
        }
        console.log('连接关闭，1分钟后尝试重新连接')
        if (!reConnect) {
            reConnect = setTimeout(connect, 60000) // 1分钟后重试连接
        }
    })

    ws.on('error', function error() {
        if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = null
        }
        console.log('连接错误，1分钟后尝试重新连接')
        if (!reConnect) {
            reConnect = setTimeout(connect, 60000) // 1分钟后重试连接
        }
    })

}

connect() // 初始化连接
