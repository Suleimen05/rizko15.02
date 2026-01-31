import { useState } from 'react';
import { Bell, User, CreditCard, Shield, Globe, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/contexts/ThemeContext';
import { REVIEW_MODE } from '@/config/features';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState({
    trends: true,
    competitors: true,
    newVideos: false,
    weeklyReport: true,
  });

  const [preferences, setPreferences] = useState({
    autoGenerateScripts: true,
    language: 'en',
    region: 'US',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account preferences and notifications
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          {!REVIEW_MODE && <TabsTrigger value="notifications">Notifications</TabsTrigger>}
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          {!REVIEW_MODE && <TabsTrigger value="billing">Billing</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="@johndoe" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Enable dark theme</p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>
              {!REVIEW_MODE && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-generate Scripts</Label>
                    <p className="text-sm text-muted-foreground">Automatically create scripts from trending videos</p>
                  </div>
                  <Switch
                    checked={preferences.autoGenerateScripts}
                    onCheckedChange={(checked) =>
                      setPreferences({ ...preferences, autoGenerateScripts: checked })
                    }
                  />
                </div>
              )}
              {!REVIEW_MODE && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select
                      id="language"
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                      value={preferences.language}
                      onChange={(e) =>
                        setPreferences({ ...preferences, language: e.target.value })
                      }
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="region">Region</Label>
                    <select
                      id="region"
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                      value={preferences.region}
                      onChange={(e) =>
                        setPreferences({ ...preferences, region: e.target.value })
                      }
                    >
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Trending Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when new trends emerge</p>
                </div>
                <Switch
                  checked={notifications.trends}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, trends: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Competitor Updates</Label>
                  <p className="text-sm text-muted-foreground">Track competitor activity</p>
                </div>
                <Switch
                  checked={notifications.competitors}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, competitors: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Video Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notifications for new viral videos in your niche</p>
                </div>
                <Switch
                  checked={notifications.newVideos}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, newVideos: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly performance summaries</p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, weeklyReport: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Sharing</Label>
                  <p className="text-sm text-muted-foreground">Allow anonymous usage analytics</p>
                </div>
                <Switch />
              </div>
              <div className="pt-4">
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription & Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Pro Plan</p>
                    <p className="text-sm text-muted-foreground">Unlimited AI scripts & analytics</p>
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Next billing date</span>
                <span className="font-medium">January 30, 2026</span>
              </div>
              <Button>Manage Subscription</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Export with original name for compatibility
export { SettingsPage as Settings };
