import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Megaphone, Bell, Settings } from 'lucide-react';
import { BroadcastTab } from '@/components/messaging/BroadcastTab';
import { NotificationsTab } from '@/components/messaging/NotificationsTab';
import { TwilioSettingsTab } from '@/components/messaging/TwilioSettingsTab';

export default function Messaging() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Mensajería WhatsApp
        </h1>
        <p className="text-muted-foreground mt-1">
          Envía mensajes individuales, campañas masivas y notificaciones automáticas vía WhatsApp
        </p>
      </div>

      <Tabs defaultValue="broadcast" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Campañas
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notificaciones
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast">
          <BroadcastTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="settings">
          <TwilioSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
