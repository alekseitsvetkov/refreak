/**
 * Анализирует статистику игрока и определяет вероятность того, что он является смурфом
 * @param {Object} stats - Статистика игрока
 * @returns {Object} - Результат анализа смурфа
 */
export const analyzeSmurfProbability = (stats) => {
  const {
    matches,
    winRate,
    averageKills,
    averageKDRatio,
    averageKRRatio,
    averageHeadshots,
  } = stats

  let smurfScore = 0
  const reasons = []

  // Проверяем количество матчей (наибольший вес - смурфы обычно имеют мало матчей)
  if (matches <= 1) {
    smurfScore += 50
    reasons.push('Всего один матч')
  } else if (matches <= 50) {
    smurfScore += 40
    reasons.push('Очень мало матчей')
  } else if (matches <= 100) {
    smurfScore += 30
    reasons.push('Мало матчей')
  } else if (matches <= 250) {
    smurfScore += 20
    reasons.push('Умеренное количество матчей')
  }

  // Проверяем K/R (второй по важности - смурфы обычно имеют высокий K/R)
  if (averageKRRatio >= 1.2) {
    smurfScore += 35
    reasons.push('Очень высокий K/R')
  } else if (averageKRRatio >= 1.0) {
    smurfScore += 25
    reasons.push('Высокий K/R')
  } else if (averageKRRatio >= 0.8) {
    smurfScore += 15
    reasons.push('Хороший K/R')
  }

  // Проверяем K/D (третий по важности - смурфы обычно имеют высокий K/D)
  if (averageKDRatio >= 2.0) {
    smurfScore += 30
    reasons.push('Очень высокий K/D')
  } else if (averageKDRatio >= 1.5) {
    smurfScore += 20
    reasons.push('Высокий K/D')
  } else if (averageKDRatio >= 1.2) {
    smurfScore += 10
    reasons.push('Хороший K/D')
  }

  // Проверяем среднее количество убийств (четвертый по важности)
  if (averageKills >= 25) {
    smurfScore += 25
    reasons.push('Очень высокое среднее количество убийств')
  } else if (averageKills >= 20) {
    smurfScore += 20
    reasons.push('Высокое среднее количество убийств')
  } else if (averageKills >= 15) {
    smurfScore += 15
    reasons.push('Хорошее среднее количество убийств')
  } else if (averageKills >= 10) {
    smurfScore += 10
    reasons.push('Умеренное среднее количество убийств')
  }

  // Проверяем процент побед (пятый по важности - смурфы обычно имеют высокий винрейт)
  if (winRate >= 80) {
    smurfScore += 20
    reasons.push('Очень высокий винрейт')
  } else if (winRate >= 70) {
    smurfScore += 15
    reasons.push('Высокий винрейт')
  } else if (winRate >= 60) {
    smurfScore += 10
    reasons.push('Хороший винрейт')
  }

  // Проверяем процент хедшотов (наименьший вес - смурфы могут иметь высокий HS%)
  if (averageHeadshots >= 60) {
    smurfScore += 15
    reasons.push('Высокий HS%')
  } else if (averageHeadshots >= 50) {
    smurfScore += 10
    reasons.push('Хороший HS%')
  }

  // Определяем уровень вероятности
  let probability = 'low'
  let emoji = ''

  if (smurfScore >= 120) {
    probability = 'very_high'
    emoji = '🐔'
  } else if (smurfScore >= 80) {
    probability = 'high'
    emoji = '🐷'
  } else if (smurfScore >= 50) {
    probability = 'medium'
    emoji = ''
  } else if (smurfScore >= 25) {
    probability = 'low'
    emoji = ''
  } else {
    probability = 'very_low'
    emoji = ''
  }

  return {
    smurfScore,
    probability,
    emoji,
    reasons,
    stats: {
      matches,
      winRate,
      averageKills,
      averageKDRatio,
      averageKRRatio,
      averageHeadshots,
    },
  }
}
