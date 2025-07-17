import { getPlayer, getPlayerStats, getPlayerHistory, getMultiplePlayersDataParallel, type PlayerStats, type FaceitUser, type MatchHistory } from '../lib/faceit-api'
import { getRoomId, findTeamContainers, findPlayerCards, extractNickname, select, selectAll } from '../lib/match-room'
import { setFeatureAttribute, hasFeatureAttribute, isFaceitNext } from '../lib/dom-element'
import { renderReactComponent } from '../lib/react-renderer'
import { SmurfIndicator } from '../components/SmurfIndicator'

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
  maxMatches: 1000,       
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
      console.log(`Analyzing player: ${nickname}`)
      
      // Get player info
      const player = await getPlayer(nickname)
      if (!player) {
        console.log(`Player not found: ${nickname}`)
        return null
      }

      console.log(`Found player: ${nickname}, userId: ${player.userId}`)

      // Get player stats
      const stats = await getPlayerStats(player.userId, 'cs2', 20)
      if (!stats) {
        console.log(`No stats available for: ${nickname}`)
        return null
      }

      // Get player history for account age analysis (optional)
      let history = null
      try {
        history = await getPlayerHistory(player.userId, 0)
      } catch (error) {
        console.log(`History not available for ${nickname} (FACEIT API limitation)`)
      }
      
      return this.calculateSmurfIndicator(nickname, player, stats, history)
    } catch (error) {
      console.error(`Failed to analyze player ${nickname}:`, error)
      return null
    }
  }

  // New method to analyze player with pre-fetched data
  analyzePlayerWithData(
    nickname: string, 
    player: FaceitUser, 
    stats: PlayerStats | null, 
    history: MatchHistory | null
  ): SmurfData | null {
    if (!stats) {
      console.log(`No stats available for: ${nickname}`)
      return null
    }

    return this.calculateSmurfIndicator(nickname, player, stats, history)
  }

  // Extract smurf calculation logic to reusable method
  private calculateSmurfIndicator(
    nickname: string, 
    player: FaceitUser, 
    stats: PlayerStats, 
    history: MatchHistory | null
  ): SmurfData | null {
    console.log(`Analyzing smurf indicators for ${nickname}:`, { 
      player: { 
        nickname: player.nickname, 
        level: player.level, 
        userId: player.userId 
      }, 
      stats: {
        matches: stats.matches,
        averageKDRatio: stats.averageKDRatio,
        averageKRRatio: stats.averageKRRatio,
        winRate: stats.winRate,
        averageKills: stats.averageKills,
        averageHeadshots: stats.averageHeadshots
      }
    })
    
    const reasons: string[] = []
    let confidence = 0

    // Check match count (most important indicator)
    if (stats.matches < 30) {
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
    } else if (stats.matches > this.config.maxMatches) {
      reasons.push(`High match count: ${stats.matches}`)
      confidence += 5 // Reduced weight for high match count
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

    // Check account age (if history available) - TEMPORARILY DISABLED
    // if (history && history.items && history.items.length > 0) {
    //   console.log(`Analyzing account age for ${nickname} with ${history.items.length} matches`)
    //   
    //   // Sort matches by timestamp (oldest first)
    //   const sortedMatches = [...history.items].sort((a, b) => a.timestamp - b.timestamp)
    //   const firstMatch = sortedMatches[0] // Oldest match
    //   const lastMatch = sortedMatches[sortedMatches.length - 1] // Newest match
    //   
    //   console.log(`First match:`, firstMatch)
    //   console.log(`Last match:`, lastMatch)
    //   
    //   if (firstMatch && lastMatch && firstMatch.timestamp && lastMatch.timestamp) {
    //     const firstMatchDate = new Date(firstMatch.timestamp)
    //     const lastMatchDate = new Date(lastMatch.timestamp)
    //     const accountAge = (lastMatchDate.getTime() - firstMatchDate.getTime()) / (1000 * 60 * 60 * 24)
    //     
    //     console.log(`Account age calculation for ${nickname}:`)
    //     console.log(`First match date: ${firstMatchDate.toISOString()}`)
    //     console.log(`Last match date: ${lastMatchDate.toISOString()}`)
    //     console.log(`Account age: ${accountAge} days`)
    //     
    //     if (accountAge < this.config.maxAccountAge) {
    //       reasons.push(`New account: ${Math.round(accountAge)} days old`)
    //       confidence += 20
    //     }
    //   } else {
    //     console.log(`Missing timestamp data for ${nickname}`)
    //   }
    // } else {
    //   // History not available - this is normal for FACEIT API
    //   console.log(`Account age analysis skipped for ${nickname} (history unavailable)`)
    // }

    // Additional checks for classic smurf patterns
    // Check if player has very high stats with low match count (classic smurf pattern)
    if (stats.matches < 30 && stats.averageKDRatio > 1.8 && stats.winRate > 70) {
      reasons.push(`Classic smurf pattern: high stats with low matches`)
      confidence += 20
    }
    
    // Check if player has very high K/R with low match count (another smurf indicator)
    if (stats.matches < 30 && stats.averageKRRatio > 1.8) {
      reasons.push(`High K/R ratio with low matches: ${stats.averageKRRatio}`)
      confidence += 15
    }

    // Cap confidence at 100%
    confidence = Math.min(confidence, 100)

    console.log(`Smurf analysis for ${nickname}: confidence=${confidence}%, reasons:`, reasons)

    // Only return if confidence is high enough and we have reasons
    if (confidence >= 40 && reasons.length > 0) {
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
    // Reset processed players for new match
    this.processedPlayers.clear()
    
    const roomId = getRoomId()
    if (!roomId) {
      console.log('No room ID found')
      return []
    }

    // После ожидания загрузки контента, попробуем найти правильный root
    const mainContent = select('#__next')
    let teamContainers: Element[]
    
    if (!mainContent) {
      console.log('Main content not found, trying document.body')
      const mainContentFallback = document.body
      if (!mainContentFallback) {
        console.log('Neither #__next nor body found')
        return []
      }
      console.log('Using document.body as main content')
      teamContainers = findTeamContainers(mainContentFallback)
    } else {
      teamContainers = findTeamContainers(mainContent)
    }
    
    // Если не нашли контейнеры в #__next, попробуем document.body
    if (teamContainers.length === 0 && mainContent) {
      console.log('No team containers found in #__next, trying document.body')
      teamContainers = findTeamContainers(document.body)
    }
    
    console.log('Found team containers:', teamContainers.length)
    
    // Collect all nicknames first
    const nicknames: string[] = []
    for (const teamContainer of teamContainers) {
      const playerCards = findPlayerCards(teamContainer)
      console.log('Found player cards in team:', playerCards.length)
      
      for (const playerCard of playerCards) {
        const nickname = extractNickname(playerCard)
        console.log('Extracted nickname:', nickname)
        if (!nickname || this.processedPlayers.has(nickname)) continue

        this.processedPlayers.add(nickname)
        nicknames.push(nickname)
      }
    }

    if (nicknames.length === 0) {
      console.log('No players found to analyze')
      return []
    }

    console.log(`Analyzing ${nicknames.length} players in parallel`)

    // Fetch all player data in parallel
    const playersData = await getMultiplePlayersDataParallel(nicknames)
    
    const smurfs: SmurfData[] = []

    // Analyze each player with the fetched data
    for (const nickname of nicknames) {
      const data = playersData.get(nickname)
      if (!data || !data.player || !data.stats) {
        console.log(`No data available for ${nickname}`)
        continue
      }

      const smurfIndicator = this.analyzePlayerWithData(
        nickname, 
        data.player, 
        data.stats, 
        data.history
      )
      
      if (smurfIndicator) {
        smurfs.push(smurfIndicator)
      }
    }

    return smurfs
  }
}

export async function addSmurfDetection() {
  try {
    console.log('Smurf detection feature is running...')
    
    // Clear existing indicators first
    clearExistingIndicators()
    
    // Add global click handler to hide tooltips
    addGlobalTooltipHandler()
    
    // Wait for content to load
    await waitForContent()
    
    // Create detector instance
    const detector = new SmurfDetector()
    
    // Detect smurfs
    const smurfs = await detector.detectSmurfsInMatch()
    
    if (smurfs.length === 0) {
      console.log('No smurfs detected')
      return
    }

    console.log(`Detected ${smurfs.length} potential smurfs:`, smurfs)

    // Add smurf indicators to the page
    addSmurfIndicatorsToPage(smurfs)
    
  } catch (error) {
    console.error('Failed to add smurf detection:', error)
  }
}

// Global handler is no longer needed with React popover
function addGlobalTooltipHandler() {
  // Popover handles its own positioning and events
  console.log('Global tooltip handler not needed with React popover')
}

// Clear existing smurf indicators
function clearExistingIndicators() {
  const existingIndicators = document.querySelectorAll('.refreak-smurf-indicator')
  console.log(`Clearing ${existingIndicators.length} existing smurf indicators`)
  
  existingIndicators.forEach((indicator) => {
    // Call cleanup function if it exists
    const cleanupAttr = indicator.getAttribute('data-cleanup')
    if (cleanupAttr === 'true') {
      // The cleanup function is stored in the React component
      // We'll just remove the element and let React handle cleanup
    }
    indicator.remove()
  })
}

// Функция для ожидания загрузки контента
async function waitForContent(): Promise<void> {
  return new Promise((resolve) => {
    let attempts = 0
    const maxAttempts = 50 // 5 секунд максимум
    
    const checkContent = () => {
      attempts++
      console.log(`Checking for content, attempt ${attempts}`)
      
      // Проверяем наличие элементов игроков
      const playerButtons = document.querySelectorAll('[type="button"][aria-haspopup="dialog"]')
      const avatars = document.querySelectorAll('img[aria-label="avatar"]')
      const playersText = Array.from(document.querySelectorAll('span,div'))
        .filter((el: Element) => el.textContent?.includes('Players'))
      
      console.log(`Found ${playerButtons.length} player buttons, ${avatars.length} avatars, ${playersText.length} "Players" elements`)
      
      // Если нашли достаточно элементов, считаем что контент загружен
      if (playerButtons.length >= 5 || avatars.length >= 5 || playersText.length >= 2) {
        console.log('Content loaded successfully')
        resolve()
        return
      }
      
      // Если превысили лимит попыток, все равно продолжаем
      if (attempts >= maxAttempts) {
        console.log('Max attempts reached, continuing anyway')
        resolve()
        return
      }
      
      // Проверяем снова через 100мс
      setTimeout(checkContent, 100)
    }
    
    checkContent()
  })
}

function addSmurfIndicatorsToPage(smurfs: SmurfData[]) {
  const mainContent = select('#__next')
  let teamContainers: Element[]
  if (!mainContent) {
    console.log('Main content not found in addSmurfIndicatorsToPage, trying document.body')
    const mainContentFallback = document.body
    if (!mainContentFallback) {
      console.log('Neither #__next nor body found in addSmurfIndicatorsToPage')
      return
    }
    console.log('Using document.body as main content in addSmurfIndicatorsToPage')
    teamContainers = findTeamContainers(mainContentFallback)
  } else {
    teamContainers = findTeamContainers(mainContent)
  }

  for (const teamContainer of teamContainers) {
    const playerCards = findPlayerCards(teamContainer)
    
    for (const playerCard of playerCards) {
      const nickname = extractNickname(playerCard)
      if (!nickname) continue

      const smurf = smurfs.find(s => s.nickname === nickname)
      if (!smurf) continue

      // Check if indicator already exists
      if (playerCard.querySelector('.refreak-smurf-indicator')) {
        continue
      }

      // Find ListContentPlayer element within the player card
      const listContentPlayer = playerCard.querySelector('[data-testid="ListContentPlayer"]') || 
                               playerCard.querySelector('.ListContentPlayer') ||
                               playerCard.querySelector('[class*="ListContentPlayer"]')
      
      if (!listContentPlayer) {
        console.log(`ListContentPlayer not found for ${nickname}, using fallback positioning`)
        // Fallback to original positioning
        const indicator = createSmurfIndicator(smurf)
        const cardStyle = (playerCard as HTMLElement).style
        if (cardStyle.position !== 'absolute' && cardStyle.position !== 'relative') {
          cardStyle.position = 'relative'
        }
        playerCard.appendChild(indicator)
        continue
      }

      // Create smurf indicator with new positioning
      const indicator = createSmurfIndicatorOverListContent(smurf)
      
      // Ensure parent has relative positioning
      const parentElement = listContentPlayer.parentElement
      if (parentElement) {
        const parentStyle = parentElement.style
        if (parentStyle.position !== 'absolute' && parentStyle.position !== 'relative') {
          parentStyle.position = 'relative'
        }
      }
      
      // Insert indicator before ListContentPlayer
      listContentPlayer.parentNode?.insertBefore(indicator, listContentPlayer)
    }
  }
}

function createSmurfIndicator(smurf: SmurfData): HTMLElement {
  const indicator = document.createElement('div')
  indicator.className = 'refreak-smurf-indicator'
  
  indicator.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    border-radius: 4px;
  `
  
  // Render React component with popover
  const cleanup = renderReactComponent(SmurfIndicator, {
    nickname: smurf.nickname,
    confidence: smurf.confidence,
    reasons: smurf.reasons,
    stats: smurf.stats
  }, indicator)
  
  // Store cleanup function for later use if needed
  indicator.setAttribute('data-cleanup', 'true')
  
  return indicator
}

function createSmurfIndicatorOverListContent(smurf: SmurfData): HTMLElement {
  const indicator = document.createElement('div')
  indicator.className = 'refreak-smurf-indicator'
  
  indicator.style.cssText = `
    position: absolute;
    right: 0;
    top: -16px;
    border-radius: 4px;
  `
  
  // Render React component with popover
  const cleanup = renderReactComponent(SmurfIndicator, {
    nickname: smurf.nickname,
    confidence: smurf.confidence,
    reasons: smurf.reasons,
    stats: smurf.stats
  }, indicator)
  
  // Store cleanup function for later use if needed
  indicator.setAttribute('data-cleanup', 'true')
  
  return indicator
}

// Tooltip functions removed - using React popover instead 