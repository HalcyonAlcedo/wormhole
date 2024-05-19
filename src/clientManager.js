// clientManager.js
// 客户端管理类，用于管理WebSocket连接

export class ClientManager {
    constructor() {
      this.clients = new Map()
    }
  
    // 添加新客户端
    addClient(client, id) {
      client.GetCount = 0
      client.PostCount = 0
      client.LinkTime = Date.now()
      this.clients.set(id, client)
    }
  
    // 获取指定ID的客户端
    getClient(id) {
      return this.clients.get(id)
    }
  
    // 移除指定ID的客户端
    removeClient(id) {
      this.clients.delete(id)
    }
  
    // 广播消息给所有客户端
    broadcast(message) {
      for (const client of this.clients.values()) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      }
    }
  }
  