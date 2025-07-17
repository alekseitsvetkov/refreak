import { getCurrentPath } from './match-room'

export const getPlayerProfileNickname = (path?: string) => {
  const match = /players(?:-modal)?\/([^/]+)/.exec(path || getCurrentPath())

  return match?.[1]
}

export const getPlayerProfileStatsGame = (path?: string) => {
  const match = /\/stats\/([a-z0-9]+)/.exec(path || getCurrentPath())

  return match?.[1]
} 