// index.js
// 导入必要的模块和类
import minimist  from 'minimist'
import server from './server.js'
import { ClientManager } from './clientManager.js'
import { WebDataStore } from './webDataStore.js'

// 获取参数
const args = minimist(process.argv.slice(2))

// 创建实例
const clientManager = new ClientManager()
const webDataStore = new WebDataStore()

const options = {
  clientManager,
  webDataStore,
  dev: args['dev']
}

// 初始化服务器
const fastify = await server(options)

// 启动服务器
const startServer = async () => {
  try {
    await fastify.listen({ port: args['port'] || 3000, host: args['host'] || '::' })
    console.log(`wormhole服务已启动，端口:${args['port'] || 3000}`)
  } catch (err) {
    console.error('启动wormhole服务时出错:', err)
    process.exit(1)
  }
}

startServer()
