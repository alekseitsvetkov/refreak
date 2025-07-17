import React, { useEffect, useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface PlayerStats {
  matches: number
  averageKDRatio: number
  averageKRRatio: number
  averageHeadshots: number
  averageKills: number
  averageADR: number
  winRate: number
}

interface SmurfIndicatorProps {
  nickname: string
  confidence: number
  reasons: string[]
  stats?: PlayerStats
}

export function SmurfIndicator({ nickname, confidence, reasons, stats }: SmurfIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    // Создаем контейнер для портала внутри shadow DOM
    if (containerRef.current) {
      const portalContainer = document.createElement('div')
      portalContainer.id = 'refreak-popover-portal'
      portalContainer.style.position = 'relative'
      portalContainer.style.zIndex = '9999'
      portalContainer.style.pointerEvents = 'none'
      containerRef.current.appendChild(portalContainer)
    }
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150) // Небольшая задержка для плавного перехода
  }

  const confidenceVariant = confidence >= 70 ? 'destructive' : 
                           confidence >= 50 ? 'default' : 'secondary'

  return (
    <div ref={containerRef} className="relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Badge 
              variant={confidenceVariant}
              className="cursor-pointer hover:opacity-80 transition-opacity text-xs font-bold px-2 py-1 rounded"
            >
              SMURF {confidence}%
            </Badge>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 z-50" 
          align="start" 
          side="right"
          container={containerRef.current?.querySelector('#refreak-popover-portal')}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Card className="shadow-none bg-background border border-border">
            <CardHeader>
              <CardTitle>Smurf Detection ({confidence}%)</CardTitle>
            </CardHeader>
            <CardContent className="border border-border">
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium text-xs text-foreground mb-2">Reasons:</h5>
                  <div className="space-y-1">
                    {reasons.map((reason, index) => (
                      <div key={index} className="text-xs text-muted-foreground leading-relaxed">
                        • {reason}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* {stats && (
                  <div>
                    <h5 className="font-medium text-xs text-foreground mb-2">Stats:</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Matches: {stats.matches}</div>
                      <div>K/D: {stats.averageKDRatio}</div>
                      <div>K/R: {stats.averageKRRatio}</div>
                      <div>ADR: {stats.averageADR}</div>
                      <div>Win Rate: {stats.winRate}%</div>
                      <div>Kills: {stats.averageKills}</div>
                      <div>Headshots: {stats.averageHeadshots}%</div>
                    </div>
                  </div>
                )} */}
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  )
} 