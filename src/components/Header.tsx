import { Button } from "@/components/ui/button";
import { Settings, Bell, Plus, Check, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { emailService, type EmailAccount } from "@/services/emailService";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const navigate = useNavigate();
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<EmailAccount | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const { toast } = useToast();
  
  // Get authenticated user data
  const user = authService.getUser();

  // Load email accounts on component mount
  useEffect(() => {
    loadEmailAccounts();
    
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const accountAdded = urlParams.get('account_added');
    const email = urlParams.get('email');
    const error = urlParams.get('error');

    if (accountAdded === 'success' && email) {
      toast({
        title: "Account Added Successfully",
        description: `${email} has been connected to your account.`,
      });
      // Reload accounts to show the new one
      loadEmailAccounts();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      const errorMessages: { [key: string]: string } = {
        'account_already_exists': 'This email account is already connected.',
        'add_account_failed': 'Failed to add email account. Please try again.',
        'missing_params': 'Invalid authentication response.',
        'user_not_found': 'User session invalid. Please log in again.'
      };
      
      toast({
        variant: "destructive",
        title: "Error Adding Account",
        description: errorMessages[error] || 'An unknown error occurred.',
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  const loadEmailAccounts = async () => {
    try {
      setIsLoadingAccounts(true);
      const response = await emailService.getEmailAccounts();
      setEmailAccounts(response.accounts);
      
      // Set the primary account as default active account
      const primaryAccount = response.accounts.find(acc => acc.isPrimary);
      if (primaryAccount && !activeAccount) {
        setActiveAccount(primaryAccount);
      }
    } catch (error) {
      console.error('Error loading email accounts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load email accounts.",
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleAccountSwitch = async (account: EmailAccount) => {
    try {
      toast({
        title: "Switching Account",
        description: `Switching to ${account.email}...`,
      });
      
      await emailService.switchAccount(account.id);
      setActiveAccount(account);
      
      toast({
        title: "Account Switched",
        description: `Now viewing emails for ${account.email}`,
      });
      
      // Refresh the page to load emails for the new account
      window.location.reload();
    } catch (error) {
      console.error('Error switching account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to switch account. Please try again.",
      });
    }
  };

  const defaultAccount = activeAccount || emailAccounts[0] || {
    id: 'default',
    email: user?.email || 'user@example.com',
    provider: 'gmail',
    isPrimary: true
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleAddEmailAccount = async () => {
    try {
      setIsAddingAccount(true);
      setShowAddAccountDialog(false);
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      toast({
        title: "Adding Email Account",
        description: "Redirecting to Google for authentication...",
      });
      
      // Get OAuth URL for adding account
      const response = await emailService.addEmailAccount(user.id);
      
      // Redirect to Google OAuth
      window.location.href = response.authUrl;
    } catch (error) {
      console.error('Error adding email account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add email account. Please try again.",
      });
    } finally {
      setIsAddingAccount(false);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8  rounded-lg flex items-center justify-center">
              <img 
                       src="https://www.fullthrottle.ai/wp-content/uploads/2023/11/Smart-Mail-Icon-768x768.png" 
                alt="Logo" 
                className="w-6 h-6 text-white"
              />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Eagle AI</h1>
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
                    <AvatarImage src={user?.picture} alt={defaultAccount.email} />
                    <AvatarFallback>{defaultAccount.email.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Email Accounts</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isLoadingAccounts ? 'Loading accounts...' : `${emailAccounts.length} account${emailAccounts.length !== 1 ? 's' : ''} connected`}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {isLoadingAccounts ? (
                    <DropdownMenuItem className="text-muted-foreground">
                      Loading accounts...
                    </DropdownMenuItem>
                  ) : emailAccounts.length > 0 ? (
                    emailAccounts.map((account) => (
                      <DropdownMenuItem 
                        key={account.id} 
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleAccountSwitch(account)}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user?.picture} alt={account.email} />
                          <AvatarFallback className="text-xs">{account.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{account.email}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {account.isPrimary ? 'Primary Account' : 'Additional Account'}
                          </p>
                        </div>
                        {activeAccount?.id === account.id && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem className="text-muted-foreground">
                      No email accounts found
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer" 
                  onClick={() => setShowAddAccountDialog(true)}
                  disabled={isAddingAccount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>{isAddingAccount ? 'Adding Account...' : 'Add Email Account'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <AlertDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Another Email Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will add another Gmail account to your current session. You'll be able to switch between accounts using this dropdown menu.
              <br /><br />
              The new account will be added to your current user profile, and you can view emails from both accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddEmailAccount} disabled={isAddingAccount}>
              {isAddingAccount ? 'Connecting...' : 'Continue with Google'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};

export default Header;
