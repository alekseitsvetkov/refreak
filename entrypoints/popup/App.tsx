import { useAppConfig } from '#imports'
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
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import {
  Calendar,
  Heart,
  House,
  Mail,
  Monitor,
  Moon,
  Rocket,
  Settings,
  Sun,
  User
} from 'lucide-react'

function App() {
  const config = useAppConfig()
  const { appearance, system, ui, loading, updateAppearance, updateSystem, updateUI, resetSettings } = useSettings()
  const { resolvedTheme, setTheme } = useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

  const themeOptions = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon }
  ] as const

  const handleSyncIntervalChange = (value: string) => {
    const interval = parseInt(value)
    if (!isNaN(interval) && interval > 0) {
      updateSystem({ syncInterval: interval })
    }
  }

  const handleTabChange = (value: string) => {
    updateUI({ activeTab: value })
  }

  if (loading) {
    return (
      <div className="w-full bg-background p-4">
          <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg flex items-center gap-2">
              Refreak <Badge variant="outline">v1.0.0</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Enhances your experience on FACEIT
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
              Home
            </TabsTrigger>
            <TabsTrigger
            value="features"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
            <Rocket className="h-4 w-4" />
            Features
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

        <TabsContent value="home" className="mt-2 px-4 pb-4">
          <div className="space-y-4">
                          <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Enabled
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable the extension
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
          {/* System Settings */}
                <div className="space-y-4">
            {/* <div>
              <h3 className="text-lg font-semibold">System Settings</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Core extension functionality
              </p>
            </div> */}

            {/* <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable push notifications
                </p>
                    </div>
              <Switch
                checked={system.notifications}
                onCheckedChange={(checked) => updateSystem({ notifications: checked })}
              />
            </div> */}

                         <div className="flex items-center justify-between">
               <div>
                 <Label className="text-sm font-medium">
                   Smurf detection
                 </Label>
                 <p className="text-xs text-muted-foreground">
                 Detect potential smurf accounts using player stats <br /> and show badges for suspicious players
                 </p>
                    </div>
               <Switch
                 checked={system.smurfDetection}
                 onCheckedChange={(checked) => updateSystem({ smurfDetection: checked })}
               />
                </div>
              </div>
          </TabsContent>

        <TabsContent value="settings" className="mt-2 px-4 pb-4">
          <div className="space-y-6">
                {/* Appearance Settings */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Theme</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {themeOptions.map((option) => {
                        const Icon = option.icon
                        const isActive = appearance.theme === option.value
                        return (
                          <Button
                            key={option.value}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTheme(option.value)}
                            className="flex flex-col gap-1 h-auto py-3"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-xs">{option.label}</span>
                          </Button>
                        )
                      })}
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