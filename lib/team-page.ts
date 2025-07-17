import { select, selectAll } from './match-room'
import { getCurrentPath } from './match-room'

export const getTeamId = (path?: string) => {
  const match =
    /teams\/([0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]+(?:-[0-9a-z]+)?)/.exec(
      path || getCurrentPath(),
    )

  return match?.[1]
}

export const getTeamMemberPlayerElements = (parent: Element) =>
  selectAll('ul.users-list > li', parent)

export const getTeamMemberNicknameElement = (parent: Element) =>
  select('strong[ng-bind="member.nickname"]', parent) 