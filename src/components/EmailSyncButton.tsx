
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";

interface EmailSyncButtonProps {
  onSyncComplete?: () => void;
}

const EmailSyncButton = ({ onSyncComplete }: EmailSyncButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsLoading(true);
    try {
      console.log('Starting email sync...');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/emails/sync`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
      });

      console.log('Sync response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sync failed:', response.status, errorText);
        throw new Error(`Sync failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Sync result:', result);

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${result.emailsSynced || 0} emails`,
      });

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Email sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync emails",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading}
      variant="outline"
      className="flex items-center space-x-2"
    >
      {isLoading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          <span>Sync Emails</span>
        </>
      )}
    </Button>
  );
};

export default EmailSyncButton;
