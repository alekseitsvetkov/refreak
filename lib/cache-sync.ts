import { storage } from '#imports'
import { faceitQueryKeys } from '../hooks/use-faceit-api'

// Storage для кеша
const cacheStorage = storage.defineItem<Record<string, { data: any; timestamp: number; type: string }>>('local:reactQueryCache', {
  fallback: {}
})

// Типы кеша
export type CacheType = 'player' | 'playerStats' | 'playerHistory' | 'match' | 'multiplePlayers'

export interface CacheEntry {
  data: any
  timestamp: number
  type: CacheType
}

// Функция для сохранения данных в кеш
export async function saveToCache(key: string, data: any, type: CacheType): Promise<void> {
  try {
    const cache = await cacheStorage.getValue()
    cache[key] = {
      data,
      timestamp: Date.now(),
      type
    }
    await cacheStorage.setValue(cache)
  } catch (error) {
  }
}

// Функция для получения данных из кеша
export async function getFromCache(key: string): Promise<any | null> {
  try {
    const cache = await cacheStorage.getValue()
    const entry = cache[key]
    
    if (!entry) {
      return null
    }
    
    // Проверяем время жизни кеша в зависимости от типа
    const now = Date.now()
    const cacheAge = now - entry.timestamp
    
    let maxAge: number
    switch (entry.type) {
      case 'player':
      case 'playerStats':
        maxAge = 5 * 60 * 1000 // 5 минут
        break
      case 'playerHistory':
        maxAge = 2 * 60 * 1000 // 2 минуты
        break
      case 'match':
        maxAge = 1 * 60 * 1000 // 1 минута
        break
      case 'multiplePlayers':
        maxAge = 5 * 60 * 1000 // 5 минут
        break
      default:
        maxAge = 5 * 60 * 1000 // 5 минут по умолчанию
    }
    
    if (cacheAge > maxAge) {
      // Удаляем устаревший кеш
      delete cache[key]
      await cacheStorage.setValue(cache)
      return null
    }
    
    return entry.data
  } catch (error) {
    return null
  }
}

// Функция для получения статистики кеша
export async function getCacheStats(): Promise<{
  totalQueries: number
  totalPlayers: number
  totalStats: number
  totalHistory: number
  totalMatches: number
  totalMultiplePlayers: number
}> {
  try {
    const cache = await cacheStorage.getValue()
    const entries = Object.values(cache)
    
    const totalQueries = entries.length
    const totalPlayers = entries.filter(entry => entry.type === 'player').length
    const totalStats = entries.filter(entry => entry.type === 'playerStats').length
    const totalHistory = entries.filter(entry => entry.type === 'playerHistory').length
    const totalMatches = entries.filter(entry => entry.type === 'match').length
    const totalMultiplePlayers = entries.filter(entry => entry.type === 'multiplePlayers').length
    
    return {
      totalQueries,
      totalPlayers,
      totalStats,
      totalHistory,
      totalMatches,
      totalMultiplePlayers
    }
  } catch (error) {
    console.warn('Failed to get cache stats:', error)
    return {
      totalQueries: 0,
      totalPlayers: 0,
      totalStats: 0,
      totalHistory: 0,
      totalMatches: 0,
      totalMultiplePlayers: 0
    }
  }
}

// Функция для очистки кеша
export async function clearCache(type?: CacheType): Promise<void> {
  try {
    if (type) {
      // Очищаем только определенный тип
      const cache = await cacheStorage.getValue()
      Object.keys(cache).forEach(key => {
        if (cache[key].type === type) {
          delete cache[key]
        }
      })
      await cacheStorage.setValue(cache)
    } else {
      // Очищаем весь кеш
      await cacheStorage.setValue({})
    }
  } catch (error) {
    console.warn('Failed to clear cache:', error)
  }
}

// Функция для получения ключей кеша по типу
export async function getCacheKeysByType(type: CacheType): Promise<string[]> {
  try {
    const cache = await cacheStorage.getValue()
    return Object.keys(cache).filter(key => cache[key].type === type)
  } catch (error) {
    console.warn('Failed to get cache keys:', error)
    return []
  }
}

// Функция для получения детальной информации о кеше
export async function getCacheDetails(): Promise<Array<{
  key: string
  type: CacheType
  timestamp: number
  age: number
  dataSize: number
}>> {
  try {
    const cache = await cacheStorage.getValue()
    const now = Date.now()
    
    return Object.entries(cache).map(([key, entry]) => ({
      key,
      type: entry.type as CacheType,
      timestamp: entry.timestamp,
      age: now - entry.timestamp,
      dataSize: JSON.stringify(entry.data).length
    }))
  } catch (error) {
    console.warn('Failed to get cache details:', error)
    return []
  }
} 