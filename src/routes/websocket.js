// websocket.js
// 处理WebSocket连接和事件

export default async function websocketRoutes(fastify, options) {

    const { clientManager } = options.options
  
    await fastify.get('/:clientId', { websocket: true }, (connection, req) => {
      const socket = connection
      const clientId = parseInt(req.params.clientId) || Date.now()
  
      // 添加客户端到管理器
      clientManager.addClient(socket, clientId)
  
      // 发送欢迎消息
      socket.send(JSON.stringify({ type: 'msg', date: clientId, message: `Hello ${clientId}, this is the wormhole server.` }))
  
      // 处理接收到的消息
      socket.on('message', message => {
        try {
          message = JSON.parse(message)
        } catch (error) {
          console.warn(`客户端${clientId}发送了非法消息:`, message)
          socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
        }
      })
  
      // 处理连接关闭
      socket.on('close', () => {
        clientManager.removeClient(clientId)
      })
  
      // 处理连接错误
      socket.on('error', error => {
        console.error(`客户端${clientId}连接错误:`, error)
        clientManager.removeClient(clientId)
      })
    })
  }
  