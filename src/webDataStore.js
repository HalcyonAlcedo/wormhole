// webDataStore.js
// 客户端数据存储类，用于存储和管理客户端数据

export class WebDataStore {
  constructor() {
    this.dataStores = new Map()
  }

  // 初始化指定客户端的数据存储
  initDataStore(clientId) {
    if (!this.dataStores.has(clientId)) {
      this.dataStores.set(clientId, new Map())
    }
  }

  // 存储数据
  storeData(clientId, path, data, state = 'part') {
    const clientStore = this.dataStores.get(clientId)
    if (clientStore && data !== undefined) {
      let fileData = clientStore.get(path) || { data: [], state: 'part' }
      fileData.data.push(data)
      fileData.state = state
      clientStore.set(path, fileData)
    }
  }

  // 获取数据
  getData(clientId, path) {
    const clientStore = this.dataStores.get(clientId)
    if (clientStore?.has(path)) {
      const store = clientStore.get(path)
      if (store.state === 'complete') {
        return Buffer.concat(store.data.map(segment => {
          // 如果segment是字符串，则假定它是base64编码的，并进行解码
          if (typeof segment === 'string') {
            return Buffer.from(segment, 'base64')
          }
          // 如果segment是Buffer或Uint8Array，则直接使用
          else if (segment.type === 'Buffer' || segment.type === 'Uint8Array') {
            return Buffer.from(segment.data)
          }
          // 如果数据类型未知，则记录错误并返回空Buffer
          else {
            console.error('未知的数据类型:', segment.type)
            return Buffer.alloc(0)
          }
        }))
      }
    }
    return null
  }

  // 获取数据状态
  getState(clientId, path) {
    const clientStore = this.dataStores.get(clientId)
    if (clientStore?.has(path)) {
      return clientStore.get(path).state
    }
    return null
  }

  // 设置数据状态
  setState(clientId, path, state) {
    const clientStore = this.dataStores.get(clientId)
    if (clientStore?.has(path)) {
      const fileData = clientStore.get(path)
      fileData.state = state
      clientStore.set(path, fileData)
    }
  }

  // 清除数据
  clearData(clientId, path) {
    const clientStore = this.dataStores.get(clientId)
    if (clientStore) {
      clientStore.delete(path)
    }
  }
}
