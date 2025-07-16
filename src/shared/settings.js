export const MATCH_ROOM_VETO_LOCATION_ITEMS = {
  EU: ['UK', 'Sweden', 'France', 'Germany', 'Netherlands'],
  US: ['Chicago', 'Dallas', 'Denver', 'LosAngeles', 'NewYork'],
  Oceania: ['Sydney', 'Melbourne'],
}

export const MATCH_ROOM_VETO_LOCATION_REGIONS = Object.keys(
  MATCH_ROOM_VETO_LOCATION_ITEMS,
)

export const MATCH_ROOM_VETO_MAP_ITEMS = [
  'de_ancient',
  'de_anubis',
  'de_dust2',
  'de_inferno',
  'de_mirage',
  'de_nuke',
  'de_overpass',
  'de_vertigo',
]

export const DEFAULTS = {
  extensionEnabled: true,
  extensionEnabledFaceitBeta: false,
  headerShowElo: false,
  hideFaceitClientHasLandedBanner: false,
  playerProfileLevelProgress: false,
  partyAutoAcceptInvite: false,
  matchQueueAutoReady: false,
  matchRoomShowPlayerStats: true,
  matchRoomSmurfDetection: true,
  matchRoomAutoCopyServerData: false,
  matchRoomAutoConnectToServer: false,
  matchRoomHidePlayerControls: false,
  matchRoomAutoVetoLocations: false,
  matchRoomAutoVetoLocationItems: MATCH_ROOM_VETO_LOCATION_ITEMS,
  matchRoomAutoVetoMaps: false,
  matchRoomAutoVetoMapsShuffle: false,
  matchRoomAutoVetoMapsShuffleAmount: 3,
  matchRoomAutoVetoMapItems: MATCH_ROOM_VETO_MAP_ITEMS,
  matchRoomFocusMode: false,
  matchRoomLastConnectToServer: '',
  matchRoomSkinOfTheMatch: false,
  modalCloseMatchVictory: false,
  modalCloseMatchDefeat: false,
  modalCloseGlobalRankingUpdate: false,
  modalClickInactiveCheck: false,
  notifyDisabled: false,
  notifyPartyAutoAcceptInvite: false,
  notifyMatchQueueAutoReady: false,
  notifyMatchRoomAutoCopyServerData: false,
  notifyMatchRoomAutoConnectToServer: false,
  notifyMatchRoomAutoVetoLocations: false,
  notifyMatchRoomAutoVetoMaps: false,
  teamRosterPlayersInfo: false,
  refreakNotificationClosed: false,
  discordNotificationClosed: false,
  refreakV5Closed: false,
}
