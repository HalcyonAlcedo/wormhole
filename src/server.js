// server.js
// 导入Fastify和WebSocket插件
import Fastify from 'fastify'
import websocketPlugin from '@fastify/websocket'
import cors from '@fastify/cors'

import websocketRoutes from './routes/websocket.js'
import webRoutes from './routes/web.js'
import homeRoutes from './routes/home.js'

// 导出一个函数，该函数接收ClientManager和WebDataStore实例
export default async function server(options) {
  // 创建Fastify实例
  const fastify = Fastify({ logger: options.dev })

  // 注册WebSocket插件
  await fastify.register(websocketPlugin)

  // 配置跨域请求
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST']
  });
  
  // 注册路由
  await fastify.register(websocketRoutes, { prefix: '/ws', options })
  await fastify.register(webRoutes, { prefix: '/web', options })
  await fastify.register(homeRoutes)

  // 返回Fastify实例
  return fastify
}
