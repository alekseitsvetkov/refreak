import React from 'react'
import { createRoot } from 'react-dom/client'
import tailwindCss from '../assets/output.css?raw'

export function renderReactComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  props: T,
  container: HTMLElement
): () => void {
  // Создаём shadow root
  const shadow = container.attachShadow({ mode: 'open' })

  // Создаём div для React root
  const reactRoot = document.createElement('div')
  shadow.appendChild(reactRoot)

  // Инжектим стили внутрь shadow root
  const style = document.createElement('style')
  style.textContent = tailwindCss
  shadow.appendChild(style)

  // Добавляем CSS переменные для темной темы
  const themeVars = document.createElement('style')
  themeVars.textContent = `
    :host {
      --background: oklch(0.14 0 0);
      --foreground: oklch(0.985 0 0);
      --card: oklch(0.205 0 0);
      --card-foreground: oklch(0.985 0 0);
      --popover: oklch(0.205 0 0);
      --popover-foreground: oklch(0.985 0 0);
      --primary: oklch(0.922 0 0);
      --primary-foreground: oklch(0.205 0 0);
      --secondary: oklch(0.269 0 0);
      --secondary-foreground: oklch(0.985 0 0);
      --muted: oklch(0.269 0 0);
      --muted-foreground: oklch(0.708 0 0);
      --accent: oklch(0.269 0 0);
      --accent-foreground: oklch(0.985 0 0);
      --destructive: oklch(0.704 0.191 22.216);
      --border: oklch(1 0 0 / 10%);
      --input: oklch(1 0 0 / 15%);
      --ring: oklch(0.556 0 0);
    }
  `
  shadow.appendChild(themeVars)

  // Рендерим React-компонент
  const root = createRoot(reactRoot)
  root.render(React.createElement(Component, props))

  // Возвращаем функцию очистки
  return () => root.unmount()
} 