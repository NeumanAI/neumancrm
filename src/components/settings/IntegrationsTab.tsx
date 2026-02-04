import { useIntegrations } from '@/hooks/useIntegrations';
import { GmailIntegrationCard } from './GmailIntegrationCard';
import { ManyChatIntegrationCard } from './ManyChatIntegrationCard';
import { WebchatIntegrationCard } from './WebchatIntegrationCard';
import { toast } from 'sonner';

export function IntegrationsTab() {
  const { getIntegration, disableIntegration } = useIntegrations();

  const gmailIntegration = getIntegration('gmail');
  const manychatIntegration = getIntegration('manychat');
  const webchatIntegration = getIntegration('webchat');

  async function disconnectGmail() {
    try {
      await disableIntegration.mutateAsync('gmail');
      toast.success('Gmail desconectado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  async function disableManychat() {
    try {
      await disableIntegration.mutateAsync('manychat');
      toast.success('ManyChat deshabilitado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  return (
    <div className="space-y-6">
      <GmailIntegrationCard 
        integration={gmailIntegration} 
        onDisconnect={disconnectGmail}
      />
      
      <ManyChatIntegrationCard 
        integration={manychatIntegration}
        onDisable={disableManychat}
      />
      
      <WebchatIntegrationCard 
        integration={webchatIntegration}
      />
    </div>
  );
}
