
import { Button } from "@/components/ui/button";
import { Bell, Settings, Mail } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Mail className="h-8 w-8 text-blue-600 mr-3" />
            <span className="text-xl font-semibold text-gray-900">EmailTracker AI</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">AK</span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">Abbott Keitch</p>
                <p className="text-xs text-gray-500">abbott@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
