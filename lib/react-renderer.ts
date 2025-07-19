import React from 'react'
import { createRoot, Root } from 'react-dom/client'
import tailwindCss from '../assets/output.css?raw'

// ============================================================================
// TYPES
// ============================================================================

export interface ThemeColors {
  readonly background: string
  readonly foreground: string
  readonly card: string
  readonly cardForeground: string
  readonly popover: string
  readonly popoverForeground: string
  readonly primary: string
  readonly primaryForeground: string
  readonly secondary: string
  readonly secondaryForeground: string
  readonly muted: string
  readonly mutedForeground: string
  readonly accent: string
  readonly accentForeground: string
  readonly destructive: string
  readonly border: string
  readonly input: string
  readonly ring: string
}

export interface RenderOptions {
  readonly theme?: ThemeColors
  readonly customStyles?: string
  readonly shadowMode?: 'open' | 'closed'
}

export interface RenderResult {
  readonly unmount: () => void
  readonly shadowRoot: ShadowRoot
  readonly reactRoot: HTMLElement
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_THEME: ThemeColors = {
  background: 'oklch(0.14 0 0)',
  foreground: 'oklch(0.985 0 0)',
  card: 'oklch(0.205 0 0)',
  cardForeground: 'oklch(0.985 0 0)',
  popover: 'oklch(0.205 0 0)',
  popoverForeground: 'oklch(0.985 0 0)',
  primary: 'oklch(0.922 0 0)',
  primaryForeground: 'oklch(0.205 0 0)',
  secondary: 'oklch(0.269 0 0)',
  secondaryForeground: 'oklch(0.985 0 0)',
  muted: 'oklch(0.269 0 0)',
  mutedForeground: 'oklch(0.708 0 0)',
  accent: 'oklch(0.269 0 0)',
  accentForeground: 'oklch(0.985 0 0)',
  destructive: 'oklch(0.704 0.191 22.216)',
  border: 'oklch(1 0 0 / 10%)',
  input: 'oklch(1 0 0 / 15%)',
  ring: 'oklch(0.556 0 0)'
} as const

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Utility class for common operations
 */
export class ReactRendererUtils {
  /**
   * Generate CSS custom properties from theme colors
   */
  static generateThemeCSS(theme: ThemeColors): string {
    return `
      :host {
        --background: ${theme.background};
        --foreground: ${theme.foreground};
        --card: ${theme.card};
        --card-foreground: ${theme.cardForeground};
        --popover: ${theme.popover};
        --popover-foreground: ${theme.popoverForeground};
        --primary: ${theme.primary};
        --primary-foreground: ${theme.primaryForeground};
        --secondary: ${theme.secondary};
        --secondary-foreground: ${theme.secondaryForeground};
        --muted: ${theme.muted};
        --muted-foreground: ${theme.mutedForeground};
        --accent: ${theme.accent};
        --accent-foreground: ${theme.accentForeground};
        --destructive: ${theme.destructive};
        --border: ${theme.border};
        --input: ${theme.input};
        --ring: ${theme.ring};
      }
    `
  }

  /**
   * Create a style element with given content
   */
  static createStyleElement(content: string): HTMLStyleElement {
    const style = document.createElement('style')
    style.textContent = content
    return style
  }

  /**
   * Validate container element
   */
  static validateContainer(container: HTMLElement): void {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Container must be a valid HTMLElement')
    }

    if (container.shadowRoot) {
      throw new Error('Container already has a shadow root')
    }
  }

  /**
   * Create shadow root with error handling
   */
  static createShadowRoot(container: HTMLElement, mode: 'open' | 'closed' = 'open'): ShadowRoot {
    try {
      return container.attachShadow({ mode })
    } catch (error) {
      throw new Error(`Failed to create shadow root: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// ============================================================================
// SHADOW DOM SERVICE
// ============================================================================

/**
 * Service for managing shadow DOM operations
 */
export class ShadowDomService {
  /**
   * Create shadow root with styles
   */
  static createShadowWithStyles(
    container: HTMLElement, 
    options: RenderOptions = {}
  ): { shadowRoot: ShadowRoot; reactRoot: HTMLElement } {
    // Validate container
    ReactRendererUtils.validateContainer(container)

    // Create shadow root
    const shadowRoot = ReactRendererUtils.createShadowRoot(
      container, 
      options.shadowMode
    )

    // Create React root element
    const reactRoot = document.createElement('div')
    shadowRoot.appendChild(reactRoot)

    // Inject styles
    this.injectStyles(shadowRoot, options)

    return { shadowRoot, reactRoot }
  }

  /**
   * Inject all necessary styles into shadow root
   */
  private static injectStyles(shadowRoot: ShadowRoot, options: RenderOptions): void {
    // Inject Tailwind CSS
    const tailwindStyle = ReactRendererUtils.createStyleElement(tailwindCss)
    shadowRoot.appendChild(tailwindStyle)

    // Inject theme CSS variables
    const theme = options.theme ?? DEFAULT_THEME
    const themeCSS = ReactRendererUtils.generateThemeCSS(theme)
    const themeStyle = ReactRendererUtils.createStyleElement(themeCSS)
    shadowRoot.appendChild(themeStyle)

    // Inject custom styles if provided
    if (options.customStyles) {
      const customStyle = ReactRendererUtils.createStyleElement(options.customStyles)
      shadowRoot.appendChild(customStyle)
    }
  }
}

// ============================================================================
// REACT RENDERER SERVICE
// ============================================================================

/**
 * Service for React rendering operations
 */
export class ReactRendererService {
  private static readonly activeRoots = new Map<HTMLElement, Root>()

  /**
   * Render React component into shadow DOM
   */
  static render<T extends Record<string, any>>(
    Component: React.ComponentType<T>,
    props: T,
    container: HTMLElement,
    options: RenderOptions = {}
  ): RenderResult {
    try {
      // Create shadow DOM with styles
      const { shadowRoot, reactRoot } = ShadowDomService.createShadowWithStyles(container, options)

      // Create React root
      const root = createRoot(reactRoot)
      this.activeRoots.set(container, root)

      // Render component
      root.render(React.createElement(Component, props))

      // Return cleanup function and references
      return {
        unmount: () => this.unmount(container),
        shadowRoot,
        reactRoot
      }
    } catch (error) {
      console.error('Failed to render React component:', error)
      throw error
    }
  }

  /**
   * Unmount React component and cleanup
   */
  static unmount(container: HTMLElement): void {
    const root = this.activeRoots.get(container)
    if (root) {
      try {
        root.unmount()
        this.activeRoots.delete(container)
      } catch (error) {
        console.error('Failed to unmount React component:', error)
      }
    }
  }

  /**
   * Check if container has active React root
   */
  static hasActiveRoot(container: HTMLElement): boolean {
    return this.activeRoots.has(container)
  }

  /**
   * Get all active containers
   */
  static getActiveContainers(): HTMLElement[] {
    return Array.from(this.activeRoots.keys())
  }

  /**
   * Unmount all active components
   */
  static unmountAll(): void {
    const containers = this.getActiveContainers()
    containers.forEach(container => this.unmount(container))
  }
}

// ============================================================================
// THEME SERVICE
// ============================================================================

/**
 * Service for theme management
 */
export class ThemeService {
  /**
   * Create light theme colors
   */
  static createLightTheme(): ThemeColors {
    return {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.14 0 0)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.14 0 0)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.14 0 0)',
      primary: 'oklch(0.14 0 0)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.95 0 0)',
      secondaryForeground: 'oklch(0.14 0 0)',
      muted: 'oklch(0.95 0 0)',
      mutedForeground: 'oklch(0.45 0 0)',
      accent: 'oklch(0.95 0 0)',
      accentForeground: 'oklch(0.14 0 0)',
      destructive: 'oklch(0.704 0.191 22.216)',
      border: 'oklch(0.9 0 0)',
      input: 'oklch(0.95 0 0)',
      ring: 'oklch(0.14 0 0)'
    }
  }

  /**
   * Create dark theme colors (default)
   */
  static createDarkTheme(): ThemeColors {
    return { ...DEFAULT_THEME }
  }

  /**
   * Create custom theme from partial colors
   */
  static createCustomTheme(partialTheme: Partial<ThemeColors>): ThemeColors {
    return { ...DEFAULT_THEME, ...partialTheme }
  }

  /**
   * Validate theme colors
   */
  static validateTheme(theme: ThemeColors): boolean {
    const requiredKeys: (keyof ThemeColors)[] = [
      'background', 'foreground', 'card', 'cardForeground',
      'popover', 'popoverForeground', 'primary', 'primaryForeground',
      'secondary', 'secondaryForeground', 'muted', 'mutedForeground',
      'accent', 'accentForeground', 'destructive', 'border', 'input', 'ring'
    ]

    return requiredKeys.every(key => 
      theme[key] && typeof theme[key] === 'string' && theme[key].trim().length > 0
    )
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Main function to render React component into shadow DOM
 * 
 * @param Component - React component to render
 * @param props - Props to pass to the component
 * @param container - HTML element to render into
 * @param options - Rendering options (theme, custom styles, etc.)
 * @returns Object with unmount function and references
 * 
 * @example
 * ```typescript
 * const { unmount } = renderReactComponent(
 *   MyComponent,
 *   { title: 'Hello' },
 *   document.getElementById('container')!,
 *   { theme: ThemeService.createLightTheme() }
 * )
 * 
 * // Later cleanup
 * unmount()
 * ```
 */
export function renderReactComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  props: T,
  container: HTMLElement,
  options: RenderOptions = {}
): RenderResult {
  return ReactRendererService.render(Component, props, container, options)
}

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

// Re-export for backward compatibility
export const renderReactComponentLegacy = renderReactComponent 