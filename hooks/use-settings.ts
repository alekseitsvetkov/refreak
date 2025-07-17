import { useEffect, useState } from 'react'
import { appearanceSettings, systemSettings, uiSettings, type AppearanceSettings, type SystemSettings, type UISettings, type Theme } from '../lib/storage'

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
  const [appearance, setAppearance] = useState<AppearanceSettings>({ theme: 'system' })
  const [system, setSystem] = useState<SystemSettings>({ 
    notifications: true, 
    syncInterval: 15, 
    enabled: true, 
    smurfDetection: true 
  })
  const [ui, setUI] = useState<UISettings>({ activeTab: 'home' })
  const [loading, setLoading] = useState(true)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [appearanceData, systemData, uiData] = await Promise.all([
          appearanceSettings.getValue(),
          systemSettings.getValue(),
          uiSettings.getValue()
        ])
        
        setAppearance(appearanceData)
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

  // Update appearance settings
  const updateAppearance = async (updates: Partial<AppearanceSettings>) => {
    const newSettings = { ...appearance, ...updates }
    setAppearance(newSettings)
    try {
      await appearanceSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save appearance settings:', error)
    }
  }

  // Update system settings
  const updateSystem = async (updates: Partial<SystemSettings>) => {
    const newSettings = { ...system, ...updates }
    setSystem(newSettings)
    try {
      await systemSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save system settings:', error)
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
        appearanceSettings.removeValue(),
        systemSettings.removeValue(),
        uiSettings.removeValue()
      ])
      
      // Reset to default values
      const defaultAppearance = { theme: 'system' as Theme }
      const defaultSystem = { 
        notifications: true, 
        syncInterval: 15, 
        enabled: true, 
        smurfDetection: true 
      }
      const defaultUI = { activeTab: 'home' }
      
      setAppearance(defaultAppearance)
      setSystem(defaultSystem)
      setUI(defaultUI)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  return {
    appearance,
    system,
    ui,
    loading,
    updateAppearance,
    updateSystem,
    updateUI,
    resetSettings
  }
} 