import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DomQueryService } from './match-room'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Оптимизированный debounce с использованием requestIdleCallback
 */
export function optimizedDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 100
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    if ('requestIdleCallback' in window) {
      timeoutId = setTimeout(() => {
        requestIdleCallback(() => {
          func(...args)
        })
      }, delay)
    } else {
      timeoutId = setTimeout(() => {
        func(...args)
      }, delay)
    }
  }
}

/**
 * Оптимизированное ожидание с requestIdleCallback
 */
export function optimizedWait(delay: number = 100): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        setTimeout(resolve, delay)
      })
    } else {
      setTimeout(resolve, delay)
    }
  })
}

/**
 * Умное ожидание загрузки карточек игроков
 * Ждет появления элементов с никнеймами и аватарами
 */
export function waitForPlayerCards(timeout = 15000): Promise<Element[]> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    let checkCount = 0
    
    const check = () => {
      checkCount++
      
      // Сначала ищем основной контейнер матча
      const matchContainer = findMatchContainer()
      
      if (matchContainer) {
        
        // Ищем карточки игроков в контейнере матча
        const playerCards = findPlayerCardsInMatch(matchContainer)
        
        if (playerCards.length >= 2) {
          resolve(playerCards)
          return
        }
      }
      
      // Fallback: ищем карточки игроков напрямую в body
      const directPlayerCards = findDirectPlayerCards()
      
      if (directPlayerCards.length >= 2) {
        resolve(directPlayerCards)
        return
      }
      
      // Проверяем timeout
      if (Date.now() - startTime > timeout) {
        console.warn(`Timeout waiting for player cards after ${timeout}ms (${checkCount} checks)`)
        
        // Вместо reject, попробуем найти любые карточки игроков, даже неполные
        const fallbackCards = findAnyPlayerCards()
        if (fallbackCards.length > 0) {
          resolve(fallbackCards)
        } else {
          reject(new Error(`Timeout waiting for player cards after ${timeout}ms`))
        }
        return
      }
      
      // Продолжаем проверку с оптимизацией производительности
      const delay = checkCount < 10 ? 100 : 200 // Более частые проверки в начале
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          setTimeout(check, delay)
        })
      } else {
        setTimeout(check, delay)
      }
    }
    
    check()
  })
}

/**
 * Находит основной контейнер матча
 */
function findMatchContainer(): Element | null {
  // Сначала ищем модальное окно с матчем
  const modalSelectors = [
    '#canvas-wrapper',
    '[class*="ContextualView"]',
    '[class*="Modal"]',
    '[class*="modal"]',
    '[class*="Overlay"]',
    '[class*="overlay"]'
  ]
  
  for (const selector of modalSelectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        
        // Ищем контейнер матча внутри модального окна
        const matchInModal = findMatchInContainer(element)
        if (matchInModal) {
          return matchInModal
        }
      }
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  // Если модальное окно не найдено, ищем матч в основном контенте
  const mainSelectors = [
    '[class*="MatchRoom"]',
    '[class*="match-room"]',
    '[class*="Room"]',
    '[class*="Match"]',
    '[class*="match"]',
    '[data-testid*="match"]',
    '[data-testid*="Match"]',
    '[class*="GameRoom"]',
    '[class*="game-room"]'
  ]
  
  for (const selector of mainSelectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        return element
      }
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  // Fallback: ищем контейнер с несколькими карточками игроков
  const playerCardSelectors = [
    '[type="button"][aria-haspopup="dialog"]',
    '[class*="ListContentPlayer"]',
    '[class*="PlayerCard"]'
  ]
  
  for (const selector of playerCardSelectors) {
    try {
      const elements = document.querySelectorAll(selector)
      if (elements.length >= 2) {
        // Ищем общий родительский контейнер
        const firstElement = elements[0] as Element
        let parent = firstElement.parentElement
        let maxDepth = 5
        
        while (parent && maxDepth > 0) {
          const childCount = parent.querySelectorAll(selector).length
          if (childCount >= 2 && childCount <= 20) { // Ограничиваем количество карточек
            return parent
          }
          parent = parent.parentElement
          maxDepth--
        }
      }
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  return null
}

/**
 * Находит контейнер матча внутри заданного контейнера (например, модального окна)
 */
function findMatchInContainer(container: Element): Element | null {
  // Ищем контейнеры матча внутри заданного контейнера
  const matchSelectors = [
    '[class*="MatchRoom"]',
    '[class*="match-room"]',
    '[class*="Room"]',
    '[class*="Match"]',
    '[class*="match"]',
    '[class*="ContextualView__Content"]',
    '[class*="GameRoom"]',
    '[class*="game-room"]'
  ]
  
  for (const selector of matchSelectors) {
    try {
      const element = container.querySelector(selector)
      if (element) {
        return element
      }
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  // Если не нашли специальный контейнер матча, ищем контейнер с карточками игроков
  const playerCardSelectors = [
    '[type="button"][aria-haspopup="dialog"]',
    '[class*="ListContentPlayer"]',
    '[class*="PlayerCard"]'
  ]
  
  for (const selector of playerCardSelectors) {
    try {
      const elements = container.querySelectorAll(selector)
      if (elements.length >= 2 && elements.length <= 20) {
        // Ищем общий родительский контейнер
        const firstElement = elements[0] as Element
        let parent = firstElement.parentElement
        let maxDepth = 5
        
        while (parent && maxDepth > 0) {
          // Проверяем, что родитель находится внутри нашего контейнера
          if (!container.contains(parent)) {
            break
          }
          
          const childCount = parent.querySelectorAll(selector).length
          if (childCount >= 2 && childCount <= 20) {
            return parent
          }
          parent = parent.parentElement
          maxDepth--
        }
      }
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  return null
}

/**
 * Находит карточки игроков в контейнере матча
 */
function findPlayerCardsInMatch(matchContainer: Element): Element[] {
  // Ищем карточки игроков на правильном уровне - контейнеры, которые содержат и аватар, и никнейм
  const primarySelectors = [
    '[type="button"][aria-haspopup="dialog"]',
    '[class*="ListContentPlayer__Holder"]'
  ]
  
  const allCards: Element[] = []
  
  for (const selector of primarySelectors) {
    try {
      const elements = Array.from(matchContainer.querySelectorAll(selector))
      allCards.push(...elements)
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  // Если не нашли карточки, ищем контейнеры с аватарами и поднимаемся к родительским контейнерам
  if (allCards.length === 0) {
    const avatarContainers = Array.from(matchContainer.querySelectorAll('img[aria-label="avatar"]'))
    const playerCards = avatarContainers.map(avatar => {
      // Поднимаемся к контейнеру, который содержит и аватар, и никнейм
      let parent = avatar.closest('[type="button"][aria-haspopup="dialog"]')
      if (parent) {
        return parent
      }
      
      // Ищем контейнер с классом ListContentPlayer__Holder
      parent = avatar.closest('[class*="ListContentPlayer__Holder"]')
      if (parent) {
        return parent
      }
      
      // Fallback: поднимаемся на несколько уровней вверх
      let current = avatar.parentElement
      let maxDepth = 5
      while (current && maxDepth > 0) {
        // Проверяем, содержит ли текущий элемент и аватар, и никнейм
        const hasAvatar = current.querySelector('img[aria-label="avatar"]')
        const hasNickname = current.querySelector('[class*="Nickname"], [class*="Name"]')
        
        if (hasAvatar && hasNickname) {
          return current
        }
        
        current = current.parentElement
        maxDepth--
      }
      
      return null
    }).filter(Boolean) as Element[]
    
    allCards.push(...playerCards)
  }
  
  // Убираем дубликаты
  const uniqueCards = allCards.filter((card, index, array) => {
    return array.findIndex(c => c === card) === index
  })
  
  // Валидируем карточки
  const validCards = uniqueCards.filter(card => {
    const nickname = extractNickname(card)
    const hasNicknameElement = card.querySelector('[class*="Nickname"]')
    const hasNameElement = card.querySelector('[class*="Name"]')
    const hasAvatar = card.querySelector('img[aria-label="avatar"]')
    
    // Карточка валидна, если есть никнейм, элемент никнейма или элемент имени
    const isValid = nickname || hasNicknameElement || hasNameElement
    
    return isValid
  })
  
  
  return validCards
}

/**
 * Находит карточки игроков напрямую в body (fallback)
 */
function findDirectPlayerCards(): Element[] {
  // Ищем основные карточки игроков
  const selectors = [
    '[type="button"][aria-haspopup="dialog"]',
    '[class*="ListContentPlayer__Holder"]'
  ]
  
  const allCards: Element[] = []
  
  for (const selector of selectors) {
    try {
      const elements = Array.from(document.querySelectorAll(selector))
      allCards.push(...elements)
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  // Если не нашли карточки, ищем контейнеры с аватарами
  if (allCards.length === 0) {
    const avatarContainers = Array.from(document.querySelectorAll('img[aria-label="avatar"]'))
    const playerCards = avatarContainers.map(avatar => {
      // Поднимаемся к контейнеру, который содержит и аватар, и никнейм
      let parent = avatar.closest('[type="button"][aria-haspopup="dialog"]')
      if (parent) {
        return parent
      }
      
      // Ищем контейнер с классом ListContentPlayer__Holder
      parent = avatar.closest('[class*="ListContentPlayer__Holder"]')
      if (parent) {
        return parent
      }
      
      // Fallback: поднимаемся на несколько уровней вверх
      let current = avatar.parentElement
      let maxDepth = 5
      while (current && maxDepth > 0) {
        // Проверяем, содержит ли текущий элемент и аватар, и никнейм
        const hasAvatar = current.querySelector('img[aria-label="avatar"]')
        const hasNickname = current.querySelector('[class*="Nickname"], [class*="Name"]')
        
        if (hasAvatar && hasNickname) {
          return current
        }
        
        current = current.parentElement
        maxDepth--
      }
      
      return null
    }).filter(Boolean) as Element[]
    
    allCards.push(...playerCards)
  }
  
  // Убираем дубликаты
  const uniqueCards = allCards.filter((card, index, array) => {
    return array.findIndex(c => c === card) === index
  })
  
  // Ограничиваем количество карточек (не более 20)
  const limitedCards = uniqueCards.slice(0, 20)
  
  // Валидируем карточки
  const validCards = limitedCards.filter(card => {
    const nickname = extractNickname(card)
    const hasNicknameElement = card.querySelector('[class*="Nickname"]')
    const hasNameElement = card.querySelector('[class*="Name"]')
    
    return nickname || hasNicknameElement || hasNameElement
  })
  
  
  return validCards
}

/**
 * Fallback функция для поиска любых карточек игроков, даже неполных
 */
function findAnyPlayerCards(): Element[] {
  // Ищем любые элементы, которые могут быть карточками игроков
  const selectors = [
    '[type="button"][aria-haspopup="dialog"]',
    '[class*="ListContentPlayer__Holder"]'
  ]
  
  const allElements: Element[] = []
  
  // Сначала ищем по основному селектору карточек игроков
  try {
    const mainPlayerCards = Array.from(document.querySelectorAll('[type="button"][aria-haspopup="dialog"]'))
    if (mainPlayerCards.length > 0 && mainPlayerCards.length <= 20) {
      return mainPlayerCards
    }
  } catch (e) {
    // Игнорируем ошибки селекторов
  }
  
  for (const selector of selectors) {
    try {
      const elements = Array.from(document.querySelectorAll(selector))
      allElements.push(...elements)
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  // Если не нашли карточки, ищем контейнеры с аватарами
  if (allElements.length === 0) {
    const avatarContainers = Array.from(document.querySelectorAll('img[aria-label="avatar"]'))
    const playerCards = avatarContainers.map(avatar => {
      // Поднимаемся к контейнеру, который содержит и аватар, и никнейм
      let parent = avatar.closest('[type="button"][aria-haspopup="dialog"]')
      if (parent) {
        return parent
      }
      
      // Ищем контейнер с классом ListContentPlayer__Holder
      parent = avatar.closest('[class*="ListContentPlayer__Holder"]')
      if (parent) {
        return parent
      }
      
      // Fallback: поднимаемся на несколько уровней вверх
      let current = avatar.parentElement
      let maxDepth = 5
      while (current && maxDepth > 0) {
        // Проверяем, содержит ли текущий элемент и аватар, и никнейм
        const hasAvatar = current.querySelector('img[aria-label="avatar"]')
        const hasNickname = current.querySelector('[class*="Nickname"], [class*="Name"]')
        
        if (hasAvatar && hasNickname) {
          return current
        }
        
        current = current.parentElement
        maxDepth--
      }
      
      return null
    }).filter(Boolean) as Element[]
    
    allElements.push(...playerCards)
  }
  
  // Убираем дубликаты и возвращаем уникальные элементы
  const uniqueElements = allElements.filter((element, index, array) => {
    return array.findIndex(el => el === element) === index
  })
  
  // Ограничиваем количество элементов
  const limitedElements = uniqueElements.slice(0, 20)
  
  // Группируем элементы по их родительским контейнерам
  const groupedElements = limitedElements.map(element => {
    // Сначала ищем контейнер с type="button" aria-haspopup="dialog"
    const buttonContainer = element.closest('[type="button"][aria-haspopup="dialog"]')
    if (buttonContainer) {
      return buttonContainer
    }
    
    // Затем ищем контейнер с несколькими элементами игроков
    let parent = element.parentElement
    let maxDepth = 3
    while (parent && maxDepth > 0) {
      const siblings = parent.querySelectorAll(selectors.join(','))
      if (siblings.length >= 2 && siblings.length <= 20) {
        return parent
      }
      parent = parent.parentElement
      maxDepth--
    }
    return element
  }).filter(Boolean) as Element[]
  
  return groupedElements
}



/**
 * Извлекает никнейм игрока (вспомогательная функция)
 * Использует проверенную функцию из match-room.ts
 */
function extractNickname(playerCard: Element): string | null {
  // Сначала пробуем стандартную функцию
  const nickname = DomQueryService.extractNickname(playerCard)
  if (nickname) {
    return nickname
  }
  
  // Если не нашли, ищем более специфично для новой структуры FACEIT
  const selectors = [
    '[class*="Nickname__Name"]', // Точный селектор из FACEIT
    '[class*="Nickname"]',
    '[class*="Name"]',
    '[class*="Text"][class*="Nickname"]',
    '[class*="Text"][class*="Name"]'
  ]
  
  for (const selector of selectors) {
    try {
      const elements = playerCard.querySelectorAll(selector)
      for (const el of elements) {
        const text = el.textContent?.trim()
        if (text && text.length > 0 && text !== '< blank >' && !el.querySelector('svg')) {
          return text
        }
      }
    } catch (e) {
      // Игнорируем ошибки селекторов
    }
  }
  
  // Fallback: ищем любой текст, который похож на никнейм
  const allTextElements = playerCard.querySelectorAll('div, span, p')
  for (const el of allTextElements) {
    const text = el.textContent?.trim()
    if (text && 
        text.length > 0 && 
        text.length < 30 && 
        text !== '< blank >' && 
        !el.querySelector('svg') &&
        /^[\w\-\[\]\.]+$/u.test(text)) {  
      return text
    }
  }
  
  return null
}