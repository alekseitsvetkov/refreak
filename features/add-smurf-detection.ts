import React from 'react'
import { getPlayer, getPlayerStats, getPlayerHistory, getMultiplePlayersDataParallel, type PlayerStats, type FaceitUser, type MatchHistory } from '../lib/faceit-api'
import { 
  MatchRoomUtils, 
  DomQueryService, 
  FactionService, 
  PartyColorService, 
  MatchDataService 
} from '../lib/match-room'
import { setFeatureAttribute, hasFeatureAttribute, isFaceitNext } from '../lib/dom-element'
import { renderReactComponent } from '../lib/react-renderer'
import { SmurfIndicator } from '../components/SmurfIndicator'
import { SmurfDetectionLoader } from '../components/SmurfDetectionLoader'
import { SmurfDetectionHeaderLoader } from '../components/SmurfDetectionHeaderLoader'
import { queryClient } from '../lib/react-query-provider'
import { faceitQueryKeys } from '../hooks/use-faceit-api'
import { saveToCache, getFromCache, clearCache } from '../lib/cache-sync'
import { waitForPlayerCards } from '../lib/utils'

// Function to check if current page is a match room (not scoreboard)
function isMatchRoomPage(): boolean {
  const currentUrl = window.location.href
  
  // Check for active match room
  const matchRoomPattern = /^https:\/\/www\.faceit\.com\/[a-z]{2}\/cs2\/room\/[^\/]+$/
  const isActiveRoom = matchRoomPattern.test(currentUrl)
  
  // Check for match results page (new support)
  const matchResultsPattern = /^https:\/\/www\.faceit\.com\/[a-z]{2}\/cs2\/results\/[^\/]+$/
  const isResultsPage = matchResultsPattern.test(currentUrl)
  
  // Check for any page with player cards (fallback)
  const hasPlayerCards = document.querySelector('[type="button"][aria-haspopup="dialog"], [class*="ListContentPlayer__Holder"]')
  const isPageWithPlayers = !!hasPlayerCards
  
  return isActiveRoom || isResultsPage || isPageWithPlayers
}

interface SmurfData {
  nickname: string
  confidence: number
  reasons: string[]
  stats?: PlayerStats
}

interface SmurfDetectionConfig {
  minMatches: number
  maxMatches: number
  minKDRatio: number
  minWinRate: number
  maxAccountAge: number // in days
  suspiciousLevels: number[]
}

const DEFAULT_CONFIG: SmurfDetectionConfig = {
  minMatches: 50,        // Изменено: теперь игроки с <50 матчей считаются подозрительными
  maxMatches: 2000,       
  minKDRatio: 1,       
  minWinRate: 55,        
  maxAccountAge: 365,     
  suspiciousLevels: [1, 2, 3, 4]
}

class SmurfDetector {
  private config: SmurfDetectionConfig
  private processedPlayers = new Set<string>()

  constructor(config: Partial<SmurfDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async analyzePlayer(nickname: string): Promise<SmurfData | null> {
    try {
      // Проверяем кеш storage
      const playerCacheKey = `player:${nickname}`
      let cachedPlayer = await getFromCache(playerCacheKey)
      
      let player: FaceitUser | null
      if (cachedPlayer) {
        player = cachedPlayer as FaceitUser
      } else {
        player = await getPlayer(nickname)
        if (player) {
          // Сохраняем в кеш storage
          await saveToCache(playerCacheKey, player, 'player')
          // Также сохраняем в React Query кеш
          const playerQueryKey = faceitQueryKeys.player(nickname)
          queryClient.setQueryData(playerQueryKey, player)
        }
      }
      
      if (!player) {
        return null
      }

      // Проверяем кеш статистики
      const statsCacheKey = `stats:${player.userId}:cs2:20`
      let cachedStats = await getFromCache(statsCacheKey)
      
      let stats: PlayerStats | null
      if (cachedStats) {
        stats = cachedStats as PlayerStats
      } else {
        stats = await getPlayerStats(player.userId, 'cs2', 20)
        if (stats) {
          // Сохраняем в кеш storage
          await saveToCache(statsCacheKey, stats, 'playerStats')
          // Также сохраняем в React Query кеш
          const statsQueryKey = faceitQueryKeys.playerStats(player.userId, 'cs2', 20)
          queryClient.setQueryData(statsQueryKey, stats)
        }
      }
      
      if (!stats) {
        return null
      }

      // Проверяем кеш истории (опционально)
      let history = null
      try {
        const historyCacheKey = `history:${player.userId}:0`
        let cachedHistory = await getFromCache(historyCacheKey)
        
        if (cachedHistory) {
          history = cachedHistory as MatchHistory
        } else {
          history = await getPlayerHistory(player.userId, 0)
          if (history) {
            // Сохраняем в кеш storage
            await saveToCache(historyCacheKey, history, 'playerHistory')
            // Также сохраняем в React Query кеш
            const historyQueryKey = faceitQueryKeys.playerHistory(player.userId, 0)
            queryClient.setQueryData(historyQueryKey, history)
          }
        }
      } catch (error) {
      }
      
      return this.calculateSmurfIndicator(nickname, player, stats, history)
    } catch (error) {
      console.error(`Failed to analyze player ${nickname}:`, error)
      return null
    }
  }

  // Метод для анализа игрока с предзагруженными данными
  analyzePlayerWithData(
    nickname: string, 
    player: FaceitUser, 
    stats: PlayerStats | null, 
    history: MatchHistory | null
  ): SmurfData | null {
    if (!stats) {
      return null
    }

    const result = this.calculateSmurfIndicator(nickname, player, stats, history)

    
    return result
  }

  // Извлекаем логику расчета smurf индикатора в переиспользуемый метод
  private calculateSmurfIndicator(
    nickname: string, 
    player: FaceitUser, 
    stats: PlayerStats, 
    history: MatchHistory | null
  ): SmurfData | null {
    
    const reasons: string[] = []
    let confidence = 0

    // Check match count (most important indicator)
    if (stats.matches > this.config.maxMatches) {
      // Игроки с количеством матчей больше maxMatches полностью исключаются из анализа
      return null
    } else if (stats.matches < 30) {
      reasons.push(`Very low match count: ${stats.matches}`)
      confidence += 40 // Very high weight for very low match count
    } else if (stats.matches < 100) {
      reasons.push(`Low match count: ${stats.matches}`)
      confidence += 30 // High weight for low match count
    } else if (stats.matches < 200) {
      reasons.push(`Moderate match count: ${stats.matches}`)
      confidence += 20 // Moderate weight for moderate match count
    } else if (stats.matches < 350) {
      reasons.push(`Average match count: ${stats.matches}`)
      confidence += 10 // Low weight for average match count
    }

    // Check K/D ratio with ranges
    if (stats.averageKDRatio > 2.5) {
      reasons.push(`Extremely high K/D ratio: ${stats.averageKDRatio}`)
      confidence += 35
    } else if (stats.averageKDRatio > 2.0) {
      reasons.push(`Very high K/D ratio: ${stats.averageKDRatio}`)
      confidence += 30
    } else if (stats.averageKDRatio > 1.5) {
      reasons.push(`High K/D ratio: ${stats.averageKDRatio}`)
      confidence += 25
    } else if (stats.averageKDRatio > 1.2) {
      reasons.push(`Above average K/D ratio: ${stats.averageKDRatio}`)
      confidence += 15
    } else if (stats.averageKDRatio > 1.0) {
      reasons.push(`Good K/D ratio: ${stats.averageKDRatio}`)
      confidence += 10
    }

    // Check K/R ratio with ranges
    if (stats.averageKRRatio > 2.5) {
      reasons.push(`Extremely high K/R ratio: ${stats.averageKRRatio}`)
      confidence += 30
    } else if (stats.averageKRRatio > 2.0) {
      reasons.push(`Very high K/R ratio: ${stats.averageKRRatio}`)
      confidence += 25
    } else if (stats.averageKRRatio > 1.5) {
      reasons.push(`High K/R ratio: ${stats.averageKRRatio}`)
      confidence += 20
    } else if (stats.averageKRRatio > 1.2) {
      reasons.push(`Above average K/R ratio: ${stats.averageKRRatio}`)
      confidence += 12
    } else if (stats.averageKRRatio > 1.0) {
      reasons.push(`Good K/R ratio: ${stats.averageKRRatio}`)
      confidence += 8
    }

    // Check win rate with ranges
    if (stats.winRate > 85) {
      reasons.push(`Extremely high win rate: ${stats.winRate}%`)
      confidence += 25
    } else if (stats.winRate > 75) {
      reasons.push(`Very high win rate: ${stats.winRate}%`)
      confidence += 20
    } else if (stats.winRate > 65) {
      reasons.push(`High win rate: ${stats.winRate}%`)
      confidence += 15
    } else if (stats.winRate > 55) {
      reasons.push(`Above average win rate: ${stats.winRate}%`)
      confidence += 10
    } else if (stats.winRate > 45) {
      reasons.push(`Good win rate: ${stats.winRate}%`)
      confidence += 5
    }

    // Check account level with ranges
    if (player.level) {
      if (player.level <= 3) {
        reasons.push(`Very low level: ${player.level}`)
        confidence += 25
      } else if (player.level <= 5) {
        reasons.push(`Low level: ${player.level}`)
        confidence += 20
      } else if (player.level <= 8) {
        reasons.push(`Moderate level: ${player.level}`)
        confidence += 15
      } else if (player.level <= 12) {
        reasons.push(`Average level: ${player.level}`)
        confidence += 10
      } else if (player.level <= 20) {
        reasons.push(`High level: ${player.level}`)
        confidence += 5
      }
    }

    // Additional checks for classic smurf patterns
    // Check if player has very high stats with low match count (classic smurf pattern)
    if (stats.matches < 30 && stats.averageKDRatio > 1.8 && stats.winRate > 70) {
      reasons.push(`Classic smurf pattern: high stats with low matches`)
      confidence += 20
    }
    
    // Check if player has very high K/R with low match count (another smurf indicator)
    if (stats.matches < 50 && stats.averageKRRatio > 1.5 && stats.winRate > 65) {
      reasons.push(`High K/R with low matches: potential smurf`)
      confidence += 15
    }

    // Check if player has very high headshot percentage with low matches
    if (stats.matches < 100 && stats.averageHeadshots > 60) {
      reasons.push(`High headshot percentage: ${stats.averageHeadshots}%`)
      confidence += 10
    }

    // Check if player has very high ADR with low matches
    if (stats.matches < 100 && stats.averageADR > 100) {
      reasons.push(`High ADR: ${stats.averageADR}`)
      confidence += 10
    }

    // Cap confidence at 100%
    confidence = Math.min(confidence, 100)

    // Show smurf only if confidence is 50% or higher
    if (confidence >= 51) {
      return {
        nickname,
        confidence,
        reasons,
        stats
      }
    }

    return null
  }

    async detectSmurfsInMatch(): Promise<SmurfData[]> {
    
    const roomId = MatchRoomUtils.getRoomId()
    
    if (!roomId) {
      console.warn('No room ID found, but continuing with smurf detection...')
    }

    // Find team containers
    const teamElements = DomQueryService.findTeamContainers(document.body)
    if (!teamElements || teamElements.length === 0) {
      console.warn('No team elements found, skipping smurf detection')
      return []
    }

    // Extract all player nicknames
    const allNicknames: string[] = []
    const processedNicknames = new Set<string>()

    for (const teamElement of teamElements) {
      const playerCards = DomQueryService.findPlayerCards(teamElement)

      for (const card of playerCards) {
        const nickname = DomQueryService.extractNickname(card)
        if (nickname && !processedNicknames.has(nickname)) {
          allNicknames.push(nickname)
          processedNicknames.add(nickname)
        }
      }
    }

    if (allNicknames.length === 0) {
      return []
    }

    // Use React Query for batch processing
    try {
      
      // Получаем данные всех игроков параллельно
      const playersData = await getMultiplePlayersDataParallel(allNicknames)
      
      // Анализируем каждого игрока
      const smurfs: SmurfData[] = []
      
      for (const [nickname, data] of playersData) {
        if (this.processedPlayers.has(nickname)) {
          continue
        }
        
        this.processedPlayers.add(nickname)
        
        
        
        const smurfData = this.analyzePlayerWithData(
          nickname, 
          data.player!, 
          data.stats, 
          data.history
        )
        
        if (smurfData) {
          smurfs.push(smurfData)
        }
      }
      
      return smurfs
      
    } catch (error) {
      return []
    }
  }

  // Функция для очистки React Query кеша
  public clearReactQueryCache(type?: 'player' | 'playerStats' | 'playerHistory' | 'match' | 'multiplePlayers'): void {
    try {
      if (type) {
        // Очищаем только определенный тип
        const queries = queryClient.getQueryCache().getAll()
        queries.forEach(query => {
          const queryKey = query.queryKey
          if (Array.isArray(queryKey) && queryKey[0] === 'faceit' && queryKey[1] === type) {
            queryClient.removeQueries({ queryKey })
          }
        })    
      } else {
        // Очищаем весь React Query кеш
        queryClient.clear()
      }
    } catch (error) {
      console.warn('Failed to clear React Query cache:', error)
    }
  }
}

// Main function to add smurf detection to the page
export async function addSmurfDetection() {
  
  // Check if we're on a match room page (not scoreboard)
  if (!isMatchRoomPage()) {
    return
  }
  
  // Check if already processed
  if (hasFeatureAttribute('smurf-detection-react-query', document.body)) {
    return
  }

  // Wait for content to load
  await waitForContent()

  // Add global tooltip handler
  addGlobalTooltipHandler()

  // Clear existing indicators
  clearExistingIndicators()

  // Show loading indicators
  addLoadingIndicatorsToPage()

  // Create detector instance
  const detector = new SmurfDetector()

  try {
    // Detect smurfs
    const smurfs = await detector.detectSmurfsInMatch()
    
    // Clear loading indicators
    const loadingIndicators = DomQueryService.selectAll('[data-refreak-smurf-loading]')
    loadingIndicators.forEach((indicator: Element) => indicator.remove())
    
    if (smurfs.length > 0) {
      addSmurfIndicatorsToPage(smurfs)
    }
  } catch (error) {
    console.error('Failed to add smurf detection with React Query:', error)
    
    // Clear loading indicators on error
    const loadingIndicators = DomQueryService.selectAll('[data-refreak-smurf-loading]')
    loadingIndicators.forEach((indicator: Element) => indicator.remove())
  }

  // Mark as processed
  setFeatureAttribute('smurf-detection-react-query', document.body)
}

// Helper functions (same as in original file)
function addGlobalTooltipHandler() {
  // Add any global tooltip handling logic here
}

function clearExistingIndicators() {
  // Remove existing smurf indicators
  const existingIndicators = DomQueryService.selectAll('[data-refreak-smurf-indicator]')
  existingIndicators.forEach((indicator: Element) => indicator.remove())
  
  // Remove loading indicators from player cards
  const loadingIndicators = DomQueryService.selectAll('[data-refreak-smurf-loading]')
  loadingIndicators.forEach((indicator: Element) => indicator.remove())
  
  // Remove loading indicators from header
  const headerLoadingIndicators = DomQueryService.selectAll('[data-refreak-smurf-loading]')
  headerLoadingIndicators.forEach((indicator: Element) => indicator.remove())
}

function addLoadingIndicatorsToPage() {
  const teamElements = DomQueryService.findTeamContainers(document.body)
  if (!teamElements || teamElements.length === 0) {
    return
  }

  for (const teamElement of teamElements) {
    const playerCards = DomQueryService.findPlayerCards(teamElement)
    
    for (const card of playerCards) {
      addLoadingIndicatorToCard(card)
    }
  }
  
  // Add loading indicator to header if "Smurf detection" text is found
  addLoadingIndicatorToHeader()
}

function addLoadingIndicatorToHeader() {
  // Look for "Smurf detection" text in the page
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const text = node.textContent?.trim()
        if (text === 'Smurf detection') {
          return NodeFilter.FILTER_ACCEPT
        }
        return NodeFilter.FILTER_REJECT
      }
    }
  )
  
  const smurfDetectionTextNode = walker.nextNode()
  if (smurfDetectionTextNode && smurfDetectionTextNode.parentElement) {
    const parentElement = smurfDetectionTextNode.parentElement
    
    // Create loading indicator
    const loadingContainer = document.createElement('div')
    loadingContainer.setAttribute('data-refreak-smurf-loading', '')
    loadingContainer.style.display = 'inline-flex'
    loadingContainer.style.alignItems = 'center'
    loadingContainer.style.gap = '8px'
    loadingContainer.style.marginLeft = '8px'
    
    // Insert after the text
    parentElement.appendChild(loadingContainer)
    
    // Render loading component
    renderReactComponent(SmurfDetectionHeaderLoader, {}, loadingContainer)
  }
}

function addLoadingIndicatorToCard(card: Element) {
  // Try to find ListContentPlayer element first
  const listContentPlayer = card.querySelector('[data-testid="ListContentPlayer"]') || 
                           card.querySelector('.ListContentPlayer') ||
                           card.querySelector('[class*="ListContentPlayer"]')
  
  if (listContentPlayer) {
    // Create loading indicator with absolute positioning
    const loadingContainer = document.createElement('div')
    loadingContainer.setAttribute('data-refreak-smurf-loading', '')
    loadingContainer.style.cssText = `
      position: absolute;
      right: 0;
      top: -16px;
      border-radius: 4px;
      z-index: 1000;
    `
    
    // Ensure parent has relative positioning
    const parentElement = listContentPlayer.parentElement
    if (parentElement) {
      const parentStyle = parentElement.style
      if (parentStyle.position !== 'absolute' && parentStyle.position !== 'relative') {
        parentStyle.position = 'relative'
      }
    }
    
    // Insert before ListContentPlayer
    listContentPlayer.parentNode?.insertBefore(loadingContainer, listContentPlayer)
    
    // Render loading component
    renderReactComponent(SmurfDetectionLoader, {}, loadingContainer)
    return
  }
  
  // Fallback: Find the nickname element
  const nicknameElements = Array.from(card.querySelectorAll('[class*="Nickname"]'))
  let nicknameElement: Element | null = null
  
  for (const el of nicknameElements) {
    const text = el.textContent?.trim()
    if (text && text.length > 0 && !el.querySelector('svg')) {
      nicknameElement = el
      break
    }
  }
  
  // Fallback to Name elements
  if (!nicknameElement) {
    const nameElements = Array.from(card.querySelectorAll('[class*="Name"]'))
    for (const el of nameElements) {
      const text = el.textContent?.trim()
      if (text && text.length > 0 && !el.querySelector('svg')) {
        nicknameElement = el
        break
      }
    }
  }
  
  if (!nicknameElement) {
    return
  }

  // Create and render the loading indicator
  const loadingContainer = document.createElement('div')
  loadingContainer.setAttribute('data-refreak-smurf-loading', '')
  loadingContainer.style.display = 'inline-block'
  loadingContainer.style.marginLeft = '8px'
  loadingContainer.style.verticalAlign = 'middle'

  // Insert after nickname
  nicknameElement.parentNode?.insertBefore(loadingContainer, nicknameElement.nextSibling)

  // Render loading component
  renderReactComponent(SmurfDetectionLoader, {}, loadingContainer)
}

async function waitForContent(): Promise<void> {
  try {
    await waitForPlayerCards(15000) // 15 second timeout
  } catch (error) {
    console.warn('Timeout waiting for player cards, proceeding anyway:', error)
    
    // Fallback: check if we have at least some content
    const roomId = MatchRoomUtils.getRoomId()
    const teamElements = DomQueryService.findTeamContainers(document.body)
    
    if (!roomId) {
      console.warn('No room ID found, but continuing...')
    }
    
    if (!teamElements || teamElements.length === 0) {
      console.warn('No team elements found, but continuing...')
    }
    
    // Don't throw error, just log warnings and continue
    // This allows the detection to proceed even if some elements are missing
  }
}

function addSmurfIndicatorsToPage(smurfs: SmurfData[]) {
  
  const teamElements = DomQueryService.findTeamContainers(document.body)
  if (!teamElements || teamElements.length === 0) {
    return
  }

  // Create a map for quick lookup
  const smurfMap = new Map(smurfs.map(smurf => [smurf.nickname.toLowerCase(), smurf]))

  for (const teamElement of teamElements) {
    const playerCards = DomQueryService.findPlayerCards(teamElement)
    
    for (const card of playerCards) {
      const nickname = DomQueryService.extractNickname(card)
      if (!nickname) continue

      const smurf = smurfMap.get(nickname.toLowerCase())
      if (smurf) {
        addSmurfIndicatorToCard(card, smurf)
      }
    }
  }
}

function addSmurfIndicatorToCard(card: Element, smurf: SmurfData) {
  // Try to find ListContentPlayer element first (like in original function)
  const listContentPlayer = card.querySelector('[data-testid="ListContentPlayer"]') || 
                           card.querySelector('.ListContentPlayer') ||
                           card.querySelector('[class*="ListContentPlayer"]')
  
  if (listContentPlayer) {
    
    // Create indicator with absolute positioning
    const indicatorContainer = document.createElement('div')
    indicatorContainer.setAttribute('data-refreak-smurf-indicator', '')
    indicatorContainer.style.cssText = `
      position: absolute;
      right: 0;
      top: -16px;
      border-radius: 4px;
      z-index: 1000;
    `
    
    // Ensure parent has relative positioning
    const parentElement = listContentPlayer.parentElement
    if (parentElement) {
      const parentStyle = parentElement.style
      if (parentStyle.position !== 'absolute' && parentStyle.position !== 'relative') {
        parentStyle.position = 'relative'
      }
    }
    
    // Insert before ListContentPlayer
    listContentPlayer.parentNode?.insertBefore(indicatorContainer, listContentPlayer)
    
    // Render React component
    renderReactComponent(
      SmurfIndicator,
      {
        nickname: smurf.nickname,
        confidence: smurf.confidence,
        reasons: smurf.reasons,
        stats: smurf.stats
      },
      indicatorContainer
    )
    return
  }
  
  // Fallback: Find the nickname element using the same logic as extractNickname
  const nicknameElements = Array.from(card.querySelectorAll('[class*="Nickname"]'))
  let nicknameElement: Element | null = null
  
  for (const el of nicknameElements) {
    const text = el.textContent?.trim()
    if (text && text.length > 0 && !el.querySelector('svg')) {
      nicknameElement = el
      break
    }
  }
  
  // Fallback to Name elements
  if (!nicknameElement) {
    const nameElements = Array.from(card.querySelectorAll('[class*="Name"]'))
    for (const el of nameElements) {
      const text = el.textContent?.trim()
      if (text && text.length > 0 && !el.querySelector('svg')) {
        nicknameElement = el
        break
      }
    }
  }
  
  if (!nicknameElement) {
    return
  }

  // Create and render the smurf indicator
  const indicatorContainer = document.createElement('div')
  indicatorContainer.setAttribute('data-refreak-smurf-indicator', '')
  indicatorContainer.style.display = 'inline-block'
  indicatorContainer.style.marginLeft = '8px'
  indicatorContainer.style.verticalAlign = 'middle'

  // Insert after nickname
  nicknameElement.parentNode?.insertBefore(indicatorContainer, nicknameElement.nextSibling)

  // Render React component
  renderReactComponent(
    SmurfIndicator,
    {
      nickname: smurf.nickname,
      confidence: smurf.confidence,
      reasons: smurf.reasons,
      stats: smurf.stats
    },
    indicatorContainer
  )
} 