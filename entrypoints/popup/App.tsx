import { useAppConfig } from '#imports'
import { useCallback, useEffect, useReducer, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettings } from '@/hooks/use-settings'
import { useI18n } from '@/hooks/use-i18n'
import { getTranslations } from '@/lib/i18n'
import { CacheStats } from '@/components/CacheStats'
import {
  Calendar,
  Heart,
  House,
  Mail,
  Rocket,
  Settings,
  User,
  Globe
} from 'lucide-react'

function App() {
  const config = useAppConfig()
  const { system, ui, loading, updateSystem, updateUI, resetSettings } = useSettings()
  const { t } = useI18n()
  
  // Локальное состояние для языка для мгновенного обновления
  const [localLanguage, setLocalLanguage] = useState(system.language || 'en')
  
  // Синхронизируем локальное состояние с настройками
  useEffect(() => {
    setLocalLanguage(system.language || 'en')
  }, [system.language])

  // Локальная функция перевода, использующая локальное состояние языка
  const localT = (key: string) => {
    const translations = getTranslations(localLanguage)
    return translations[key as keyof typeof translations] || key
  }

  const handleSyncIntervalChange = (value: string) => {
    const interval = parseInt(value)
    if (!isNaN(interval) && interval > 0) {
      updateSystem({ syncInterval: interval })
    }
  }

  const handleTabChange = (value: string) => {
    updateUI({ activeTab: value })
  }

  const handleLanguageChange = useCallback((newLanguage: 'en' | 'ru') => {
    // Обновляем локальное состояние мгновенно
    setLocalLanguage(newLanguage)
    // Обновляем настройки
    updateSystem({ language: newLanguage })
  }, [updateSystem])

  if (loading) {
    return (
      <div className="w-full bg-background p-4">
          <p className="text-muted-foreground">{localT('loading')}</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center">
            <Rocket className="h-5 w-5" style={{ color: '#FF5500' }} />
          </div>
          <div>
            <h1 className="font-semibold text-lg flex items-center gap-2">
              {localT('appName')} <Badge variant="outline">v{__APP_VERSION__}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              {localT('appDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Tabs value={ui.activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-auto rounded-none border-b bg-transparent w-full p-0">
            <TabsTrigger
              value="home"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
              <House className="h-4 w-4" />
              {localT('home')}
            </TabsTrigger>
            <TabsTrigger
            value="features"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
            <Rocket className="h-4 w-4" />
            {localT('features')}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
              <Settings className="h-4 w-4" />
              {localT('settings')}
            </TabsTrigger>
          </TabsList>

        <TabsContent value="home" className="mt-2 px-4 pb-4">
          <div className="space-y-4">
                          <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {localT('enabled')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {localT('enabledDescription')}
                  </p>
                </div>
                <Switch
                  checked={system.enabled}
                  onCheckedChange={(checked) => updateSystem({ enabled: checked })}
                />
              </div>
          </div>
          </TabsContent>

        <TabsContent value="features" className="mt-2 px-4 pb-4">
          <div className="space-y-6">
            {/* Smurf Detection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {localT('smurfDetection')}
                  </Label>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {localT('smurfDetectionDescription')}
                  </p>
                </div>
                <Switch
                  checked={system.smurfDetection}
                  onCheckedChange={(checked) => updateSystem({ smurfDetection: checked })}
                />
              </div>
            </div>

            {/* Hide Campaigns */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {localT('hideCampaigns')}
                  </Label>
                  <p className="text-xs text-muted-foreground whitespace-pre-line">
                    {localT('hideCampaignsDescription')}
                  </p>
                </div>
                <Switch
                  checked={system.hideCampaigns}
                  onCheckedChange={(checked) => updateSystem({ hideCampaigns: checked })}
                />
              </div>
            </div>

            {/* Cache Statistics */}
            {/* <CacheStats /> */}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-2 px-4 pb-4">
          <div className="space-y-6">
            {/* Language Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    {localT('language')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {localT('languageDescription')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={system.language} onValueChange={handleLanguageChange}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        </Tabs>
    </div>
  )
}

export default App