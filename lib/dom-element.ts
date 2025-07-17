import { select } from './match-room'

export const ENHANCER_ATTRIBUTE = 'data-refreak'

export const setFeatureAttribute = (featureName: string, element: Element) =>
  element.setAttribute(`${ENHANCER_ATTRIBUTE}-${featureName}`, '')

export const hasFeatureAttribute = (featureName: string, element: Element) =>
  element.hasAttribute(`${ENHANCER_ATTRIBUTE}-${featureName}`)

export const setStyle = (element: HTMLElement, style: string | string[]) =>
  element.setAttribute(
    'style',
    typeof style === 'string' ? `${style}` : style.join(';'),
  )

let isFaceitNextResult: boolean | null = null

export function isFaceitNext(): boolean {
  if (isFaceitNextResult !== null) {
    return isFaceitNextResult
  }

  isFaceitNextResult = select('#__next') !== null

  return isFaceitNextResult
} 