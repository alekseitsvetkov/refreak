import React from 'react'
import { Badge } from './ui/badge'
import { LoadingSpinner } from './LoadingSpinner'
import { useI18n } from '../hooks/use-i18n'

interface SmurfDetectionLoaderProps {
  className?: string
}

export const SmurfDetectionLoader: React.FC<SmurfDetectionLoaderProps> = ({ 
  className 
}) => {
  const { t, loading } = useI18n()
  
  // Не показываем компонент пока не загрузятся настройки
  if (loading) {
    return null
  }
  
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Badge 
        variant="secondary"
        className="cursor-default text-xs font-bold px-2 py-1 rounded flex items-center gap-1"
      >
        <LoadingSpinner size="sm" />
        <span>{t('playerChecking')}</span>
      </Badge>
    </div>
  )
} 