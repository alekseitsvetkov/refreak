import { storage } from '#imports'

type Theme = 'system' | 'light' | 'dark'

interface AppearanceSettings {
  theme: Theme
}

interface SystemSettings {
  notifications: boolean
  syncInterval: number
  enabled: boolean
  smurfDetection: boolean
}

interface UISettings {
  activeTab: string
}

// Define storage items
export const appearanceSettings = storage.defineItem<AppearanceSettings>('local:appearanceSettings', {
  fallback: {
    theme: 'system'
  }
})

export const systemSettings = storage.defineItem<SystemSettings>('local:systemSettings', {
  fallback: {
    notifications: true,
    syncInterval: 15,
    enabled: true,
    smurfDetection: true
  }
})

export const uiSettings = storage.defineItem<UISettings>('local:uiSettings', {
  fallback: {
    activeTab: 'home'
  }
})

export type { AppearanceSettings, SystemSettings, UISettings, Theme } 