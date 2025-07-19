import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { getCacheStats, clearCache } from '../lib/cache-sync'
import { Trash2, RefreshCw, Database } from 'lucide-react'

export function CacheStats() {
  const [stats, setStats] = useState({
    totalQueries: 0,
    totalPlayers: 0,
    totalStats: 0,
    totalHistory: 0,
    totalMatches: 0,
    totalMultiplePlayers: 0
  })
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    try {
      const cacheStats = await getCacheStats()
      setStats(cacheStats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    
    // Обновляем статистику каждые 2 секунды
    const interval = setInterval(loadStats, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleClearAllCache = async () => {
    try {
      // Очищаем storage кеш
      await clearCache()
      await loadStats()
    } catch (error) {
    }
  }

  const handleClearPlayerCache = async () => {
    await clearCache('player')
    await loadStats()
  }

  const handleClearStatsCache = async () => {
    await clearCache('playerStats')
    await loadStats()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Cache Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Queries:</span>
              <Badge variant="outline">{loading ? '...' : stats.totalQueries}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Players:</span>
              <Badge variant="outline">{loading ? '...' : stats.totalPlayers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stats:</span>
              <Badge variant="outline">{loading ? '...' : stats.totalStats}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">History:</span>
              <Badge variant="outline">{loading ? '...' : stats.totalHistory}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Matches:</span>
              <Badge variant="outline">{loading ? '...' : stats.totalMatches}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Multiple Players:</span>
              <Badge variant="outline">{loading ? '...' : stats.totalMultiplePlayers}</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearPlayerCache}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear Players
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearStatsCache}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear Stats
            </Button>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleClearAllCache}
            className="w-full flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Clear All Cache
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Cache helps reduce API calls and improve performance.</p>
          <p>Players are cached for 5 minutes, stats for 5 minutes, history for 2 minutes.</p>
        </div>
      </CardContent>
    </Card>
  )
} 