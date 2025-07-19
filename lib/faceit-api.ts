import { FACEIT_CONFIG } from './config'
import { getFromCache, saveToCache } from './cache-sync'

// ============================================================================
// TYPES
// ============================================================================

export interface FaceitUser {
  readonly userId: string
  readonly nickname: string
  readonly avatar?: string
  readonly country?: string
  readonly level?: number
  readonly id?: string // Add id field for API compatibility
}

export interface FaceitMatch {
  readonly matchId: string
  readonly gameId: string
  readonly state: string
  readonly faction1: FaceitPlayer[]
  readonly faction2: FaceitPlayer[]
  readonly teams?: {
    readonly faction1: { readonly roster: FaceitPlayer[] }
    readonly faction2: { readonly roster: FaceitPlayer[] }
  }
  readonly entityCustom?: {
    readonly parties: Record<string, string[]>
  }
}

export interface FaceitPlayer {
  readonly id: string
  readonly nickname: string
  readonly avatar?: string
  readonly skillLevel?: number
  readonly activeTeamId?: string
}

export interface PlayerStats {
  readonly matches: number
  readonly averageKDRatio: number
  readonly averageKRRatio: number
  readonly averageHeadshots: number
  readonly averageKills: number
  readonly averageADR: number
  readonly winRate: number
}

export interface MatchHistory {
  readonly items: Array<{
    readonly matchId: string
    readonly gameId: string
    readonly nickname: string
    readonly i1: string // map name
    readonly i2: string // team id
    readonly i10: string // result (1 = win, 0 = loss)
    readonly timestamp: number // timestamp for age calculation
  }>
}

export interface PlayerData {
  readonly player: FaceitUser | null
  readonly stats: PlayerStats | null
  readonly history: MatchHistory | null
}

export interface ApiResponse<T> {
  readonly success: boolean
  readonly data: T | null
  readonly error?: string
}

export interface CacheEntry<T> {
  readonly data: T
  readonly timestamp: number
}

export type CacheType = 'player' | 'playerStats' | 'playerHistory' | 'match' | 'multiplePlayers'

// ============================================================================
// CONSTANTS
// ============================================================================

const FACEIT_API_BASE_URL = 'https://www.faceit.com/api' as const
const CACHE_TIME = FACEIT_CONFIG.CACHE_TIME
const SUPPORTED_GAMES = new Set(['csgo', 'cs2'])
const BATCH_SIZE = 3 as const
const MAX_RETRIES = 5 as const
const BASE_DELAY = 1000 as const

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Utility class for common operations
 */
export class FaceitUtils {
  /**
   * Convert snake_case keys to camelCase
   */
  static camelCaseKeys<T>(obj: T): T {
    if (Array.isArray(obj)) {
      return obj.map(this.camelCaseKeys) as T
    }
    
    if (obj !== null && typeof obj === 'object') {
      const result = {} as any
      for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        result[camelKey] = this.camelCaseKeys(value)
      }
      return result
    }

    return obj
  }

  /**
   * Check if game is supported
   */
  static isSupportedGame(game: string): boolean {
    return SUPPORTED_GAMES.has(game.toLowerCase())
  }

  /**
   * Determine cache type based on key
   */
  static getCacheType(key: string): CacheType {
    if (key.startsWith('stats:')) return 'playerStats'
    if (key.startsWith('history:')) return 'playerHistory'
    if (key.startsWith('match:')) return 'match'
    if (key.startsWith('multiple:')) return 'multiplePlayers'
    return 'player'
  }

  /**
   * Ensure userId is set from id field if not present
   */
  static ensureUserId(user: any): void {
    if (user.id && !user.userId) {
      user.userId = user.id
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  static calculateBackoffDelay(attempt: number, baseDelay: number = BASE_DELAY): number {
    return baseDelay * Math.pow(2, attempt)
  }

  /**
   * Parse retry-after header
   */
  static parseRetryAfter(retryAfter: string | null): number | null {
    if (!retryAfter) return null
    
    const retryAfterSeconds = parseInt(retryAfter)
    return isNaN(retryAfterSeconds) ? null : retryAfterSeconds * 1000
  }
}

// ============================================================================
// HTTP CLIENT
// ============================================================================

/**
 * Enhanced HTTP client with retry logic and rate limiting
 */
export class FaceitHttpClient {
  /**
   * Make request with retry logic and rate limiting
   */
  static async request<T>(
  url: string, 
  options: RequestInit, 
    maxRetries: number = MAX_RETRIES,
    baseDelay: number = BASE_DELAY
  ): Promise<ApiResponse<T>> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // Handle 429 (Too Many Requests) with exponential backoff
      if (response.status === 429) {
          const retryAfter = FaceitUtils.parseRetryAfter(response.headers.get('Retry-After'))
          const delay = retryAfter ?? FaceitUtils.calculateBackoffDelay(attempt, baseDelay)
        
        console.warn(`Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
          await this.delay(delay)
        continue
      }
      
      // Handle 404 (Not Found) - don't retry
      if (response.status === 404) {
          return { success: false, data: null, error: 'Not found' }
      }
      
      // Handle other errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
        return { success: true, data: data as T }
      
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Request failed after ${maxRetries} attempts:`, error)
          return { 
            success: false, 
            data: null, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
      }
      
      // Exponential backoff for other errors
        const delay = FaceitUtils.calculateBackoffDelay(attempt, baseDelay)
      console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, error)
        await this.delay(delay)
      }
    }
    
    return { success: false, data: null, error: 'Max retries exceeded' }
}

  /**
   * Make legacy FACEIT API request
   */
  static async legacyApiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${FACEIT_API_BASE_URL}${path}`
  const requestOptions = {
    credentials: 'include' as const,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

    const response = await this.request<any>(url, requestOptions)
  
    if (!response.success || !response.data) {
      return response
    }
  
  // Handle FACEIT API response format
    const { result, code, payload } = response.data
  if (
    (result && result.toUpperCase() !== 'OK') ||
    (code && code.toUpperCase() !== 'OPERATION-OK')
  ) {
      return { 
        success: false, 
        data: null, 
        error: `API Error: ${result || code}` 
      }
  }

    return { success: true, data: (payload || response.data) as T }
}

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
    }
}

// ============================================================================
// CACHE SERVICE
// ============================================================================

/**
 * Enhanced cache service with type safety
 */
export class FaceitCacheService {
  private static instance: FaceitCacheService
  private readonly memoryCache = new Map<string, CacheEntry<unknown>>()

  static getInstance(): FaceitCacheService {
    if (!FaceitCacheService.instance) {
      FaceitCacheService.instance = new FaceitCacheService()
    }
    return FaceitCacheService.instance
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first (fastest)
    const memoryCached = this.memoryCache.get(key)
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TIME) {
      return memoryCached.data as T
    }

    // Check storage cache using new system
    const cached = await getFromCache(key)
    if (cached) {
      // Update memory cache
      this.memoryCache.set(key, { data: cached, timestamp: Date.now() })
      return cached as T
    }

    return null
  }

  async set<T>(key: string, data: T): Promise<void> {
    const cacheEntry: CacheEntry<T> = { data, timestamp: Date.now() }
    
    // Update memory cache
    this.memoryCache.set(key, cacheEntry)
    
    // Determine cache type and save to storage
    const cacheType = FaceitUtils.getCacheType(key)
    await saveToCache(key, data, cacheType)
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    }
    
  async getCacheInfo(): Promise<{ memorySize: number; storageSize?: number }> {
    const memorySize = this.memoryCache.size
    return { memorySize }
  }
}

// ============================================================================
// DATA PROCESSORS
// ============================================================================

/**
 * Service for processing player statistics
 */
export class PlayerStatsProcessor {
  /**
   * Calculate player stats from legacy API data
   */
  static calculateFromLegacyApi(lifetimeStats: any, matches: any[]): PlayerStats {
    const totalMatches = lifetimeStats.m1 || 0
    
    if (matches.length === 0) {
      return this.createEmptyStats(totalMatches)
    }
    
    // Calculate win rate from match results
    const wins = matches.filter(match => {
      const matchResult = match.result || match.i10
      return matchResult === '1' || matchResult === 1
    }).length
    
    const winRate = Math.round((wins / matches.length) * 100)
    
    // Calculate averages from matches
    const stats = this.calculateAveragesFromMatches(matches)
    
    return {
      matches: totalMatches,
      averageKDRatio: stats.averageKDRatio,
      averageKRRatio: stats.averageKRRatio,
      averageHeadshots: stats.averageHeadshots,
      averageKills: stats.averageKills,
      averageADR: stats.averageADR,
      winRate
    }
  }

  private static createEmptyStats(matches: number): PlayerStats {
    return {
      matches,
      averageKDRatio: 0,
      averageKRRatio: 0,
      averageHeadshots: 0,
      averageKills: 0,
      averageADR: 0,
      winRate: 0
    }
  }
  
  private static calculateAveragesFromMatches(matches: any[]): {
    averageKDRatio: number
    averageKRRatio: number
    averageHeadshots: number
    averageKills: number
    averageADR: number
  } {
  const totalKills = matches.reduce((sum, match) => sum + (parseInt(match.i6) || 0), 0)
  const totalDeaths = matches.reduce((sum, match) => sum + (parseInt(match.i7) || 0), 0)
  const totalHeadshots = matches.reduce((sum, match) => sum + (parseInt(match.c4) || 0), 0)
  
  // Get K/D and K/R ratios from API fields
  const kdRatios = matches.map(match => parseFloat(match.c2) || 0).filter(kd => kd > 0)
  const krRatios = matches.map(match => parseFloat(match.c3) || 0).filter(kr => kr > 0)
  
  const averageKDRatio = kdRatios.length > 0 
    ? Number((kdRatios.reduce((sum, kd) => sum + kd, 0) / kdRatios.length).toFixed(2))
    : (totalDeaths > 0 ? Number((totalKills / totalDeaths).toFixed(2)) : 0)
    
  const averageKRRatio = krRatios.length > 0
    ? Number((krRatios.reduce((sum, kr) => sum + kr, 0) / krRatios.length).toFixed(2))
      : averageKDRatio
    
  const averageKills = Math.round(totalKills / matches.length)
  const averageHeadshots = Math.round(totalHeadshots / matches.length)
  
    // Calculate ADR from match data
    const averageADR = this.calculateAverageADR(matches)
    
    return {
      averageKDRatio,
      averageKRRatio,
      averageHeadshots,
      averageKills,
      averageADR
    }
  }

  private static calculateAverageADR(matches: any[]): number {
  const damageFields = ['damage', 'dmg', 'adr', 'i8', 'i9', 'c5', 'c6', 'c7', 'c8', 'c9']
  const damageMatches = matches.filter(match => {
      return damageFields.some(field => match[field] && !isNaN(parseFloat(match[field])))
  })
  
    if (damageMatches.length === 0) return 0
    
    const totalDamage = damageMatches.reduce((sum, match) => {
      for (const field of damageFields) {
        const damage = parseFloat(match[field])
        if (!isNaN(damage)) {
          return sum + damage
        }
      }
      return sum
    }, 0)
    
    return Math.round(totalDamage / damageMatches.length)
  }
}

/**
 * Service for processing match history
 */
export class MatchHistoryProcessor {
  /**
   * Convert stats data to match history format
   */
  static convertFromStatsData(data: any[]): MatchHistory {
    return {
      items: data.map((match: any, index: number) => {
        const timestamp = this.extractTimestamp(match, index)
        
        return {
          matchId: match.matchId || `estimated-${timestamp}-${index}`,
          gameId: 'cs2',
          nickname: match.nickname || 'Unknown',
          i1: match.map || 'Unknown',
          i2: match.teamId || '0',
          i10: match.result || '0',
          timestamp
        }
      })
    }
  }

  private static extractTimestamp(match: any, index: number): number {
    // Try to extract real timestamp from various possible fields
    if (match.timestamp) {
      return parseInt(match.timestamp)
    }
    
    if (match.date) {
      return new Date(match.date).getTime()
    }
    
    if (match.createdAt) {
      return new Date(match.createdAt).getTime()
    }
    
    if (match.matchDate) {
      return new Date(match.matchDate).getTime()
    }
    
    if (match.matchId && match.matchId.includes('-')) {
      const parts = match.matchId.split('-')
      if (parts.length > 0) {
        const possibleTimestamp = parseInt(parts[0])
        if (!isNaN(possibleTimestamp) && possibleTimestamp > 1000000000000) {
          return possibleTimestamp
        }
      }
    }
    
    // Estimate timestamp based on current time and index
    const now = Date.now()
    const estimatedDaysAgo = index * 2 // Assume 2 days between matches
    return now - (estimatedDaysAgo * 24 * 60 * 60 * 1000)
  }
}

// ============================================================================
// API SERVICES
// ============================================================================

/**
 * Service for user-related API operations
 */
export class UserApiService {
  private static readonly cache = FaceitCacheService.getInstance()

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<FaceitUser | null> {
    const cacheKey = `user:${userId}`
    
    const cached = await this.cache.get<FaceitUser>(cacheKey)
    if (cached) return cached

    try {
      const response = await FaceitHttpClient.legacyApiRequest<any>(`/users/v1/users/${userId}`)
      if (!response.success || !response.data) return null
      
      const user = FaceitUtils.camelCaseKeys(response.data)
      FaceitUtils.ensureUserId(user)
      
      await this.cache.set(cacheKey, user)
      return user
    } catch (error) {
      console.error('Failed to fetch user:', error)
      return null
    }
  }

  /**
   * Get player by nickname
   */
  static async getPlayer(nickname: string): Promise<FaceitUser | null> {
    const cacheKey = `player:${nickname}`
    
    const cached = await this.cache.get<FaceitUser>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      const response = await FaceitHttpClient.legacyApiRequest<any>(`/users/v1/nicknames/${nickname}`)
      if (!response.success || !response.data) {
        return null
      }
      
      const player = FaceitUtils.camelCaseKeys(response.data)
      FaceitUtils.ensureUserId(player)
      await this.cache.set(cacheKey, player)
      return player
    } catch (error) {
      return null
    }
  }
}

/**
 * Service for statistics-related API operations
 */
export class StatsApiService {
  private static readonly cache = FaceitCacheService.getInstance()

  /**
   * Get player statistics
   */
  static async getPlayerStats(userId: string, game: string = 'cs2', size: number = 20): Promise<PlayerStats | null> {
    if (!FaceitUtils.isSupportedGame(game)) {
      console.warn(`Unsupported game: ${game}`)
      return null
    }

    const cacheKey = `stats:${userId}:${game}:${size}`
    
    const cached = await this.cache.get<PlayerStats>(cacheKey)
    if (cached) return cached

    try {
      const legacyStats = await this.getLegacyStats(userId, game, size)
      if (legacyStats) {
        await this.cache.set(cacheKey, legacyStats)
        return legacyStats
      }
      
      return null
    } catch (error) {
      console.error('Failed to fetch player stats:', error)
      return null
    }
  }

  private static async getLegacyStats(userId: string, game: string, size: number): Promise<PlayerStats | null> {
    const [totalStatsResponse, averageStatsResponse] = await Promise.allSettled([
      FaceitHttpClient.legacyApiRequest<any>(`/stats/v1/stats/users/${userId}/games/${game}`),
      FaceitHttpClient.legacyApiRequest<any>(`/stats/v1/stats/time/users/${userId}/games/${game}?size=${size}`)
    ])

    if (totalStatsResponse.status !== 'fulfilled' || 
        !totalStatsResponse.value.success || 
        !totalStatsResponse.value.data || 
        Object.keys(totalStatsResponse.value.data).length === 0) {
      return null
    }

    if (averageStatsResponse.status !== 'fulfilled' || 
        !averageStatsResponse.value.success || 
        !averageStatsResponse.value.data || 
        !Array.isArray(averageStatsResponse.value.data)) {
      return null
    }

    // Filter 5v5 matches
    const fiveVFiveMatches = averageStatsResponse.value.data.filter((stats: any) => 
      stats.gameMode && stats.gameMode.includes('5v5')
    )

    if (fiveVFiveMatches.length <= 1) {
      return null
    }

    return PlayerStatsProcessor.calculateFromLegacyApi(
      totalStatsResponse.value.data.lifetime, 
      fiveVFiveMatches
    )
  }
}

/**
 * Service for match-related API operations
 */
export class MatchApiService {
  private static readonly cache = FaceitCacheService.getInstance()

  /**
   * Get match by ID
   */
  static async getMatch(matchId: string): Promise<FaceitMatch | null> {
    const cacheKey = `match:${matchId}`
    
    const cached = await this.cache.get<FaceitMatch>(cacheKey)
    if (cached) return cached

    try {
      const response = await FaceitHttpClient.legacyApiRequest<any>(`/match/v2/match/${matchId}`)
      if (!response.success || !response.data) return null
      
      const match = FaceitUtils.camelCaseKeys(response.data)
      await this.cache.set(cacheKey, match)
      return match
    } catch (error) {
      console.error('Failed to fetch match:', error)
      return null
    }
  }

  /**
   * Get player match history
   */
  static async getPlayerHistory(userId: string, page: number = 0): Promise<MatchHistory | null> {
    const cacheKey = `history:${userId}:${page}`
    
    const cached = await this.cache.get<MatchHistory>(cacheKey)
    if (cached) return cached

    try {
      const size = 30
      const to = Date.now()
      
      const response = await FaceitHttpClient.legacyApiRequest<any>(
        `/stats/v1/stats/time/users/${userId}/games/cs2?size=${size}&to=${to}`
      )
      
      if (!response.success || !response.data || !Array.isArray(response.data)) {
        return null
      }

      const history = MatchHistoryProcessor.convertFromStatsData(response.data)
      await this.cache.set(cacheKey, history)
      return history
    } catch (error) {
      console.error('Failed to fetch player history:', error)
      return null
    }
  }
}

// ============================================================================
// BATCH PROCESSING SERVICE
// ============================================================================

/**
 * Service for batch processing operations
 */
export class BatchProcessingService {
  /**
   * Get complete player data (player info, stats, history)
   */
  static async getPlayerDataParallel(nickname: string): Promise<PlayerData | null> {
    try {
      
      // Get player info first (needed for other requests)
      const player = await UserApiService.getPlayer(nickname)
      if (!player) {
        return null
      }
      

      // Fetch stats and history in parallel
      const [stats, history] = await Promise.allSettled([
          StatsApiService.getPlayerStats(player.userId, 'cs2', 20),
          MatchApiService.getPlayerHistory(player.userId, 0)
      ])

      const statsResult = stats.status === 'fulfilled' ? stats.value : null
      const historyResult = history.status === 'fulfilled' ? history.value : null
      
      return {
        player,
        stats: statsResult,
        history: historyResult
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get data for multiple players in parallel
   */
  static async getMultiplePlayersDataParallel(nicknames: string[]): Promise<Map<string, PlayerData>> {
    const results = new Map<string, PlayerData>() 

    // Process players in batches to avoid overwhelming the API
    const batches = BatchProcessingService.createBatches(nicknames, BATCH_SIZE)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      const batchPromises = batch.map(async (nickname) => {
        const data = await BatchProcessingService.getPlayerDataParallel(nickname)
        return { nickname, data }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const { nickname, data } = result.value
          if (data) {
            results.set(nickname, data)
          }
        } else {
        }
      }

      // Small delay between batches to respect rate limits
      if (batches.length > 1) {
        await BatchProcessingService.delay(200)
      }
    }

    return results
  }

  static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ============================================================================
// PUBLIC API EXPORTS
// ============================================================================

// Main API functions (legacy exports for backward compatibility)
export const getUser = UserApiService.getUser
export const getPlayer = UserApiService.getPlayer
export const getPlayerStats = StatsApiService.getPlayerStats
export const getMatch = MatchApiService.getMatch
export const getPlayerHistory = MatchApiService.getPlayerHistory
export const getPlayerDataParallel = BatchProcessingService.getPlayerDataParallel
export const getMultiplePlayersDataParallel = BatchProcessingService.getMultiplePlayersDataParallel

// Utility exports
export const isSupportedGame = FaceitUtils.isSupportedGame
export { SUPPORTED_GAMES } 