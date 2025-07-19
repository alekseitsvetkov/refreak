import { useEffect, useState } from 'react'
import { systemSettings, uiSettings, type SystemSettings, type UISettings } from '../lib/storage'
import { getDefaultLanguage } from '../lib/i18n'

// Re-export storage items for content script
export { systemSettings }

// Content script utilities
export async function runFeatureIf(
  featureName: string,
  featureFunction: () => void | Promise<void>
) {
  try {
    const settings = await systemSettings.getValue()
    
    // Check if the feature is enabled
    if (settings[featureName as keyof typeof settings] === true) {
      await featureFunction()
    }
  } catch (error) {
    console.error(`Failed to run feature ${featureName}:`, error)
  }
}

export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  try {
    const settings = await systemSettings.getValue()
    return settings[featureName as keyof typeof settings] === true
  } catch (error) {
    console.error(`Failed to check feature ${featureName}:`, error)
    return false
  }
}

// React hook for popup
export function useSettings() {
  // Инициализируем с английским языком по умолчанию
  const [system, setSystem] = useState<SystemSettings>({ 
    notifications: true, 
    syncInterval: 15, 
    enabled: true, 
    smurfDetection: true,
    hideCampaigns: false,
    language: getDefaultLanguage()
  })
  const [ui, setUI] = useState<UISettings>({ activeTab: 'home' })
  const [loading, setLoading] = useState(true)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [systemData, uiData] = await Promise.all([
          systemSettings.getValue(),
          uiSettings.getValue()
        ])
        
        // Initialize language if not set (for existing users)
        if (!systemData.language) {
          systemData.language = getDefaultLanguage()
          await systemSettings.setValue(systemData)
        }
        
        setSystem(systemData)
        setUI(uiData)
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Update system settings
  const updateSystem = async (updates: Partial<SystemSettings>) => {
    const newSettings = { ...system, ...updates }
    
    // Сначала обновляем локальное состояние синхронно
    setSystem(newSettings)
    
    // Затем сохраняем в storage асинхронно
    try {
      await systemSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save system settings:', error)
      // В случае ошибки откатываем изменения
      setSystem(system)
    }
  }

  // Update UI settings
  const updateUI = async (updates: Partial<UISettings>) => {
    const newSettings = { ...ui, ...updates }
    setUI(newSettings)
    try {
      await uiSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save UI settings:', error)
    }
  }

  // Reset all settings
  const resetSettings = async () => {
    try {
      await Promise.all([
        systemSettings.removeValue(),
        uiSettings.removeValue()
      ])
      
      // Reset to default values
      const defaultSystem = { 
        notifications: true, 
        syncInterval: 15, 
        enabled: true, 
        smurfDetection: true,
        hideCampaigns: false,
        language: getDefaultLanguage()
      }
      const defaultUI = { activeTab: 'home' }
      
      setSystem(defaultSystem)
      setUI(defaultUI)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  return {
    system,
    ui,
    loading,
    updateSystem,
    updateUI,
    resetSettings
  }
} 