import { storage } from '#imports'
import { FACEIT_CONFIG, validateConfig } from './config'

// Define cache storage item
const faceitCache = storage.defineItem<Record<string, { data: any; timestamp: number }>>('local:faceitCache', {
  fallback: {}
})

// Types for Open API
export interface FaceitUser {
  userId: string
  nickname: string
  avatar?: string
  country?: string
  level?: number
  id?: string // Add id field for API compatibility
}

// Open API response types
export interface OpenApiPlayer {
  player_id: string
  nickname: string
  avatar?: string
  country?: string
  skill_level?: number
  faceit_url?: string
  membership_type?: string
  memberships?: string[]
  games?: Record<string, {
    game_id: string
    skill_level?: number
    region?: string
    game_player_id?: string
    skill_level_label?: string
  }>
}

export interface OpenApiPlayerStats {
  player_id: string
  game_id: string
  lifetime: {
    'Recent Results'?: string[]
    'Average K/D Ratio'?: string
    'Average Headshots %'?: string
    'Total Headshots %'?: string
    'Current Win Streak'?: string
    'Matches'?: string
    'Average K/R Ratio'?: string
    'Total Headshots'?: string
    'Win Rate %'?: string
    'Average Triple Kills'?: string
    'Average Quadro Kills'?: string
    'Average Penta Kills'?: string
    'K/D Ratio'?: string
    'Longest Win Streak'?: string
    'Average Kills'?: string
    'Total Matches'?: string
    'Average Deaths'?: string
    'Total Kills'?: string
    'Total Deaths'?: string
    'Average MVPs'?: string
    'Total MVPs'?: string
    'Average ADR'?: string
    'ADR'?: string
    'Average Damage'?: string
    'Damage'?: string
  }
  segments?: Array<{
    type: string
    attributes: Record<string, any>
    metadata: Record<string, any>
  }>
}

export interface FaceitMatch {
  matchId: string
  gameId: string
  state: string
  faction1: FaceitPlayer[]
  faction2: FaceitPlayer[]
  teams?: {
    faction1: { roster: FaceitPlayer[] }
    faction2: { roster: FaceitPlayer[] }
  }
  entityCustom?: {
    parties: Record<string, string[]>
  }
}

export interface FaceitPlayer {
  id: string
  nickname: string
  avatar?: string
  skillLevel?: number
  activeTeamId?: string
}

export interface PlayerStats {
  matches: number
  averageKDRatio: number
  averageKRRatio: number
  averageHeadshots: number
  averageKills: number
  averageADR: number
  winRate: number
}

export interface MatchHistory {
  items: Array<{
    matchId: string
    gameId: string
    nickname: string
    i1: string // map name
    i2: string // team id
    i10: string // result (1 = win, 0 = loss)
    timestamp: number // timestamp for age calculation
  }>
}

// Constants
const FACEIT_API_BASE_URL = 'https://www.faceit.com/api' // Legacy API (fallback)
// const CACHE_TIME = FACEIT_CONFIG.CACHE_TIME
const CACHE_TIME = 0
const SUPPORTED_GAMES = new Set(['csgo', 'cs2'])

// Cache implementation using WXT storage
class FaceitApiCache {
  private static instance: FaceitApiCache
  private memoryCache = new Map<string, { data: any; timestamp: number }>()

  static getInstance(): FaceitApiCache {
    if (!FaceitApiCache.instance) {
      FaceitApiCache.instance = new FaceitApiCache()
    }
    return FaceitApiCache.instance
  }

  async get(key: string): Promise<any | null> {
    // Check memory cache first (fastest)
    const memoryCached = this.memoryCache.get(key)
    if (memoryCached && Date.now() - memoryCached.timestamp < CACHE_TIME) {
      console.log(`Memory cache hit for: ${key}`)
      return memoryCached.data
    }

    // Check browser storage cache
    try {
      const cacheData = await faceitCache.getValue()
      const cached = cacheData[key]
      if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
        console.log(`Storage cache hit for: ${key}`)
        // Update memory cache
        this.memoryCache.set(key, cached)
        return cached.data
      }
    } catch (error) {
      console.warn('Failed to read from storage cache:', error)
    }

    return null
  }

  async set(key: string, data: any): Promise<void> {
    const cacheEntry = { data, timestamp: Date.now() }
    
    // Update memory cache
    this.memoryCache.set(key, cacheEntry)
    
    // Update browser storage cache
    try {
      const cacheData = await faceitCache.getValue()
      cacheData[key] = cacheEntry
      await faceitCache.setValue(cacheData)
      console.log(`Cached data for: ${key}`)
    } catch (error) {
      console.warn('Failed to write to storage cache:', error)
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear()
    
    try {
      await faceitCache.setValue({})
      console.log('Cleared all FACEIT cache entries')
    } catch (error) {
      console.warn('Failed to clear storage cache:', error)
    }
  }

  async getCacheInfo(): Promise<{ memorySize: number; storageSize?: number }> {
    const memorySize = this.memoryCache.size
    
    let storageSize: number | undefined
    try {
      const cacheData = await faceitCache.getValue()
      storageSize = Object.keys(cacheData).length
    } catch (error) {
      console.warn('Failed to get storage cache info:', error)
    }
    
    return { memorySize, storageSize }
  }
}

// Enhanced request wrapper with 429 handling
async function makeRequestWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // Handle 429 (Too Many Requests) with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        let delay = baseDelay * Math.pow(2, attempt)
        
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter)
          if (!isNaN(retryAfterSeconds)) {
            delay = retryAfterSeconds * 1000
          }
        }
        
        console.warn(`Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Handle 404 (Not Found) - don't retry
      if (response.status === 404) {
        return null
      }
      
      // Handle other errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data
      
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Request failed after ${maxRetries} attempts:`, error)
        throw error
      }
      
      // Exponential backoff for other errors
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Open API request wrapper with enhanced rate limiting
async function openApiRequest(path: string, options: RequestInit = {}): Promise<any> {
  if (!validateConfig()) {
    throw new Error('FACEIT API Key not configured')
  }

  const url = `${FACEIT_CONFIG.OPEN_API_BASE_URL}${path}`
  const requestOptions = {
    headers: {
      'Authorization': `Bearer ${FACEIT_CONFIG.API_KEY}`,
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  return makeRequestWithRetry(url, requestOptions, 5, 1000)
}

// Modern fetch wrapper with enhanced retry logic (Legacy API)
async function faceitApiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${FACEIT_API_BASE_URL}${path}`
  const requestOptions = {
    credentials: 'include' as const,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  const data = await makeRequestWithRetry(url, requestOptions, 5, 1000)
  
  if (!data) return null
  
  // Handle FACEIT API response format
  const { result, code, payload } = data
  if (
    (result && result.toUpperCase() !== 'OK') ||
    (code && code.toUpperCase() !== 'OPERATION-OK')
  ) {
    throw new Error(`API Error: ${result || code}`)
  }

  return payload || data
}

// Utility functions
function camelCaseKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelCaseKeys)
  }
  
  if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = camelCaseKeys(value)
    }
    return result
  }
  
  return obj
}

function isSupportedGame(game: string): boolean {
  return SUPPORTED_GAMES.has(game.toLowerCase())
}

// Main API functions
export async function getUser(userId: string): Promise<FaceitUser | null> {
  const cache = FaceitApiCache.getInstance()
  const cacheKey = `user:${userId}`
  
  const cached = await cache.get(cacheKey)
  if (cached) return cached

  try {
    const data = await faceitApiRequest(`/users/v1/users/${userId}`)
    if (!data) return null
    
    const user = camelCaseKeys(data)
    
    // Ensure userId is set from id field if not present
    if (user.id && !user.userId) {
      user.userId = user.id
    }
    
    await cache.set(cacheKey, user)
    return user
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return null
  }
}

export async function getPlayer(nickname: string): Promise<FaceitUser | null> {
  const cache = FaceitApiCache.getInstance()
  const cacheKey = `player:${nickname}`
  
  const cached = await cache.get(cacheKey)
  if (cached) {
    console.log(`Using cached player data for: ${nickname}`)
    return cached
  }

  try {
    console.log(`Fetching player data for: ${nickname}`)
    
    // Try Open API first
    try {
      const openApiData = await openApiRequest(`/players?nickname=${encodeURIComponent(nickname)}`)
      if (openApiData && openApiData.player_id) {
        console.log(`Open API player data for ${nickname}:`, openApiData)
        
        const player: FaceitUser = {
          userId: openApiData.player_id,
          nickname: openApiData.nickname,
          avatar: openApiData.avatar,
          country: openApiData.country,
          level: openApiData.skill_level,
          id: openApiData.player_id
        }
        
        console.log(`Final player object from Open API:`, player)
        await cache.set(cacheKey, player)
        return player
      }
    } catch (openApiError) {
      console.warn(`Open API failed for ${nickname}, trying legacy API:`, openApiError)
    }
    
    // Fallback to legacy API
    const data = await faceitApiRequest(`/users/v1/nicknames/${nickname}`)
    if (!data) {
      console.log(`No data returned for player: ${nickname}`)
      return null
    }
    
    const player = camelCaseKeys(data)
    console.log(`Player data for ${nickname}:`, player)
    console.log(`Player id field:`, player.id)
    console.log(`Player userId field:`, player.userId)
    
    // Ensure userId is set from id field if not present
    if (player.id && !player.userId) {
      player.userId = player.id
      console.log(`Set userId from id: ${player.userId}`)
    }
    
    console.log(`Final player object:`, player)
    await cache.set(cacheKey, player)
    return player
  } catch (error) {
    console.error('Failed to fetch player:', error)
    return null
  }
}

export async function getPlayerStats(userId: string, game: string = 'cs2', size: number = 20): Promise<PlayerStats | null> {
  if (!isSupportedGame(game)) {
    console.warn(`Unsupported game: ${game}`)
    return null
  }

  const cache = FaceitApiCache.getInstance()
  const cacheKey = `stats:${userId}:${game}:${size}`
  
  const cached = await cache.get(cacheKey)
  if (cached) return cached

  try {
    // Try Open API first
    try {
      const openApiStats = await openApiRequest(`/players/${userId}/games/${game}/stats`)
      if (openApiStats && openApiStats.lifetime) {
        console.log(`Open API stats for ${userId}:`, openApiStats)
        
        const stats = calculatePlayerStatsFromOpenApi(openApiStats.lifetime)
        await cache.set(cacheKey, stats)
        return stats
      }
    } catch (openApiError) {
      console.warn(`Open API stats failed for ${userId}, trying legacy API:`, openApiError)
    }
    
    // Fallback to legacy API - fetch total and average stats in parallel
    const [totalStatsData, averageStatsData] = await Promise.allSettled([
      faceitApiRequest(`/stats/v1/stats/users/${userId}/games/${game}`),
      faceitApiRequest(`/stats/v1/stats/time/users/${userId}/games/${game}?size=${size}`)
    ])

    // Check if both requests succeeded
    if (totalStatsData.status !== 'fulfilled' || !totalStatsData.value || Object.keys(totalStatsData.value).length === 0) {
      console.log(`Total stats failed for ${userId}`)
      return null
    }

    if (averageStatsData.status !== 'fulfilled' || !averageStatsData.value || !Array.isArray(averageStatsData.value)) {
      console.log(`Average stats failed for ${userId}`)
      return null
    }

    // Filter 5v5 matches
    const fiveVFiveMatches = averageStatsData.value.filter((stats: any) => 
      stats.gameMode && stats.gameMode.includes('5v5')
    )

    if (fiveVFiveMatches.length <= 1) {
      return null
    }

    // Calculate stats
    const stats = calculatePlayerStats(totalStatsData.value.lifetime, fiveVFiveMatches)
    await cache.set(cacheKey, stats)
    return stats
  } catch (error) {
    console.error('Failed to fetch player stats:', error)
    return null
  }
}

export async function getMatch(matchId: string): Promise<FaceitMatch | null> {
  const cache = FaceitApiCache.getInstance()
  const cacheKey = `match:${matchId}`
  
  const cached = await cache.get(cacheKey)
  if (cached) return cached

  try {
    const data = await faceitApiRequest(`/match/v2/match/${matchId}`)
    if (!data) return null
    
    const match = camelCaseKeys(data)
    await cache.set(cacheKey, match)
    return match
  } catch (error) {
    console.error('Failed to fetch match:', error)
    return null
  }
}

export async function getPlayerHistory(userId: string, page: number = 0): Promise<MatchHistory | null> {
  const cache = FaceitApiCache.getInstance()
  const cacheKey = `history:${userId}:${page}`
  
  const cached = await cache.get(cacheKey)
  if (cached) return cached

  try {
    // Use stats API with user cookies for authentication
    const size = 30
    const to = Date.now() // Current timestamp in milliseconds
    
    console.log(`Fetching player stats history for ${userId} with size=${size}`)

    try {
      const data = await faceitApiRequest(
        `/stats/v1/stats/time/users/${userId}/games/cs2?size=${size}&to=${to}`
      )
      
      if (!data || !Array.isArray(data)) {
        console.log(`No stats history data returned for player: ${userId}`)
        return null
      }
      
      console.log(`Raw history data for ${userId}:`, data)
      
      // Convert stats data to match history format with proper timestamps
      const history = {
        items: data.map((match: any, index: number) => {
          // Try to extract real timestamp from various possible fields
          let timestamp = null
          
          // Check for common timestamp fields
          if (match.timestamp) {
            timestamp = parseInt(match.timestamp)
          } else if (match.date) {
            timestamp = new Date(match.date).getTime()
          } else if (match.createdAt) {
            timestamp = new Date(match.createdAt).getTime()
          } else if (match.matchDate) {
            timestamp = new Date(match.matchDate).getTime()
          } else if (match.matchId && match.matchId.includes('-')) {
            // Try to extract timestamp from matchId if it's in timestamp format
            const parts = match.matchId.split('-')
            if (parts.length > 0) {
              const possibleTimestamp = parseInt(parts[0])
              if (!isNaN(possibleTimestamp) && possibleTimestamp > 1000000000000) {
                timestamp = possibleTimestamp
              }
            }
          }
          
          // If no timestamp found, estimate based on current time and index
          // (assuming matches are ordered by date, newest first)
          if (!timestamp) {
            const now = Date.now()
            const estimatedDaysAgo = index * 2 // Assume 2 days between matches
            timestamp = now - (estimatedDaysAgo * 24 * 60 * 60 * 1000)
          }
          
          return {
            matchId: match.matchId || `estimated-${timestamp}-${index}`,
            gameId: 'cs2',
            nickname: match.nickname || 'Unknown',
            i1: match.map || 'Unknown',
            i2: match.teamId || '0',
            i10: match.result || '0', // 1 = win, 0 = loss
            timestamp: timestamp // Add timestamp for age calculation
          }
        })
      }
      
      console.log(`Converted ${history.items.length} stats matches to history for ${userId}`)
      console.log(`History items with timestamps:`, history.items.map(item => ({
        matchId: item.matchId,
        timestamp: item.timestamp,
        date: new Date(item.timestamp).toISOString()
      })))
      
      await cache.set(cacheKey, history)
      return history
    } catch (apiError) {
      console.log(`Stats history API failed for ${userId}:`, apiError)
      return null
    }
  } catch (error) {
    console.error('Failed to fetch player history:', error)
    // Don't throw, just return null - history is optional for smurf detection
    return null
  }
}

// Helper functions
function calculatePlayerStats(lifetimeStats: any, matches: any[]): PlayerStats {
  console.log('Calculating player stats from API data:')
  console.log('Lifetime stats:', lifetimeStats)
  console.log('Matches data:', matches)
  
  // Log first match to see all available fields
  if (matches.length > 0) {
    console.log('First match fields:', Object.keys(matches[0]))
    console.log('First match data:', matches[0])
  }
  
  const totalMatches = lifetimeStats.m1 || 0
  
  if (matches.length === 0) {
    console.log('No matches data available')
    return {
      matches: totalMatches,
      averageKDRatio: 0,
      averageKRRatio: 0,
      averageHeadshots: 0,
      averageKills: 0,
      averageADR: 0,
      winRate: 0
    }
  }
  
  // Calculate win rate from match results
  const wins = matches.filter(match => {
    // Check if player's team won (i2 is player's team, result indicates win/loss)
    const playerTeam = match.i2
    const matchResult = match.result || match.i10
    return matchResult === '1' || matchResult === 1
  }).length
  
  const winRate = Math.round((wins / matches.length) * 100)
  
  // Calculate averages from matches using correct field mappings
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
    : averageKDRatio // Fallback to K/D if K/R not available
    
  const averageKills = Math.round(totalKills / matches.length)
  const averageHeadshots = Math.round(totalHeadshots / matches.length)
  
  // Try to calculate ADR from match data
  let averageADR = 0
  const damageFields = ['damage', 'dmg', 'adr', 'i8', 'i9', 'c5', 'c6', 'c7', 'c8', 'c9']
  const damageMatches = matches.filter(match => {
    for (const field of damageFields) {
      if (match[field] && !isNaN(parseFloat(match[field]))) {
        return true
      }
    }
    return false
  })
  
  if (damageMatches.length > 0) {
    const totalDamage = damageMatches.reduce((sum, match) => {
      for (const field of damageFields) {
        const damage = parseFloat(match[field])
        if (!isNaN(damage)) {
          return sum + damage
        }
      }
      return sum
    }, 0)
    averageADR = Math.round(totalDamage / damageMatches.length)
    console.log(`Calculated ADR from ${damageMatches.length} matches: ${averageADR}`)
  } else {
    console.log('No damage data found in matches')
  }
  
  const stats = {
    matches: totalMatches,
    averageKDRatio,
    averageKRRatio,
    averageHeadshots,
    averageKills,
    averageADR,
    winRate
  }
  
  console.log('Calculated stats:', stats)
  return stats
}

// Helper function for Open API stats
function calculatePlayerStatsFromOpenApi(lifetimeStats: any): PlayerStats {
  console.log('Available lifetime stats fields:', Object.keys(lifetimeStats))
  console.log('Lifetime stats values:', lifetimeStats)
  
  const matches = parseInt(lifetimeStats['Matches'] || lifetimeStats['Total Matches'] || '0')
  const kdRatio = parseFloat(lifetimeStats['Average K/D Ratio'] || lifetimeStats['K/D Ratio'] || '0')
  const krRatio = parseFloat(lifetimeStats['Average K/R Ratio'] || '0') || kdRatio // Use K/R if available, fallback to K/D
  const winRate = parseInt(lifetimeStats['Win Rate %'] || '0')
  const averageKills = parseFloat(lifetimeStats['Average Kills'] || '0')
  const averageHeadshots = parseFloat(lifetimeStats['Average Headshots %'] || '0')
  
  // Try to get ADR from different possible fields
  const averageADR = parseFloat(lifetimeStats['Average ADR'] || lifetimeStats['ADR'] || lifetimeStats['Average Damage'] || lifetimeStats['Damage'] || '0')
  
  console.log('Parsed stats:', {
    matches,
    kdRatio,
    krRatio,
    winRate,
    averageKills,
    averageHeadshots,
    averageADR
  })

  return {
    matches: matches,
    averageKDRatio: kdRatio,
    averageKRRatio: krRatio,
    averageHeadshots: Math.round(averageHeadshots),
    averageKills: Math.round(averageKills),
    averageADR: Math.round(averageADR),
    winRate: winRate
  }
}

// New function for parallel player data fetching
export async function getPlayerDataParallel(nickname: string): Promise<{
  player: FaceitUser | null
  stats: PlayerStats | null
  history: MatchHistory | null
} | null> {
  try {
    console.log(`Fetching player data in parallel for: ${nickname}`)
    
    // Get player info first (needed for other requests)
    const player = await getPlayer(nickname)
    if (!player) {
      console.log(`Player not found: ${nickname}`)
      return null
    }

    console.log(`Found player: ${nickname}, userId: ${player.userId}`)

    // Fetch stats and history in parallel
    const [stats, history] = await Promise.allSettled([
      getPlayerStats(player.userId, 'cs2', 20),
      getPlayerHistory(player.userId, 0)
    ])

    return {
      player,
      stats: stats.status === 'fulfilled' ? stats.value : null,
      history: history.status === 'fulfilled' ? history.value : null
    }
  } catch (error) {
    console.error(`Failed to fetch player data for ${nickname}:`, error)
    return null
  }
}

// New function for parallel batch processing
export async function getMultiplePlayersDataParallel(nicknames: string[]): Promise<Map<string, {
  player: FaceitUser | null
  stats: PlayerStats | null
  history: MatchHistory | null
}>> {
  console.log(`Fetching data for ${nicknames.length} players in parallel`)
  
  const results = new Map<string, {
    player: FaceitUser | null
    stats: PlayerStats | null
    history: MatchHistory | null
  }>()

  // Process players in batches to avoid overwhelming the API
  const batchSize = 3 // Process 3 players at a time
  const batches = []
  
  for (let i = 0; i < nicknames.length; i += batchSize) {
    batches.push(nicknames.slice(i, i + batchSize))
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async (nickname) => {
      const data = await getPlayerDataParallel(nickname)
      return { nickname, data }
    })

    const batchResults = await Promise.allSettled(batchPromises)
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const { nickname, data } = result.value
        if (data) {
          results.set(nickname, data)
        }
      }
    }

    // Small delay between batches to respect rate limits
    if (batches.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  console.log(`Successfully fetched data for ${results.size} out of ${nicknames.length} players`)
  return results
}

// Export constants
export { SUPPORTED_GAMES, isSupportedGame } 