// import { getMatchmakingQueue } from './faceit-api'

export function normalizeElo(elo: string): number {
  return Number(elo.replace(',', ''))
}

export function estimateRatingChange(elo1: number, elo2: number, K: number = 50) {
  const eloDiff = elo2 - elo1
  const percentage = 1 / (1 + 10 ** (eloDiff / 400))

  const gain = Math.round(K * (1 - percentage))
  const loss = Math.round(K * (0 - percentage))

  return {
    gain: gain || 1,
    loss: loss || -1,
  }
}

// Simple memoization implementation
const memoCache = new Map<string, any>()

export function estimateRatingChangeMemoized(elo1: number, elo2: number, K: number = 50) {
  const key = `${elo1}-${elo2}-${K}`
  if (memoCache.has(key)) {
    return memoCache.get(key)
  }
  
  const result = estimateRatingChange(elo1, elo2, K)
  memoCache.set(key, result)
  return result
}

export function predictRatingChange(winProbability: number, K: number = 50) {
  const gain = Math.round(K - winProbability * K)

  return {
    gain,
    loss: -(K - gain),
  }
}

export const SKILL_LEVELS_BY_GAME = {
  csgo: {
    1: [1, 800],
    2: [801, 950],
    3: [951, 1100],
    4: [1101, 1250],
    5: [1251, 1400],
    6: [1401, 1550],
    7: [1551, 1700],
    8: [1701, 1850],
    9: [1851, 2000],
    10: [2001, null],
  },
  cs2: {
    1: [1, 500],
    2: [501, 750],
    3: [751, 900],
    4: [901, 1050],
    5: [1051, 1200],
    6: [1201, 1350],
    7: [1351, 1530],
    8: [1531, 1750],
    9: [1751, 2000],
    10: [2001, null],
  },
}

// TODO: Implement getMatchmakingQueue in faceit-api.ts
export async function getEloChangesByMatches(matches: any[]) {
  // Temporarily disabled until getMatchmakingQueue is implemented
  return null
  
  /*
  const eloMatches = (
    await Promise.all(
      matches.map(async (match) => {
        const { competitionId } = match

        if (competitionId) {
          const [matchmakingQueue] =
            (await getMatchmakingQueue(competitionId)) || []

          if (!matchmakingQueue || !matchmakingQueue.calculateElo) {
            return
          }

          return match
        }
      }),
    )
  ).filter(Boolean)

  const eloHistoryByMatches = eloMatches.reverse().reduce((acc, match, i) => {
    if (i === 0) {
      return acc
    }

    const isWin = match.i2 === match.teamId

    const previousMatch = eloMatches[i - 1]

    const previousElo = previousMatch.elo && normalizeElo(previousMatch.elo)
    const newElo = match.elo && normalizeElo(match.elo)
    const eloDiff =
      typeof previousElo === 'number' && typeof newElo === 'number'
        ? newElo - previousElo
        : null

    if (
      !eloDiff ||
      (isWin && eloDiff < 0) ||
      (!isWin && eloDiff > 0) ||
      eloDiff > 50 ||
      eloDiff < -50
    ) {
      return acc
    }

    acc[match.matchId] = {
      previousElo,
      newElo,
      eloDiff,
    }

    return acc
  }, {} as Record<string, any>)

  return Object.keys(eloHistoryByMatches).length > 0
    ? eloHistoryByMatches
    : null
  */
} 