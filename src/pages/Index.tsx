
import Header from "../components/Header";
import NavigationColumn from "../components/NavigationColumn";
import TriageListColumn from "../components/TriageListColumn";
import DetailPaneColumn from "../components/DetailPaneColumn";
import MobileEmailDetail from "../components/MobileEmailDetail";
import { useState, useEffect } from "react";
import { emailService } from "../services/emailService";
import { authService } from "../services/authService";
import { useToast } from "../hooks/use-toast";
import { useGlobalLoading } from "../hooks/useGlobalLoading";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
  const [emailStats, setEmailStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { toast } = useToast();
  const { setLoading, setLoadingMessage } = useGlobalLoading();

  // Trigger initial email sync after authentication
  useEffect(() => {
    const triggerInitialSync = async () => {
      if (authService.isAuthenticated() && !isInitialSyncDone) {
        try {
          setLoading(true);
          setLoadingMessage("Syncing your emails...");
          
          toast({
            title: "Email sync started",
            description: "Fetching your latest emails...",
          });
          
          const result = await emailService.syncEmails();
          
          toast({
            title: "Emails up-to-date",
            description: `Synced ${result.emailsSynced} new emails`,
          });
          
          setRefreshTrigger(prev => prev + 1);
          setIsInitialSyncDone(true);
        } catch (error) {
          console.error('Initial sync failed:', error);
          toast({
            title: "Sync failed",
            description: "Could not sync emails. You can try manually.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    triggerInitialSync();
  }, [toast, isInitialSyncDone]);

  // Fetch email statistics
  useEffect(() => {
    const fetchStats = async () => {
      if (!authService.isAuthenticated()) return;
      
      try {
        setStatsLoading(true);
        const stats = await emailService.fetchEmailStats();
        setEmailStats(stats);
      } catch (error) {
        console.error('Error fetching email stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [refreshTrigger]);

  const handleSyncComplete = () => {
    // Trigger a refresh of the email list and stats
    setRefreshTrigger(prev => prev + 1);
  };

  const handleManualRefresh = async () => {
    try {
      setLoading(true);
      setLoadingMessage("Refreshing emails...");
      
      toast({
        title: "Refreshing emails",
        description: "Syncing your latest emails...",
      });
      
      const result = await emailService.syncEmails();
      
      toast({
        title: "Emails up-to-date",
        description: `Synced ${result.emailsSynced} new emails`,
      });
      
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast({
        title: "Refresh failed",
        description: "Could not sync emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler functions for the new 3-column layout
  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedEmailId(null); // Clear selected email when changing category
  };

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Main Dashboard Container with 3-Column Layout */}
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Column 1: Navigation & Categories */}
        <NavigationColumn
          emailStats={emailStats}
          statsLoading={statsLoading}
          selectedCategory={selectedCategory}
          onCategoryChange={handleSelectCategory}
          refreshTrigger={refreshTrigger}
          onManualRefresh={handleManualRefresh}
          onSyncComplete={handleSyncComplete}
        />

        {/* Column 2: Email Triage List */}
        <TriageListColumn
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          refreshTrigger={refreshTrigger}
          selectedEmailId={selectedEmailId}
          onSelectEmail={handleSelectEmail}
        />

        {/* Column 3: Email Detail Pane */}
        <DetailPaneColumn selectedEmailId={selectedEmailId} />
      </div>

      {/* Mobile Responsive: Show detail pane as overlay on smaller screens */}
      <MobileEmailDetail 
        selectedEmailId={selectedEmailId}
        onClose={() => setSelectedEmailId(null)}
      />
    </div>
  );
};

export default Index;
