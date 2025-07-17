import { FaceitMatch, FaceitPlayer } from './faceit-api'

// Constants
export const FACTION_1 = 'faction1'
export const FACTION_2 = 'faction2'

// Legacy selectors (for backward compatibility)
export const MATCH_TEAM_V1 = 'match-team'
export const MATCH_TEAM_V2 = 'match-team-v2'
export const MEMBERS_ATTRIBUTE = '[members]:not([members=""])'

// Color palette for party visualization
const COLOR_PALETTE = ['#0082c8', '#ffe119', '#808080', '#3cb44b', '#e6194b']

// Types
export interface FactionDetails {
  factionName: string
  isFaction1: boolean
}

export interface TeamElementInfo {
  teamElements: Element[]
  isTeamV1Element: boolean
}

export interface PlayerWithPartyColor extends FaceitPlayer {
  partyColor: string
}

export interface PartyColorMap {
  [nickname: string]: string
}

// Utility functions
export function getCurrentPath(): string {
  return location.pathname
}

export function getRoomId(path?: string): string | null {
  const match = /room\/([0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+(?:-[0-9a-z]+)?)/.exec(
    path || getCurrentPath()
  )
  return match?.[1] || null
}

export function getFactionDetails(element: Element, isTeamV1Element = true): FactionDetails | null {
  if (!element.hasAttribute('members')) {
    return null
  }

  const membersAttr = element.getAttribute('members')!
  const factionName = membersAttr.split(isTeamV1Element ? 'match.' : 'derived.')[1]
  const isFaction1 = factionName === FACTION_1

  return {
    factionName,
    isFaction1,
  }
}

export function getIsFaction1(factionName: string): boolean {
  return factionName.includes(FACTION_1)
}

export function getFactionIsPremadeV1(factionType: string): boolean {
  return factionType === 'premade'
}

// Match processing functions
export function mapPlayersToPartyColors(
  match: FaceitMatch,
  isTeamV1Element: boolean,
  factionDetails: FactionDetails,
  colorPalette: string[] = COLOR_PALETTE
): PartyColorMap {
  const { factionName, isFaction1 } = factionDetails
  
  // Get faction roster
  const faction = isTeamV1Element
    ? match[factionName as keyof FaceitMatch] as FaceitPlayer[]
    : match.teams?.[factionName as keyof typeof match.teams]?.roster || []
  
  const factionType = match[`${factionName}Type` as keyof FaceitMatch] as string
  const isPremade = isTeamV1Element && getFactionIsPremadeV1(factionType)

  const parties = match.entityCustom?.parties
  const partiesIds = parties ? Object.keys(parties) : []

  const availableColors = [...colorPalette]
  const pickColor = () => isFaction1 ? availableColors.shift()! : availableColors.pop()!

  const playersWithColors: PlayerWithPartyColor[] = faction.reduce((acc, curr) => {
    let partyColor: string

    if (isPremade) {
      partyColor = acc.length === 0 ? pickColor() : acc[0].partyColor
    } else if (curr.activeTeamId || !isTeamV1Element) {
      let partyMember: PlayerWithPartyColor | undefined
      
      if (isTeamV1Element) {
        partyMember = acc.find(({ activeTeamId }) => activeTeamId === curr.activeTeamId)
      } else {
        const playerPartyId = partiesIds.find((partyId) => {
          const party = parties![partyId]
          return party.indexOf(curr.id) !== -1
        })
        
        if (playerPartyId) {
          const playerParty = parties![playerPartyId]
          partyMember = acc.find(({ id }) => playerParty.indexOf(id) !== -1)
        }
      }

      partyColor = partyMember ? partyMember.partyColor : pickColor()
    } else {
      partyColor = pickColor()
    }

    return acc.concat({
      ...curr,
      partyColor,
    })
  }, [] as PlayerWithPartyColor[])

  // Convert to nickname -> color map
  return playersWithColors.reduce((acc, curr) => {
    acc[curr.nickname] = curr.partyColor
    return acc
  }, {} as PartyColorMap)
}

export function mapMatchFactionRosters(match: FaceitMatch): {
  faction1: FaceitPlayer[]
  faction2: FaceitPlayer[]
} {
  if (match.faction1 && match.faction2) {
    return {
      faction1: match.faction1,
      faction2: match.faction2,
    }
  }
  
  if (match.teams?.faction1 && match.teams.faction2) {
    return {
      faction1: match.teams.faction1.roster,
      faction2: match.teams.faction2.roster,
    }
  }
  
  throw new Error(`Not sure how to handle this match: ${match.matchId || 'unknown'}`)
}

export function mapMatchNicknamesToPlayers(match: FaceitMatch): Record<string, FaceitPlayer> {
  const nicknamesToPlayers: Record<string, FaceitPlayer> = {}
  let allPlayers: FaceitPlayer[]
  
  if (match.faction1 && match.faction2) {
    allPlayers = match.faction1.concat(match.faction2)
  } else if (match.teams?.faction1 && match.teams.faction2) {
    allPlayers = match.teams.faction1.roster.concat(match.teams.faction2.roster)
  } else {
    throw new Error(`Not sure how to handle this match: ${match.matchId || 'unknown'}`)
  }

  for (const player of allPlayers) {
    nicknamesToPlayers[player.nickname] = player
  }

  return nicknamesToPlayers
}

export function getMatchState(element: Element): string | null {
  const matchStateElement = element.querySelector('matchroom-versus-status h5')
  return matchStateElement?.textContent || null
}

// DOM helpers
export function select(selector: string, parent?: Element | Document): Element | null {
  // Use #__next as the default root for all DOM queries
  const root = parent ?? document.getElementById('__next') ?? document;
  return root.querySelector(selector);
}

export function selectAll(selector: string, parent?: Element | Document): Element[] {
  // Use #__next as the default root for all DOM queries
  const root = parent ?? document.getElementById('__next') ?? document;
  return Array.from(root.querySelectorAll(selector));
}

// УСТОЙЧИВЫЕ ФУНКЦИИ ДЛЯ НОВОЙ РАЗМЕТКИ FACEIT
// Не используем динамические классы и id!

/**
 * Находит контейнеры команд по тексту "Players"
 */
export function findTeamContainers(root: Element): Element[] {
  console.log('Searching for team containers in root:', root);
  console.log('Root element type:', root.tagName);
  console.log('Root element id:', root.id);
  console.log('Root element classes:', root.className);
  
  // Проверяем, есть ли вообще элементы на странице
  const allElements = root.querySelectorAll('*');
  console.log('Total elements in root:', allElements.length);
  
  // Ищем все спаны/дивы с текстом "Players" (точное совпадение)
  const spans = Array.from(root.querySelectorAll('span,div'))
    .filter(el => el.textContent?.trim() === 'Players');
  console.log('Found "Players" elements:', spans.length);
  
  // Если не нашли точные совпадения, ищем элементы, содержащие "Players"
  if (spans.length === 0) {
    const containingSpans = Array.from(root.querySelectorAll('span,div'))
      .filter(el => el.textContent?.includes('Players'));
    console.log('Found elements containing "Players":', containingSpans.length);
    
    // Выводим все элементы с текстом, содержащим "Players"
    containingSpans.forEach((el, index) => {
      console.log(`Element ${index} with "Players":`, el.textContent?.trim());
      console.log(`Element ${index} tagName:`, el.tagName);
      console.log(`Element ${index} classes:`, el.className);
    });
    
    // Если все еще не нашли, попробуем найти по другим критериям
    if (containingSpans.length === 0) {
      console.log('No elements with "Players" found, trying alternative approach...');
      
      // Ищем элементы с кнопками игроков напрямую
      const playerButtons = root.querySelectorAll('[type="button"][aria-haspopup="dialog"]');
      console.log('Found player buttons directly:', playerButtons.length);
      
      if (playerButtons.length > 0) {
        // Группируем кнопки по родительским контейнерам
        const buttonGroups = new Map<Element, Element[]>();
        
        playerButtons.forEach(button => {
          let parent = button.parentElement;
          let maxDepth = 10;
          
          while (parent && maxDepth > 0) {
            if (parent.querySelectorAll('[type="button"][aria-haspopup="dialog"]').length >= 2) {
              if (!buttonGroups.has(parent)) {
                buttonGroups.set(parent, []);
              }
              buttonGroups.get(parent)!.push(button);
              break;
            }
            parent = parent.parentElement;
            maxDepth--;
          }
        });
        
        console.log('Found button groups:', buttonGroups.size);
        const containers = Array.from(buttonGroups.keys());
        console.log('Found team containers from buttons:', containers.length);
        return containers;
      }
      
      // Ищем элементы с аватарами
      const avatars = root.querySelectorAll('img[aria-label="avatar"]');
      console.log('Found avatars directly:', avatars.length);
      
      if (avatars.length > 0) {
        // Группируем аватары по родительским контейнерам
        const avatarGroups = new Map<Element, Element[]>();
        
        avatars.forEach(avatar => {
          let parent = avatar.parentElement;
          let maxDepth = 10;
          
          while (parent && maxDepth > 0) {
            if (parent.querySelectorAll('img[aria-label="avatar"]').length >= 2) {
              if (!avatarGroups.has(parent)) {
                avatarGroups.set(parent, []);
              }
              avatarGroups.get(parent)!.push(avatar);
              break;
            }
            parent = parent.parentElement;
            maxDepth--;
          }
        });
        
        console.log('Found avatar groups:', avatarGroups.size);
        const containers = Array.from(avatarGroups.keys());
        console.log('Found team containers from avatars:', containers.length);
        return containers;
      }
    }
    
    // Возвращаем родительские контейнеры для элементов, содержащих "Players"
    const containers = containingSpans.map(span => {
      // Ищем ближайший родительский div, который содержит кнопки игроков
      let parent = span.parentElement;
      let maxDepth = 10; // Ограничиваем глубину поиска
      
      while (parent && maxDepth > 0) {
        // Проверяем, содержит ли родитель кнопки игроков
        const playerButtons = parent.querySelectorAll('[type="button"][aria-haspopup="dialog"]');
        if (playerButtons.length >= 2) {
          console.log('Found team container with', playerButtons.length, 'players');
          return parent;
        }
        
        parent = parent.parentElement;
        maxDepth--;
      }
      
      // Если не нашли с кнопками, ищем с аватарами
      parent = span.parentElement;
      maxDepth = 10;
      
      while (parent && maxDepth > 0) {
        const avatars = parent.querySelectorAll('img[aria-label="avatar"]');
        if (avatars.length >= 2) {
          console.log('Found team container with', avatars.length, 'avatars');
          return parent;
        }
        
        parent = parent.parentElement;
        maxDepth--;
      }
      
      return null;
    }).filter(Boolean) as Element[];
    
    console.log('Found team containers:', containers.length);
    return containers;
  }
  
  // Возвращаем родительские контейнеры (обычно это блок команды)
  const containers = spans.map(span => {
    // Ищем ближайший родительский div, который содержит кнопки игроков
    let parent = span.parentElement;
    let maxDepth = 10; // Ограничиваем глубину поиска
    
    while (parent && maxDepth > 0) {
      // Проверяем, содержит ли родитель кнопки игроков
      const playerButtons = parent.querySelectorAll('[type="button"][aria-haspopup="dialog"]');
      if (playerButtons.length >= 2) {
        console.log('Found team container with', playerButtons.length, 'players');
        return parent;
      }
      
      parent = parent.parentElement;
      maxDepth--;
    }
    
    // Если не нашли с кнопками, ищем с аватарами
    parent = span.parentElement;
    maxDepth = 10;
    
    while (parent && maxDepth > 0) {
      const avatars = parent.querySelectorAll('img[aria-label="avatar"]');
      if (avatars.length >= 2) {
        console.log('Found team container with', avatars.length, 'avatars');
        return parent;
      }
      
      parent = parent.parentElement;
      maxDepth--;
    }
    
    return null;
  }).filter(Boolean) as Element[];
  
  console.log('Found team containers:', containers.length);
  return containers;
}

/**
 * Находит карточки игроков внутри контейнера команды
 */
export function findPlayerCards(teamContainer: Element): Element[] {
  // Ищем все type="button" aria-haspopup="dialog" (или вложенные img с aria-label="avatar")
  const btns = Array.from(teamContainer.querySelectorAll('[type="button"][aria-haspopup="dialog"]'));
  console.log('Found player buttons:', btns.length);
  
  // Иногда карточка может быть не кнопкой, fallback на img[aria-label="avatar"]
  if (btns.length > 0) return btns;
  
  const avatars = Array.from(teamContainer.querySelectorAll('img[aria-label="avatar"]')).map(img => img.closest('div')!);
  console.log('Found player avatars:', avatars.length);
  
  // Если не нашли ни кнопки, ни аватары, попробуем найти по структуре
  if (avatars.length === 0) {
    // Ищем элементы с никнеймами игроков
    const nicknameElements = Array.from(teamContainer.querySelectorAll('[class*="Nickname"]'));
    console.log('Found nickname elements:', nicknameElements.length);
    
    if (nicknameElements.length > 0) {
      // Возвращаем родительские контейнеры никнеймов
      const playerCards = nicknameElements.map(el => {
        let parent = el.parentElement;
        let maxDepth = 5;
        while (parent && maxDepth > 0) {
          // Ищем контейнер, который содержит аватар или другие элементы игрока
          if (parent.querySelector('img[aria-label="avatar"]') || 
              parent.querySelector('[type="button"][aria-haspopup="dialog"]') ||
              parent.querySelector('[class*="Avatar"]')) {
            return parent;
          }
          parent = parent.parentElement;
          maxDepth--;
        }
        return el.closest('div');
      }).filter(Boolean) as Element[];
      
      console.log('Found player cards from nicknames:', playerCards.length);
      return playerCards;
    }
  }
  
  return avatars;
}

/**
 * Получает никнейм игрока из карточки
 */
export function extractNickname(playerCard: Element): string | null {
  // Сначала ищем элементы с классом, содержащим "Nickname"
  const nicknameElements = Array.from(playerCard.querySelectorAll('[class*="Nickname"]'));
  console.log('Found nickname elements with class:', nicknameElements.length);
  
  for (const el of nicknameElements) {
    const text = el.textContent?.trim();
    if (text && text.length > 0 && !el.querySelector('svg')) {
      console.log('Extracted nickname from nickname element:', text);
      return text;
    }
  }
  
  // Ищем элементы с классом, содержащим "Name" (альтернативный селектор)
  const nameElements = Array.from(playerCard.querySelectorAll('[class*="Name"]'));
  console.log('Found name elements with class:', nameElements.length);
  
  for (const el of nameElements) {
    const text = el.textContent?.trim();
    if (text && text.length > 0 && !el.querySelector('svg')) {
      console.log('Extracted nickname from name element:', text);
      return text;
    }
  }
  
  // Если не нашли, ищем div/span с текстом, который похож на никнейм (без вложенных svg)
  const candidates = Array.from(playerCard.querySelectorAll('div,span'))
    .filter(el => el.textContent && el.textContent.trim().length > 0 && !el.querySelector('svg'));
  console.log('Found nickname candidates:', candidates.length);
  
  // Обычно никнейм — самый длинный текст без спецсимволов
  let best = '';
  for (const el of candidates) {
    const txt = el.textContent!.trim();
    if (txt.length > best.length && /^[\w\-\[\]\.]+$/u.test(txt)) {
      best = txt;
    }
  }
  
  const result = best || candidates[0]?.textContent?.trim() || null;
  console.log('Extracted nickname:', result);
  return result;
}

/**
 * Получает все никнеймы игроков из контейнера команды
 */
export function getAllPlayerNicknames(teamContainer: Element): string[] {
  return findPlayerCards(teamContainer)
    .map(card => extractNickname(card))
    .filter(Boolean) as string[];
}

// Cache implementation for expensive operations
class MatchRoomCache {
  private static instance: MatchRoomCache
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_TIME = 5 * 60 * 1000 // 5 minutes

  static getInstance(): MatchRoomCache {
    if (!MatchRoomCache.instance) {
      MatchRoomCache.instance = new MatchRoomCache()
    }
    return MatchRoomCache.instance
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TIME) {
      return cached.data as T
    }
    return null
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }
}

// Memoized versions of expensive functions
export const mapPlayersToPartyColorsMemoized = (match: FaceitMatch, isTeamV1Element: boolean, factionDetails: FactionDetails): PartyColorMap => {
  const cache = MatchRoomCache.getInstance()
  const cacheKey = `partyColors:${match.matchId}:${factionDetails.factionName}`
  
  const cached = cache.get<PartyColorMap>(cacheKey)
  if (cached) return cached

  const result = mapPlayersToPartyColors(match, isTeamV1Element, factionDetails)
  cache.set(cacheKey, result)
  return result
}

export const mapMatchFactionRostersMemoized = (match: FaceitMatch) => {
  const cache = MatchRoomCache.getInstance()
  const cacheKey = `rosters:${match.matchId}`
  
  const cached = cache.get<{ faction1: FaceitPlayer[]; faction2: FaceitPlayer[] }>(cacheKey)
  if (cached) return cached

  const result = mapMatchFactionRosters(match)
  cache.set(cacheKey, result)
  return result
}

export const mapMatchNicknamesToPlayersMemoized = (match: FaceitMatch) => {
  const cache = MatchRoomCache.getInstance()
  const cacheKey = `nicknames:${match.matchId}`
  
  const cached = cache.get<Record<string, FaceitPlayer>>(cacheKey)
  if (cached) return cached

  const result = mapMatchNicknamesToPlayers(match)
  cache.set(cacheKey, result)
  return result
} 