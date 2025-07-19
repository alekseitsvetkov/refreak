export type Language = 'en' | 'ru'

export interface Translations {
  // Header
  appName: string
  appDescription: string
  
  // Tabs
  home: string
  features: string
  settings: string
  
  // Home tab
  enabled: string
  enabledDescription: string
  
  // Features tab
  smurfDetection: string
  smurfDetectionDescription: string
  hideCampaigns: string
  hideCampaignsDescription: string
  
  // Settings tab
  additionalSettings: string
  language: string
  languageDescription: string
  
  // Common
  loading: string
  
  // Smurf detection
  smurf: string
  playerChecking: string
}

const translations: Record<Language, Translations> = {
  en: {
    appName: 'Refreak',
    appDescription: 'Enhances your experience on FACEIT',
    
    home: 'Home',
    features: 'Features',
    settings: 'Settings',
    
    enabled: 'Enabled',
    enabledDescription: 'Enable or disable the extension',
    
    smurfDetection: 'Smurf detection',
    smurfDetectionDescription: 'Detect potential smurf accounts using player stats',
    hideCampaigns: 'Hide campaign widget',
    hideCampaignsDescription: 'Hide campaign widget from FACEIT match room page',
    
    additionalSettings: 'Additional settings will be available here',
    language: 'Language',
    languageDescription: 'Choose the interface language',
    
    loading: 'Loading...',
    
    smurf: 'SMURF',
    playerChecking: 'Checking player'
  },
  ru: {
    appName: 'Refreak',
    appDescription: 'Расширение для FACEIT',
    
    home: 'Главная',
    features: 'Функции',
    settings: 'Настройки',
    
    enabled: 'Включено',
    enabledDescription: 'Включить или отключить расширение',
    
    smurfDetection: 'Обнаружение смурфов',
    smurfDetectionDescription: 'Обнаруживать потенциальные смурф-аккаунты,\n используя статистику игроков',
    hideCampaigns: 'Скрыть промо-виджет',
    hideCampaignsDescription: 'Скрыть промо-виджет в команте матча на FACEIT',
    
    additionalSettings: 'Дополнительные настройки будут доступны здесь',
    language: 'Язык',
    languageDescription: 'Выберите язык интерфейса',
    
    loading: 'Загрузка...',
    
    smurf: 'СМУРФ',
    playerChecking: 'Проверяем игрока'
  }
}

// Простая функция для получения языка по умолчанию (всегда английский)
export function getDefaultLanguage(): Language {
  return 'en'
}

export function getTranslations(language: Language): Translations {
  return translations[language] || translations.en
}

export function t(language: Language, key: keyof Translations): string {
  const trans = getTranslations(language)
  return trans[key] || key
} 