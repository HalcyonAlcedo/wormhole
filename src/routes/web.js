// web.js
// 处理HTTP Web请求的路由和逻辑
import { parse } from 'path'
import crypto from 'crypto'
import extHandle from '../extHandle.js'

export default async function webRoutes(fastify, options) {

  const { clientManager, webDataStore } = options.options

  // 处理客户端Get请求
  await fastify.get('/:clientId/*', async (request, reply) => {
    const clientId = parseInt(request.params.clientId)
    const path = request.params['*']
    const queryParams = request.query
    const headersParams = request.headers

    console.log(`客户端${clientId}请求资源:`, path)

    try {
      // 创建一个新的Promise来等待WebSocket客户端的响应
      const data = await getWaitForWsResponse(clientManager, webDataStore, clientId, path, queryParams, headersParams)
      if (data.code === 301 || data.code === 302) {
        reply.redirect(data.code, data.target)
      } else {
        reply.code(data.code).type(data.type).send(data.data)
      }
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  })

  // 处理客户端api请求
  await fastify.post('/:clientId/*', async (request, reply) => {
    const clientId = parseInt(request.params.clientId)
    const path = request.params['*']
    const queryParams = request.query
    const bodyParams = request.body
    const headersParams = request.headers
    console.log(`客户端${clientId}请求数据:`, path)

    try {
      // 创建一个新的Promise来等待WebSocket客户端的响应
      const data = await postWaitForWsResponse(clientManager, webDataStore, clientId, path, queryParams, bodyParams, headersParams)
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
  async function getWaitForWsResponse(clientManager, webDataStore, clientId, path, queryParams, headersParams) {
    const pathObj = parse(path)
    const echo = crypto.randomUUID()
    path = `${pathObj.dir}${pathObj.dir ? '/' : ''}${pathObj.base}`
    return new Promise((resolve, reject) => {
      const client = clientManager.getClient(clientId)
      if (client) {
        webDataStore.initDataStore(clientId)
        client.send(JSON.stringify({ type: 'web', path, query: queryParams, headers: headersParams, command: 'get', echo }))
        // 设置事件监听器来处理WebSocket客户端返回的消息
        const messageHandler = message => {
          const ret = data => {
            client.removeListener('message', messageHandler)
            resolve(data)
          }
          try {
            message = JSON.parse(message)
          } catch (error) {
            return
          }
          if (message.echo && message.echo !== echo) {
            return
          }
          if (message.type === 'web' && message.path === path && message.command === 'resource') {
            if (message.state === 'complete') {
              webDataStore.storeData(clientId, message.path, message.data, message.state)
              const fileBuffer = webDataStore.getData(clientId, message.path)
              webDataStore.clearData(clientId, path)
              if (fileBuffer) {
                client.GetCount += 1
                ret({ type: extHandle(message.ext || pathObj.ext), data: fileBuffer, code: 200 })
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
  async function postWaitForWsResponse(clientManager, webDataStore, clientId, path, queryParams, bodyParams, headersParams) {
    const pathObj = parse(path)
    const echo = crypto.randomUUID()
    path = `${pathObj.dir}${pathObj.dir ? '/' : ''}${pathObj.base}`
    return new Promise((resolve, reject) => {
      const client = clientManager.getClient(clientId)
      if (client) {
        webDataStore.initDataStore(clientId)
        client.send(JSON.stringify({ type: 'web', path, query: queryParams, body: bodyParams, headers: headersParams, command: 'post', echo }))
        // 设置事件监听器来处理WebSocket客户端返回的消息
        const messageHandler = message => {
          const ret = data => {
            client.removeListener('message', messageHandler)
            resolve(data)
          }
          try {
            message = JSON.parse(message)
          } catch (error) {
            return
          }
          if (message.echo && message.echo !== echo) {
            return
          }
          if (message.type === 'web' && message.path === path && message.data != undefined && message.command === 'postapi') {
            if (message.state === 'complete') {
              ret({ type: 'application/json', data: message.data, code: 200 })
            } else if (message.state === 'error') {
              webDataStore.clearData(clientId, path)
              client.removeListener('message', messageHandler)
              reject(new Error(`Get Data Error${error.message}`))
            }
          }
          if (message.type === 'web' && message.path === path && message.command === 'redirect' && message.target) {
            ret({ code: 301, target: `/web/${clientId}/${message.target}` })
          }
          if (message.state === 'error') {
            webDataStore.clearData(clientId, path)
            client.PostCount += 1
            ret({ type: 'application/json', data: message.error.message || message.error, code: message.error.status || 500 })
          }
        }
        client.on('message', messageHandler)
        // 设置超时
        setTimeout(() => {
          client.removeListener('message', messageHandler)
          reject(new Error('Get Data Time Out')) // 拒绝Promise并返回错误
        }, 60000) // 1分钟
      } else {
        resolve({ type: 'application/json', data: '{"error": "Client not found"}', code: 403 })
      }
    })
  }
}
