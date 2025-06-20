import CategoryFilter from "./CategoryFilter";
import EmailSyncButton from "./EmailSyncButton";
import { EmailStats } from "@/services/emailService";

interface NavigationColumnProps {
  emailStats: EmailStats | null;
  statsLoading: boolean;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  refreshTrigger: number;
  onManualRefresh: () => void;
  onSyncComplete: () => void;
}

const NavigationColumn = ({
  emailStats,
  statsLoading,
  selectedCategory,
  onCategoryChange,
  refreshTrigger,
  onManualRefresh,
  onSyncComplete
}: NavigationColumnProps) => {
  return (
    <div className="column-nav flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Top Section: Logo and Stats */}
      <div className="p-6 border-b border-gray-100">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Smart Email Tracker</h1>
          <p className="text-sm text-gray-600">AI-powered email management</p>
        </div>
        
        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Total", value: emailStats?.totalEmails || 0, color: "text-blue-600" },
            { label: "Unread", value: emailStats?.unreadEmails || 0, color: "text-orange-600" },
            { label: "Categorized", value: emailStats?.categorizedEmails || 0, color: "text-green-600" },
            { label: "Actions", value: emailStats?.pendingActions || 0, color: "text-purple-600" }
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
              <div className={`text-lg font-bold ${stat.color}`}>
                {statsLoading ? "..." : stat.value.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Sync Button */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onManualRefresh}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
          <EmailSyncButton onSyncComplete={onSyncComplete} />
        </div>
      </div>
      
      {/* Categories Section */}
      <div className="flex-1 overflow-y-auto">
        <CategoryFilter 
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
};

export default NavigationColumn; 