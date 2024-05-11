import Fastify from 'fastify'
import websocketPlugin from '@fastify/websocket'
import { parse } from 'path'

// 客户管理类
class ClientManager {
    constructor() {
        this.clients = new Map()
    }

    addClient(client, id) {
        this.clients.set(id, client)
    }

    getClient(id) {
        return this.clients.get(id)
    }

    removeClient(id) {
        this.clients.delete(id)
    }

    // 广播消息给所有客户端
    broadcast(message) {
        for (const client of this.clients.values()) {
            client.send(message)
        }
    }

}

// 客户数据存储类
class WebDataStore {
    constructor() {
        this.dataStores = new Map()
    }

    initDataStore(clientId) {
        if (!this.dataStores.has(clientId)) {
            this.dataStores.set(clientId, new Map())
        }
    }

    storeData(clientId, path, data, state = 'part') {
        const clientStore = this.dataStores.get(clientId)
        if (clientStore && data !== undefined) {
            let fileData = clientStore.get(path) || { data: [], state: 'part' }
            fileData.data.push(data)
            fileData.state = state
            clientStore.set(path, fileData)
        }
    }

    getData(clientId, path) {
        const clientStore = this.dataStores.get(clientId)
        if (clientStore?.has(path)) {
            const store = clientStore.get(path)
            if (store.state === 'complete') {
                return Buffer.concat(store.data.map(segment => Buffer.from(segment, 'base64')))
            }
        }
        return null
    }

    getState(clientId, path) {
        const clientStore = this.dataStores.get(clientId)
        if (clientStore && clientStore.has(path)) {
            return clientStore.get(path).state
        }
        return null
    }

    setState(clientId, path, state) {
        const clientStore = this.dataStores.get(clientId)
        if (clientStore && clientStore.has(path)) {
            const fileData = clientStore.get(path)
            fileData.state = state
            clientStore.set(path, fileData)
        }
    }

    clearData(clientId, path) {
        const clientStore = this.dataStores.get(clientId)
        if (clientStore) {
            clientStore.delete(path)
        }
    }

}

const webManager = new WebDataStore()
const clientManager = new ClientManager()

const fastify = Fastify({ logger: false })
await fastify.register(websocketPlugin)

fastify.get('/ws', { websocket: true }, (connection, req) => {
    const socket = connection
    const id = new Date().getTime() // 使用时间戳作为客户端ID
    clientManager.addClient(socket, id)

    socket.send(JSON.stringify({ type: 'msg', date: `Hello ${id}, this is the media server.`, client: id }))
    socket.on('message', message => {
        try {
            message = JSON.parse(message)
        } catch (error) {
            console.warn(`${id}:非法消息${message}`)
        }
        switch (message.type) {
            case 'web':
                // 如果是文件片段
                if (message.state === 'part' || message.state === 'complete') {
                    // 将base64字符串转换回Buffer并存储
                    webManager.storeData(id, message.path, message.message, message.state)
                } else if (message.state === 'error') {
                    console.warn(`${id}:${message.error}`)
                }
                break
            default:
                break
        }
    })

    socket.on('close', () => {
        clientManager.removeClient(id)
    })

    // 添加错误处理
    socket.on('error', error => {
        console.warn(`用户${id}连接错误！`)
        clientManager.removeClient(id)
    })
})

// 处理客户端web请求
const getClientWeb = async (request, reply) => {
    const clientId = parseInt(request.params.clientId)
    const pathObj = parse(request.params['*'])
    const path = `${pathObj.dir}${pathObj.dir ? '/' : ''}${pathObj.base}` // 获取路径部分
    console.log(`${clientId}请求资源:${path}`)
    // 创建一个新的Promise来等待WebSocket客户端的响应
    const waitForWsResponse = new Promise((resolve, reject) => {
        const client = clientManager.getClient(clientId)
        if (client) {
            webManager.initDataStore(clientId)
            client.send(JSON.stringify({ type: 'web', path, command: 'get' }))
            // 设置事件监听器来处理WebSocket客户端返回的消息
            const messageHandler = message => {
                const ret = data => {
                    client.removeListener('message', messageHandler)
                    resolve(data)
                }
                try {
                    message = JSON.parse(message)
                } catch (error) {
                    webManager.clearData(clientId, path)
                    ret({ type: 'text/html', data: `非法消息${message}`, code: 403 })
                }
                if (message.type === 'web' && message.path === path && message.command === 'resource') {
                    if (message.state === 'complete') {
                        webManager.storeData(clientId, message.path, message.data, message.state)
                        const fileBuffer = webManager.getData(clientId, message.path)
                        webManager.clearData(clientId, path)
                        if (fileBuffer) {
                            let text = fileBuffer.toString('utf8')
                            switch (pathObj.ext) {
                                case '.woff':
                                    ret({ type: 'application/font-woff', data: fileBuffer, code: 200 })
                                    break
                                case '.jpg':
                                    ret({ type: 'image/jpeg', data: fileBuffer, code: 200 })
                                    break
                                case '.png':
                                    ret({ type: 'image/png', data: fileBuffer, code: 200 })
                                    break
                                case '.webp':
                                    ret({ type: 'image/webp', data: fileBuffer, code: 200 })
                                    break
                                case '.html':
                                    ret({ type: 'text/html', data: text, code: 200 })
                                    break
                                case '.css':
                                    ret({ type: 'text/css', data: text, code: 200 })
                                    break
                                case '.json':
                                    ret({ type: 'application/json', data: text, code: 200 })
                                    break
                                default:
                                    ret({ type: 'text/plain', data: text, code: 200 })
                                    break
                            }
                        } else {
                            ret({ type: 'text/html', data: 'Data not found', code: 404 })
                        }
                    } else if (message.state === 'part') {
                        webManager.storeData(clientId, message.path, message.data, message.state)
                    } else if (message.state === 'error') {
                        webManager.clearData(clientId, path)
                        client.removeListener('message', messageHandler)
                        reject(new Error(`Get File Error \n\n${error.message}`))
                    }
                }
            }
            client.on('message', messageHandler)
            // 设置超时
            setTimeout(() => {
                client.removeListener('message', messageHandler)
                reject(new Error('Get File Time Out')) // 拒绝Promise并返回错误
            }, 180000) // 3分钟
        } else {
            resolve({ type: 'text/html', data: 'Client not found', code: 403 })
        }
    })
    try {
        // 等待WebSocket客户端返回数据
        try {
            const data = await waitForWsResponse
            reply.code(data.code).type(data.type).send(data.data) // 发送数据作为HTTP响应
        } catch (err) {
            reply.code(500).send({ error: err.message }) // 发送错误响应
        }
    } catch (error) {
        reply.code(500).send({ error: error.message }) // 发送错误响应
    }
}

// web代理访问
fastify.get('/web/:clientId/*', getClientWeb)
fastify.get('/', (request, reply) => {
    reply.type('wormhole server')
})
const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '::'})
        console.log('wormhole服务已启动')
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
