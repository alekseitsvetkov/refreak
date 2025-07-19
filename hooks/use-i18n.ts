import { useMemo, useCallback } from 'react'
import { useSettings } from './use-settings'
import { getTranslations, type Language, type Translations } from '../lib/i18n'

export function useI18n() {
  const { system, loading } = useSettings()
  
  const language: Language = system.language || 'en'
  
  // Используем useMemo для кэширования переводов и обеспечения реактивности
  const translations: Translations = useMemo(() => {
    return getTranslations(language)
  }, [language])
  
  // Используем useCallback для стабильности функции перевода
  const t = useCallback((key: keyof Translations): string => {
    return translations[key] || key
  }, [translations])
  
  return {
    language,
    translations,
    t,
    loading
  }
} 