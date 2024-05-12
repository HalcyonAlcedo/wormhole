// web.js
// 处理HTTP Web请求的路由和逻辑
import { parse } from 'path'

export default async function webRoutes(fastify, options) {
  
  const { clientManager, webDataStore } = options.options

  // 处理客户端Web请求
  await fastify.get('/:clientId/*', async (request, reply) => {
    const clientId = parseInt(request.params.clientId)
    const path = request.params['*']
    const queryParams = request.query

    console.log(`客户端${clientId}请求资源:`, path)

    try {
      // 创建一个新的Promise来等待WebSocket客户端的响应
      const data = await waitForWsResponse(clientManager, webDataStore, clientId, path, queryParams)
      if (data.code === 301 || data.code === 302) {
        reply.redirect(data.code, data.target)
      } else {
        reply.code(data.code).type(data.type).send(data.data)
      }
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  })

  // 定义waitForWsResponse函数来处理WebSocket响应
  async function waitForWsResponse(clientManager, webDataStore, clientId, path, queryParams) {
    const pathObj = parse(path)
    path = `${pathObj.dir}${pathObj.dir ? '/' : ''}${pathObj.base}`
    return new Promise((resolve, reject) => {
      const client = clientManager.getClient(clientId)
      if (client) {
        webDataStore.initDataStore(clientId)
        client.send(JSON.stringify({ type: 'web', path, query: queryParams, command: 'get' }))
        // 设置事件监听器来处理WebSocket客户端返回的消息
        const messageHandler = message => {
          const ret = data => {
            client.removeListener('message', messageHandler)
            resolve(data)
          }
          try {
            message = JSON.parse(message)
          } catch (error) {
            webDataStore.clearData(clientId, path)
            ret({ type: 'text/html', data: `非法消息${message}`, code: 403 })
          }
          if (message.type === 'web' && message.path === path && message.command === 'resource') {
            if (message.state === 'complete') {
              webDataStore.storeData(clientId, message.path, message.data, message.state)
              const fileBuffer = webDataStore.getData(clientId, message.path)
              webDataStore.clearData(clientId, path)
              if (fileBuffer) {
                let text = fileBuffer.toString('utf8')
                switch (message.ext || pathObj.ext) {
                  case '.woff':
                    ret({ type: 'application/font-woff', data: fileBuffer, code: 200 })
                    break
                  case '.woff2':
                    ret({ type: 'application/font-woff2', data: fileBuffer, code: 200 })
                    break
                  case '.jpg':
                    ret({ type: 'image/jpeg', data: fileBuffer, code: 200 })
                    break
                  case '.jpeg':
                    ret({ type: 'image/jpeg', data: fileBuffer, code: 200 })
                    break
                  case '.png':
                    ret({ type: 'image/png', data: fileBuffer, code: 200 })
                    break
                  case '.bmp':
                    ret({ type: 'image/bmp', data: fileBuffer, code: 200 })
                    break
                  case '.ico':
                    ret({ type: 'image/ico', data: fileBuffer, code: 200 })
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
              webDataStore.storeData(clientId, message.path, message.data, message.state)
            } else if (message.state === 'error') {
              webDataStore.clearData(clientId, path)
              client.removeListener('message', messageHandler)
              reject(new Error(`Get File Error \n\n${error.message}`))
            }
          }
          if (message.type === 'web' && message.path === path && message.command === 'redirect' && message.target) {
            ret({ code: 301, target: `/web/${clientId}/${message.target}` })
          }
          if (message.state === 'error') {
            webDataStore.clearData(clientId, path)
            client.removeListener('message', messageHandler)
            reject(new Error(`Get File Error \n\n${message.error}`))
          }
        }
        client.on('message', messageHandler)
        // 设置超时
        setTimeout(() => {
          client.removeListener('message', messageHandler)
          reject(new Error('Get File Time Out')) // 拒绝Promise并返回错误
        }, 60000) // 1分钟
      } else {
        resolve({ type: 'text/html', data: 'Client not found', code: 403 })
      }
    })
  }
}
