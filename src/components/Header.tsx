
import { Button } from "@/components/ui/button";
import { Settings, Bell, Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const navigate = useNavigate();

  // Mock email accounts
  const emailAccounts = [
    {
      id: 1,
      email: "john.doe@example.com",
      name: "John Doe",
      isDefault: true,
      avatar: "/placeholder.svg"
    },
    {
      id: 2,
      email: "work@company.com",
      name: "Work Account",
      isDefault: false,
      avatar: "/placeholder.svg"
    }
  ];

  const defaultAccount = emailAccounts.find(account => account.isDefault) || emailAccounts[0];

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <img 
                src="/placeholder.svg" 
                alt="Logo" 
                className="w-6 h-6 text-white"
              />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Smart Email Tracker</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/settings")}
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={defaultAccount.avatar} alt={defaultAccount.name} />
                    <AvatarFallback>{defaultAccount.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Email Accounts</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Manage your connected accounts
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {emailAccounts.map((account) => (
                    <DropdownMenuItem key={account.id} className="flex items-center space-x-2 cursor-pointer">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={account.avatar} alt={account.name} />
                        <AvatarFallback className="text-xs">{account.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{account.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                      </div>
                      {account.isDefault && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Add Email Account</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
