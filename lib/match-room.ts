import { FaceitMatch, FaceitPlayer } from './faceit-api'

// ============================================================================
// CONSTANTS
// ============================================================================

export const FACTION_1 = 'faction1' as const
export const FACTION_2 = 'faction2' as const

// Legacy selectors (for backward compatibility)
export const MATCH_TEAM_V1 = 'match-team'
export const MATCH_TEAM_V2 = 'match-team-v2'
export const MEMBERS_ATTRIBUTE = '[members]:not([members=""])'

// Color palette for party visualization
const COLOR_PALETTE = ['#0082c8', '#ffe119', '#808080', '#3cb44b', '#e6194b'] as const

// DOM selectors
const DOM_SELECTORS = {
  PLAYER_BUTTONS: '[type="button"][aria-haspopup="dialog"]',
  AVATARS: 'img[aria-label="avatar"]',
  NICKNAME_CLASSES: '[class*="Nickname"]',
  NAME_CLASSES: '[class*="Name"]',
  MATCH_STATE: 'matchroom-versus-status h5',
  ROOT_ELEMENT: '#__next'
} as const

// ============================================================================
// TYPES
// ============================================================================

export type FactionType = typeof FACTION_1 | typeof FACTION_2
export type ColorPalette = typeof COLOR_PALETTE[number]

export interface FactionDetails {
  readonly factionName: string
  readonly isFaction1: boolean
}

export interface TeamElementInfo {
  readonly teamElements: Element[]
  readonly isTeamV1Element: boolean
}

export interface PlayerWithPartyColor extends FaceitPlayer {
  readonly partyColor: string
}

export interface PartyColorMap {
  [nickname: string]: string
}

export interface MatchRosters {
  readonly faction1: FaceitPlayer[]
  readonly faction2: FaceitPlayer[]
}

export interface CacheEntry<T> {
  readonly data: T
  readonly timestamp: number
}

export interface DomQueryOptions {
  readonly parent?: Element | Document
  readonly maxDepth?: number
  readonly minElements?: number
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Utility class for common operations
 */
export class MatchRoomUtils {
  /**
   * Get current path from location
   */
  static getCurrentPath(): string {
  return location.pathname
}

  /**
   * Extract room ID from path using regex
   */
  static getRoomId(path?: string): string | null {
    const roomIdPattern = /room\/([0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+(?:-[0-9a-z]+)?)/
    const match = roomIdPattern.exec(path || this.getCurrentPath())
    return match?.[1] ?? null
  }

  /**
   * Check if faction name is faction1
   */
  static isFaction1(factionName: string): boolean {
    return factionName.includes(FACTION_1)
  }

  /**
   * Check if faction type is premade for V1
   */
  static isPremadeV1(factionType: string): boolean {
    return factionType === 'premade'
  }

  /**
   * Validate nickname format
   */
  static isValidNickname(nickname: string): boolean {
    return /^[\w\-\[\]\.]+$/u.test(nickname) && nickname.length > 0
  }

  /**
   * Find best nickname candidate from text elements
   */
  static findBestNickname(elements: Element[]): string | null {
    const candidates = elements
      .map(el => el.textContent?.trim())
      .filter(text => text && text.length > 0 && this.isValidNickname(text))
      .sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))

    return candidates[0] ?? null
  }
}

// ============================================================================
// FACTION PROCESSING
// ============================================================================

/**
 * Service for handling faction-related operations
 */
export class FactionService {
  /**
   * Extract faction details from DOM element
   */
  static getFactionDetails(element: Element, isTeamV1Element = true): FactionDetails | null {
  if (!element.hasAttribute('members')) {
    return null
  }

    try {
  const membersAttr = element.getAttribute('members')!
      const prefix = isTeamV1Element ? 'match.' : 'derived.'
      const factionName = membersAttr.split(prefix)[1]
      
      if (!factionName) {
        return null
      }

  return {
    factionName,
        isFaction1: MatchRoomUtils.isFaction1(factionName)
      }
    } catch (error) {
      console.warn('Failed to parse faction details:', error)
      return null
    }
  }

  /**
   * Get faction roster from match data
   */
  static getFactionRoster(
    match: FaceitMatch, 
    factionName: string, 
    isTeamV1Element: boolean
  ): FaceitPlayer[] {
    if (isTeamV1Element) {
      return (match[factionName as keyof FaceitMatch] as FaceitPlayer[]) ?? []
    }
    
    return match.teams?.[factionName as keyof typeof match.teams]?.roster ?? []
  }

  /**
   * Get faction type from match data
   */
  static getFactionType(match: FaceitMatch, factionName: string): string {
    return (match[`${factionName}Type` as keyof FaceitMatch] as string) ?? ''
  }
}

// ============================================================================
// PARTY COLOR MAPPING
// ============================================================================

/**
 * Service for handling party color assignments
 */
export class PartyColorService {
  private static readonly DEFAULT_COLORS = [...COLOR_PALETTE]

  /**
   * Map players to party colors based on team composition
   */
  static mapPlayersToPartyColors(
  match: FaceitMatch,
  isTeamV1Element: boolean,
  factionDetails: FactionDetails,
    colorPalette: readonly string[] = this.DEFAULT_COLORS
): PartyColorMap {
  const { factionName, isFaction1 } = factionDetails
  
    const faction = FactionService.getFactionRoster(match, factionName, isTeamV1Element)
    const factionType = FactionService.getFactionType(match, factionName)
    const isPremade = isTeamV1Element && MatchRoomUtils.isPremadeV1(factionType)

  const parties = match.entityCustom?.parties
  const partiesIds = parties ? Object.keys(parties) : []

  const availableColors = [...colorPalette]
  const pickColor = () => isFaction1 ? availableColors.shift()! : availableColors.pop()!

    const playersWithColors = this.assignColorsToPlayers(
      faction, 
      isPremade, 
      isTeamV1Element, 
      parties, 
      partiesIds, 
      pickColor
    )

    return this.createColorMap(playersWithColors)
  }

  private static assignColorsToPlayers(
    faction: FaceitPlayer[],
    isPremade: boolean,
    isTeamV1Element: boolean,
    parties: Record<string, string[]> | undefined,
    partiesIds: string[],
    pickColor: () => string
  ): PlayerWithPartyColor[] {
    return faction.reduce((acc, player) => {
    let partyColor: string

    if (isPremade) {
      partyColor = acc.length === 0 ? pickColor() : acc[0].partyColor
      } else if (player.activeTeamId || !isTeamV1Element) {
        const partyMember = this.findPartyMember(
          acc, 
          player, 
          isTeamV1Element, 
          parties, 
          partiesIds
        )
        partyColor = partyMember?.partyColor ?? pickColor()
      } else {
        partyColor = pickColor()
      }

      return acc.concat({ ...player, partyColor })
    }, [] as PlayerWithPartyColor[])
  }

  private static findPartyMember(
    players: PlayerWithPartyColor[],
    currentPlayer: FaceitPlayer,
    isTeamV1Element: boolean,
    parties: Record<string, string[]> | undefined,
    partiesIds: string[]
  ): PlayerWithPartyColor | undefined {
    if (isTeamV1Element) {
      return players.find(({ activeTeamId }) => activeTeamId === currentPlayer.activeTeamId)
    }

    if (!parties) return undefined

    const playerPartyId = partiesIds.find(partyId => {
      const party = parties[partyId]
      return party.includes(currentPlayer.id)
    })

    if (!playerPartyId) return undefined

    const playerParty = parties[playerPartyId]
    return players.find(({ id }) => playerParty.includes(id))
  }

  private static createColorMap(players: PlayerWithPartyColor[]): PartyColorMap {
    return players.reduce((acc, player) => {
      acc[player.nickname] = player.partyColor
    return acc
    }, {} as Record<string, string>)
  }
}

// ============================================================================
// MATCH DATA PROCESSING
// ============================================================================

/**
 * Service for processing match data
 */
export class MatchDataService {
  /**
   * Map match faction rosters
   */
  static mapMatchFactionRosters(match: FaceitMatch): MatchRosters {
  if (match.faction1 && match.faction2) {
    return {
      faction1: match.faction1,
        faction2: match.faction2
    }
  }
  
  if (match.teams?.faction1 && match.teams.faction2) {
    return {
      faction1: match.teams.faction1.roster,
        faction2: match.teams.faction2.roster
      }
    }
    
    throw new Error(`Unsupported match format: ${match.matchId ?? 'unknown'}`)
  }

  /**
   * Map match nicknames to players
   */
  static mapMatchNicknamesToPlayers(match: FaceitMatch): Record<string, FaceitPlayer> {
    const rosters = this.mapMatchFactionRosters(match)
    const allPlayers = [...rosters.faction1, ...rosters.faction2]

    return allPlayers.reduce((acc, player) => {
      acc[player.nickname] = player
      return acc
    }, {} as { [key: string]: FaceitPlayer })
  }

  /**
   * Get match state from DOM element
   */
  static getMatchState(element: Element): string | null {
    const matchStateElement = element.querySelector(DOM_SELECTORS.MATCH_STATE)
    return matchStateElement?.textContent?.trim() ?? null
  }
}

// ============================================================================
// DOM QUERY SERVICE
// ============================================================================

/**
 * Service for DOM queries and manipulations
 */
export class DomQueryService {
  /**
   * Get root element for queries
   */
  private static getRoot(parent?: Element | Document): Element | Document {
    return parent ?? document.getElementById(DOM_SELECTORS.ROOT_ELEMENT) ?? document
  }

  /**
   * Select single element
   */
  static select(selector: string, parent?: Element | Document): Element | null {
    const root = this.getRoot(parent)
    return root.querySelector(selector)
  }

  /**
   * Select all elements
   */
  static selectAll(selector: string, parent?: Element | Document): Element[] {
    const root = this.getRoot(parent)
    return Array.from(root.querySelectorAll(selector))
  }

  /**
   * Find team containers using multiple strategies
   */
  static findTeamContainers(root: Element): Element[] {
    const strategies = [
      this.findByPlayersText,
      this.findByPlayerButtons,
      this.findByAvatars
    ]

    for (const strategy of strategies) {
      const containers = strategy.call(this, root)
      if (containers.length > 0) {
        return containers
      }
    }

    return []
  }

  private static findByPlayersText(root: Element): Element[] {
    const playersElements = this.selectAll('span,div', root)
      .filter(el => el.textContent?.trim() === 'Players')

    return this.findParentContainers(playersElements)
  }

  private static findByPlayerButtons(root: Element): Element[] {
    const buttons = this.selectAll(DOM_SELECTORS.PLAYER_BUTTONS, root)
    return this.groupElementsByParent(buttons, DOM_SELECTORS.PLAYER_BUTTONS, 2)
  }

  private static findByAvatars(root: Element): Element[] {
    const avatars = this.selectAll(DOM_SELECTORS.AVATARS, root)
    return this.groupElementsByParent(avatars, DOM_SELECTORS.AVATARS, 2)
  }

  private static findParentContainers(elements: Element[]): Element[] {
    return elements
      .map(element => this.findParentWithPlayers(element))
      .filter(Boolean) as Element[]
  }

  private static findParentWithPlayers(element: Element, maxDepth = 10): Element | null {
    let parent = element.parentElement
    let depth = 0

    while (parent && depth < maxDepth) {
      const hasPlayerButtons = parent.querySelectorAll(DOM_SELECTORS.PLAYER_BUTTONS).length >= 2
      const hasAvatars = parent.querySelectorAll(DOM_SELECTORS.AVATARS).length >= 2

      if (hasPlayerButtons || hasAvatars) {
        return parent
      }

      parent = parent.parentElement
      depth++
    }

    return null
  }

  private static groupElementsByParent(
    elements: Element[], 
    selector: string, 
    minCount: number
  ): Element[] {
    const groups = new Map<Element, Element[]>()

    elements.forEach(element => {
      let parent = element.parentElement
      let depth = 0
      const maxDepth = 10

      while (parent && depth < maxDepth) {
        const childCount = parent.querySelectorAll(selector).length
        if (childCount >= minCount) {
          if (!groups.has(parent)) {
            groups.set(parent, [])
          }
          groups.get(parent)!.push(element)
          break
        }
        parent = parent.parentElement
        depth++
      }
    })

    return Array.from(groups.keys())
  }

  /**
   * Find player cards within team container
   */
  static findPlayerCards(teamContainer: Element): Element[] {
    const strategies = [
      () => this.selectAll(DOM_SELECTORS.PLAYER_BUTTONS, teamContainer),
      () => this.selectAll(DOM_SELECTORS.AVATARS, teamContainer).map(img => img.closest('div')!),
      () => this.findByNicknameElements(teamContainer)
    ]

    for (const strategy of strategies) {
      const cards = strategy()
      if (cards.length > 0) {
        return cards
      }
    }

    return []
  }

  private static findByNicknameElements(teamContainer: Element): Element[] {
    const nicknameElements = this.selectAll(DOM_SELECTORS.NICKNAME_CLASSES, teamContainer)
    
    return nicknameElements
      .map(element => this.findPlayerCardParent(element))
      .filter(Boolean) as Element[]
  }

  private static findPlayerCardParent(element: Element, maxDepth = 5): Element | null {
    let parent = element.parentElement
    let depth = 0

    while (parent && depth < maxDepth) {
      const hasAvatar = parent.querySelector(DOM_SELECTORS.AVATARS)
      const hasButton = parent.querySelector(DOM_SELECTORS.PLAYER_BUTTONS)
      const hasAvatarClass = parent.querySelector('[class*="Avatar"]')

      if (hasAvatar || hasButton || hasAvatarClass) {
        return parent
      }

      parent = parent.parentElement
      depth++
    }

    return element.closest('div')
  }

  /**
   * Extract nickname from player card
   */
  static extractNickname(playerCard: Element): string | null {
    const strategies = [
      () => this.findByNicknameClass(playerCard),
      () => this.findByNameClass(playerCard),
      () => this.findByTextContent(playerCard)
    ]

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i]
      const nickname = strategy()
      if (nickname) {
        return nickname
      }
    }

    return null
  }

  private static findByNicknameClass(playerCard: Element): string | null {
    const elements = this.selectAll(DOM_SELECTORS.NICKNAME_CLASSES, playerCard)
    const result = this.findValidText(elements)
    return result
  }

  private static findByNameClass(playerCard: Element): string | null {
    const elements = this.selectAll(DOM_SELECTORS.NAME_CLASSES, playerCard)
    const result = this.findValidText(elements)
    return result
  }

  private static findByTextContent(playerCard: Element): string | null {
    const candidates = this.selectAll('div,span', playerCard)
      .filter(el => {
        const text = el.textContent?.trim()
        return text && text.length > 0 && !el.querySelector('svg')
      })

    const result = MatchRoomUtils.findBestNickname(candidates)
    return result
  }

  private static findValidText(elements: Element[]): string | null {
    for (const element of elements) {
      const text = element.textContent?.trim()
      if (text && text.length > 0 && !element.querySelector('svg')) {
        return text
      }
    }
    return null
  }

  /**
   * Get all player nicknames from team container
   */
  static getAllPlayerNicknames(teamContainer: Element): string[] {
    return this.findPlayerCards(teamContainer)
      .map(card => this.extractNickname(card))
      .filter(Boolean) as string[]
  }
}

// ============================================================================
// CACHE SERVICE
// ============================================================================

/**
 * Generic cache service with type safety
 */
export class CacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>()
  private readonly ttl: number

  constructor(ttlMinutes = 5) {
    this.ttl = ttlMinutes * 60 * 1000
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null
  }
}

/**
 * Match room specific cache instance
 */
const matchRoomCache = new CacheService()

// ============================================================================
// MEMOIZED FUNCTIONS
// ============================================================================

/**
 * Memoized version of mapPlayersToPartyColors
 */
export const mapPlayersToPartyColorsMemoized = (
  match: FaceitMatch, 
  isTeamV1Element: boolean, 
  factionDetails: FactionDetails
): PartyColorMap => {
  const cacheKey = `partyColors:${match.matchId}:${factionDetails.factionName}`
  
  const cached = matchRoomCache.get<PartyColorMap>(cacheKey)
  if (cached) return cached

  const result = PartyColorService.mapPlayersToPartyColors(match, isTeamV1Element, factionDetails)
  matchRoomCache.set(cacheKey, result)
  return result
}

/**
 * Memoized version of mapMatchFactionRosters
 */
export const mapMatchFactionRostersMemoized = (match: FaceitMatch): MatchRosters => {
  const cacheKey = `rosters:${match.matchId}`
  
  const cached = matchRoomCache.get<MatchRosters>(cacheKey)
  if (cached) return cached

  const result = MatchDataService.mapMatchFactionRosters(match)
  matchRoomCache.set(cacheKey, result)
  return result
}

/**
 * Memoized version of mapMatchNicknamesToPlayers
 */
export const mapMatchNicknamesToPlayersMemoized = (match: FaceitMatch): Record<string, FaceitPlayer> => {
  const cacheKey = `nicknames:${match.matchId}`
  
  const cached = matchRoomCache.get<Record<string, FaceitPlayer>>(cacheKey)
  if (cached) return cached

  const result = MatchDataService.mapMatchNicknamesToPlayers(match)
  matchRoomCache.set(cacheKey, result)
  return result
} 

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

// Re-export legacy functions for backward compatibility
export const getCurrentPath = MatchRoomUtils.getCurrentPath
export const getRoomId = MatchRoomUtils.getRoomId
export const getFactionDetails = FactionService.getFactionDetails
export const getIsFaction1 = MatchRoomUtils.isFaction1
export const getFactionIsPremadeV1 = MatchRoomUtils.isPremadeV1
export const mapPlayersToPartyColors = PartyColorService.mapPlayersToPartyColors
export const mapMatchFactionRosters = MatchDataService.mapMatchFactionRosters
export const mapMatchNicknamesToPlayers = MatchDataService.mapMatchNicknamesToPlayers
export const getMatchState = MatchDataService.getMatchState
export const select = DomQueryService.select
export const selectAll = DomQueryService.selectAll
export const findTeamContainers = DomQueryService.findTeamContainers
export const findPlayerCards = DomQueryService.findPlayerCards
export const extractNickname = DomQueryService.extractNickname
export const getAllPlayerNicknames = DomQueryService.getAllPlayerNicknames 