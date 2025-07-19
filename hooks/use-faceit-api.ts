import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getPlayer, 
  getPlayerStats, 
  getPlayerHistory, 
  getMatch,
  getMultiplePlayersDataParallel,
  type FaceitUser,
  type PlayerStats,
  type MatchHistory,
  type FaceitMatch
} from '../lib/faceit-api'

// Query keys для кеширования
export const faceitQueryKeys = {
  player: (nickname: string) => ['faceit', 'player', nickname] as const,
  playerStats: (userId: string, game: string = 'cs2', size: number = 20) => 
    ['faceit', 'playerStats', userId, game, size] as const,
  playerHistory: (userId: string, page: number = 0) => 
    ['faceit', 'playerHistory', userId, page] as const,
  match: (matchId: string) => ['faceit', 'match', matchId] as const,
  multiplePlayers: (nicknames: string[]) => 
    ['faceit', 'multiplePlayers', nicknames.sort()] as const,
}

// Хук для получения информации об игроке
export function usePlayer(nickname: string) {
  return useQuery({
    queryKey: faceitQueryKeys.player(nickname),
    queryFn: () => getPlayer(nickname),
    enabled: !!nickname,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 15 * 60 * 1000, // 15 минут
  })
}

// Хук для получения статистики игрока
export function usePlayerStats(userId: string, game: string = 'cs2', size: number = 20) {
  return useQuery({
    queryKey: faceitQueryKeys.playerStats(userId, game, size),
    queryFn: () => getPlayerStats(userId, game, size),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 15 * 60 * 1000, // 15 минут
  })
}

// Хук для получения истории матчей игрока
export function usePlayerHistory(userId: string, page: number = 0) {
  return useQuery({
    queryKey: faceitQueryKeys.playerHistory(userId, page),
    queryFn: () => getPlayerHistory(userId, page),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 минуты (история может меняться чаще)
    gcTime: 10 * 60 * 1000, // 10 минут
  })
}

// Хук для получения информации о матче
export function useMatch(matchId: string) {
  return useQuery({
    queryKey: faceitQueryKeys.match(matchId),
    queryFn: () => getMatch(matchId),
    enabled: !!matchId,
    staleTime: 1 * 60 * 1000, // 1 минута (матчи могут обновляться)
    gcTime: 5 * 60 * 1000, // 5 минут
  })
}

// Хук для получения данных нескольких игроков
export function useMultiplePlayers(nicknames: string[]) {
  return useQuery({
    queryKey: faceitQueryKeys.multiplePlayers(nicknames),
    queryFn: () => getMultiplePlayersDataParallel(nicknames),
    enabled: nicknames.length > 0,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 15 * 60 * 1000, // 15 минут
  })
}

// Хук для получения всех данных игрока (игрок + статистика + история)
export function usePlayerData(nickname: string) {
  const playerQuery = usePlayer(nickname)
  
  const statsQuery = usePlayerStats(
    playerQuery.data?.userId || '', 
    'cs2', 
    20
  )
  
  const historyQuery = usePlayerHistory(
    playerQuery.data?.userId || '', 
    0
  )

  return {
    player: playerQuery.data,
    stats: statsQuery.data,
    history: historyQuery.data,
    isLoading: playerQuery.isLoading || statsQuery.isLoading || historyQuery.isLoading,
    isError: playerQuery.isError || statsQuery.isError || historyQuery.isError,
    error: playerQuery.error || statsQuery.error || historyQuery.error,
    refetch: () => {
      playerQuery.refetch()
      statsQuery.refetch()
      historyQuery.refetch()
    }
  }
}

// Мутация для принудительного обновления данных игрока
export function useRefreshPlayer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (nickname: string) => {
      const player = await getPlayer(nickname)
      if (player) {
        // Инвалидируем связанные запросы
        await queryClient.invalidateQueries({
          queryKey: faceitQueryKeys.player(nickname)
        })
        await queryClient.invalidateQueries({
          queryKey: faceitQueryKeys.playerStats(player.userId, 'cs2', 20)
        })
        await queryClient.invalidateQueries({
          queryKey: faceitQueryKeys.playerHistory(player.userId, 0)
        })
      }
      return player
    }
  })
}

// Утилиты для работы с кешем
export function useFaceitCache() {
  const queryClient = useQueryClient()
  
  const clearPlayerCache = (nickname?: string) => {
    if (nickname) {
      queryClient.removeQueries({ queryKey: faceitQueryKeys.player(nickname) })
    } else {
      queryClient.removeQueries({ queryKey: ['faceit', 'player'] })
    }
  }
  
  const clearStatsCache = (userId?: string) => {
    if (userId) {
      queryClient.removeQueries({ queryKey: faceitQueryKeys.playerStats(userId) })
    } else {
      queryClient.removeQueries({ queryKey: ['faceit', 'playerStats'] })
    }
  }
  
  const clearAllCache = () => {
    queryClient.removeQueries({ queryKey: ['faceit'] })
  }
  
  const prefetchPlayer = async (nickname: string) => {
    await queryClient.prefetchQuery({
      queryKey: faceitQueryKeys.player(nickname),
      queryFn: () => getPlayer(nickname),
      staleTime: 5 * 60 * 1000,
    })
  }
  
  return {
    clearPlayerCache,
    clearStatsCache,
    clearAllCache,
    prefetchPlayer,
  }
} 