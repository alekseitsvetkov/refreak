import React from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { useI18n } from '../hooks/use-i18n'

interface SmurfDetectionHeaderLoaderProps {
  className?: string
}

export const SmurfDetectionHeaderLoader: React.FC<SmurfDetectionHeaderLoaderProps> = ({ 
  className 
}) => {
  const { t, loading } = useI18n()
  
  // Не показываем компонент пока не загрузятся настройки
  if (loading) {
    return null
  }
  
  return (
    <div className={`inline-flex items-center gap-2 ${className || ''}`}>
      <LoadingSpinner size="sm" />
      <span className="text-sm text-muted-foreground">{t('loading')}</span>
    </div>
  )
} 