import { select } from './match-room'
 
export const isLoggedIn = () =>
  !select('.main-header__right__logged-out') 