import select from 'select-dom'
import storage from '../../shared/storage'
import createSmurfBadge from '../components/smurf-badge'
import {
  hasFeatureAttribute,
  setFeatureAttribute,
} from '../helpers/dom-element'
import { getMatch, getPlayerStats } from '../helpers/faceit-api'
import { isSupportedGame } from '../helpers/games'
import { getRoomId } from '../helpers/match-room'
import { analyzeSmurfProbability } from '../helpers/smurf-detection'

const FEATURE_ATTRIBUTE = 'match-room-smurf-detection'

export default async () => {
  const matchRoomContentElement = select('[class*="Overview__Holder"]')

  if (
    !matchRoomContentElement ||
    hasFeatureAttribute(FEATURE_ATTRIBUTE, matchRoomContentElement)
  ) {
    return
  }

  setFeatureAttribute(FEATURE_ATTRIBUTE, matchRoomContentElement)

  const roomId = getRoomId()
  const match = await getMatch(roomId)

  if (!match || !isSupportedGame(match.game)) {
    return
  }

  const matchPlayers = [
    ...match.teams.faction1.roster,
    ...match.teams.faction2.roster,
  ]

  // Получаем статистику для всех игроков
  const playerStatsPromises = matchPlayers.map(async (player) => {
    try {
      const stats = await getPlayerStats(player.id, match.game, 20)
      return { player, stats }
    } catch (error) {
      console.error(`Failed to get stats for player ${player.nickname}:`, error)
      return { player, stats: null }
    }
  })

  const playerStatsResults = await Promise.all(playerStatsPromises)

  // Находим элементы игроков в DOM
  const matchPlayerElements = ['roster1', 'roster2'].reduce((acc, roster) => {
    const rosterElements = select.all(
      `div[name="${roster}"] [class*="ListContentPlayer__Body"]`,
      matchRoomContentElement,
    )
    acc.push(...rosterElements)
    return acc
  }, [])

  // Добавляем статистику для каждого игрока
  for (const matchPlayerElement of matchPlayerElements) {
    const matchPlayerNicknameElement = select(
      '[class*="Nickname__Name"]',
      matchPlayerElement,
    )

    if (!matchPlayerNicknameElement) {
      continue
    }

    const playerNickname = matchPlayerNicknameElement.innerText
    const playerData = playerStatsResults.find(
      ({ player }) => player.nickname === playerNickname,
    )

    if (!playerData || !playerData.stats) {
      continue
    }

    const { stats } = playerData

    // Анализируем вероятность того, что игрок является смурфом (если функция включена)
    const { matchRoomSmurfDetection: smurfDetectionEnabled } =
      await storage.getAll()
    let smurfAnalysis = null

    if (smurfDetectionEnabled) {
      smurfAnalysis = analyzeSmurfProbability(stats)
    }

    // Добавляем метку смурфа рядом с никнеймом (если функция включена)
    if (smurfDetectionEnabled && smurfAnalysis) {
      const existingSmurfBadge = select(
        '[data-refreak-smurf-badge]',
        matchPlayerElement,
      )

      if (!existingSmurfBadge) {
        const smurfBadge = createSmurfBadge({
          emoji: smurfAnalysis.emoji,
          smurfScore: smurfAnalysis.smurfScore,
          reasons: smurfAnalysis.reasons,
        })

        smurfBadge.setAttribute('data-refreak-smurf-badge', 'true')

        // Добавляем метку перед никнеймом игрока
        const nicknameContainer = select(
          '[class*="Nickname__Container"]',
          matchPlayerElement,
        )

        if (nicknameContainer) {
          // Вставляем метку в начало контейнера с никнеймом
          nicknameContainer.insertBefore(
            smurfBadge,
            nicknameContainer.firstChild,
          )
        }
      }
    }
  }
}
