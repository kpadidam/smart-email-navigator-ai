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
import { Menu, X, Mail, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
  const [emailStats, setEmailStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
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

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedEmailId(null);
    setMobileNavOpen(false); // Close nav on mobile after selection
  };

  const handleSelectEmail = (emailId: string) => {
    setSelectedEmailId(emailId);
    setMobileDetailOpen(true); // Open detail view on mobile
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Mobile Header Bar */}
      <div className="lg:hidden sticky top-16 z-20 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <NavigationColumn
              emailStats={emailStats}
              statsLoading={statsLoading}
              selectedCategory={selectedCategory}
              onCategoryChange={handleSelectCategory}
              refreshTrigger={refreshTrigger}
              onManualRefresh={handleManualRefresh}
              onSyncComplete={handleSyncComplete}
            />
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">
            {selectedCategory === "all" ? "All Emails" : selectedCategory}
          </span>
        </div>
        
        <Button variant="ghost" size="icon">
          <Filter className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main Dashboard Container */}
      <div className="flex h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Desktop Navigation - Hidden on Mobile */}
        <div className="hidden lg:block">
          <NavigationColumn
            emailStats={emailStats}
            statsLoading={statsLoading}
            selectedCategory={selectedCategory}
            onCategoryChange={handleSelectCategory}
            refreshTrigger={refreshTrigger}
            onManualRefresh={handleManualRefresh}
            onSyncComplete={handleSyncComplete}
          />
        </div>

        {/* Email List - Full Width on Mobile, Normal on Desktop */}
        <div className={cn(
          "flex-1 lg:flex-initial lg:min-w-0",
          "w-full lg:w-auto"
        )}>
          <TriageListColumn
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            refreshTrigger={refreshTrigger}
            selectedEmailId={selectedEmailId}
            onSelectEmail={handleSelectEmail}
          />
        </div>

        {/* Desktop Detail Pane - Hidden on Mobile */}
        <div className="hidden lg:block flex-1">
          <DetailPaneColumn selectedEmailId={selectedEmailId} />
        </div>
      </div>

      {/* Mobile Detail Sheet */}
      <Sheet open={mobileDetailOpen && !!selectedEmailId} onOpenChange={setMobileDetailOpen}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-lg">
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Email Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileDetailOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DetailPaneColumn selectedEmailId={selectedEmailId} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;