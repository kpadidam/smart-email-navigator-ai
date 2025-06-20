import SearchBar from "./SearchBar";
import EmailList from "./EmailList";

interface TriageListColumnProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  refreshTrigger: number;
  selectedEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
}

const TriageListColumn = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  refreshTrigger,
  selectedEmailId,
  onSelectEmail
}: TriageListColumnProps) => {
  return (
    <div className="column-list flex-1 min-w-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Header with Search */}
      <div className="p-4 border-b border-gray-100">
        <SearchBar 
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
        />
      </div>
      
      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        <EmailList 
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          refreshTrigger={refreshTrigger}
          selectedEmailId={selectedEmailId}
          onSelectEmail={onSelectEmail}
        />
      </div>
    </div>
  );
};

export default TriageListColumn; 