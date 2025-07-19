import { storage } from '#imports'

interface AppearanceSettings {
  // Removed theme setting - always dark theme
}

interface SystemSettings {
  notifications: boolean
  syncInterval: number
  enabled: boolean
  smurfDetection: boolean
  hideCampaigns: boolean
  language: 'en' | 'ru'
}

interface UISettings {
  activeTab: string
}

// Define storage items
export const appearanceSettings = storage.defineItem<AppearanceSettings>('local:appearanceSettings', {
  fallback: {}
})

export const systemSettings = storage.defineItem<SystemSettings>('local:systemSettings', {
  fallback: {
    notifications: true,
    syncInterval: 15,
    enabled: true,
    smurfDetection: true,
    hideCampaigns: false,
    language: 'en'
  }
})

export const uiSettings = storage.defineItem<UISettings>('local:uiSettings', {
  fallback: {
    activeTab: 'home'
  }
})

export type { AppearanceSettings, SystemSettings, UISettings } 