// web.js
// 处理HTTP Web请求的路由和逻辑
import { parse } from 'path'

export default async function webRoutes(fastify, options) {

  const { clientManager, webDataStore } = options.options


  // 处理客户端Ws请求
  await fastify.get('/:clientId/*', { websocket: true }, async (connection, request) => {
    const clientId = parseInt(request.params.clientId)
    let path = request.params['*']
    const queryParams = request.query
    const headersParams = request.headers

    console.log(`客户端${clientId}打开Websocket连接:`, path)

    const messageHandler = message => {
      try {
        message = JSON.parse(message)
      } catch (error) {
        connection.send(JSON.stringify({ error: error.message }))
      }
      if (message.type === 'ws' && message.path === path && message.command === 'reply') {
        if (message.state === 'complete') {
          connection.send(JSON.stringify(message.data))
        } else if (message.state === 'error') {
          connection.send(JSON.stringify(message.error || message.data))
          connection.close()
        }
      }
    }
    const closeHandler = error => {
      connection.send(JSON.stringify({message: 'close'}))
      connection.close()
    }

    const client = clientManager.getClient(clientId)
    if (client) {
      client.on('message', messageHandler)
      client.on('close', closeHandler)
      client.on('error', closeHandler)
      connection.on('message', message => {
        const pathObj = parse(path)
        path = `${pathObj.dir}${pathObj.dir ? '/' : ''}${pathObj.base}`
        client.send(JSON.stringify({ type: 'ws', path, message: JSON.parse(message), query: queryParams, headers: headersParams, command: 'websocket' }))
      });
      connection.on('open', () => {
        const pathObj = parse(path)
        path = `${pathObj.dir}${pathObj.dir ? '/' : ''}${pathObj.base}`
        client.send(JSON.stringify({ type: 'ws', path, query: queryParams, headers: headersParams, command: 'link' }))
      });
      // 处理连接关闭
      connection.on('close', () => {
        client.send(JSON.stringify({ type: 'ws', path, query: queryParams, headers: headersParams, command: 'close' }))
        client.removeListener('message', messageHandler)
        client.removeListener('close', closeHandler)
        client.removeListener('error', closeHandler)
      })
      // 处理连接错误
      connection.on('error', error => {
        client.send(JSON.stringify({ type: 'ws', path, query: queryParams, headers: headersParams, command: 'close' }))
        client.removeListener('message', messageHandler)
        client.removeListener('close', closeHandler)
        client.removeListener('error', closeHandler)
      })
    } else {
      connection.send(JSON.stringify({ type: 'error', message: 'Client not found' }))
      connection.close()
    }
  })

}
