import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Package, Briefcase, Mail, AlertCircle, Loader2, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { emailService, Email } from "@/services/emailService";
import { authService } from "@/services/authService";
import { logger } from "@/utils/logger";

interface EmailListProps {
  selectedCategory: string;
  searchTerm: string;
  refreshTrigger?: number;
  selectedEmailId?: string | null;
  onSelectEmail?: (emailId: string) => void;
}

const EmailList = ({ selectedCategory, searchTerm, refreshTrigger, selectedEmailId, onSelectEmail }: EmailListProps) => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmails = async () => {
      logger.email('Loading emails', { 
        isAuthenticated: authService.isAuthenticated(),
        hasToken: !!authService.getToken()
      });
      
      setLoading(true);
      setError(null);
      
      try {
        if (!authService.isAuthenticated()) {
          logger.error('Email fetch failed: Not authenticated');
          throw new Error('Not authenticated');
        }

        const data = await emailService.fetchEmails();
        logger.email('Emails loaded successfully', { emailCount: data.length });
        setEmails(Array.isArray(data) ? data : []);
      } catch (err) {
        logger.error('Error loading emails', { error: err });
        
        if (err instanceof Error && err.message.includes('Failed to fetch')) {
          setError('Cannot connect to server. Please ensure the backend is running on port 5001.');
        } else if (err instanceof Error && err.message.includes('Not authenticated')) {
          setError('Authentication required. Please log in again.');
          // Redirect to login after a short delay
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load emails');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadEmails();
  }, [navigate, refreshTrigger]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "meetings": return Calendar;
      case "delivery": return Package;
      case "interviews": return Briefcase;
      default: return Mail;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "meetings": return "text-green-600";
      case "delivery": return "text-orange-600";
      case "interviews": return "text-purple-600";
      default: return "text-blue-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Filter emails based on category and search term
  const filteredEmails = emails.filter(email => {
    const matchesCategory = selectedCategory === "all" || email.category === selectedCategory;
    const matchesSearch = searchTerm === "" || 
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.summary.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading emails...</h3>
          <p className="text-gray-600">Please wait while we fetch your emails</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Failed to load emails
            </AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Emails</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredEmails.map((email) => {
        const Icon = getCategoryIcon(email.category);
        const iconColor = getCategoryColor(email.category);
        
        return (
          <Card 
            key={email.id} 
            className={`hover:shadow-md transition-shadow cursor-pointer ${
              selectedEmailId === email.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onSelectEmail ? onSelectEmail(email.id) : navigate(`/email/${email.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {email.sender}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {email.senderEmail}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(email.priority)}>
                          {email.priority}
                        </Badge>
                        <span className="text-sm text-gray-500">{email.timestamp}</span>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 mb-2">
                      {email.subject}
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {email.summary}
                    </p>
                    
                    {email.datetime && (
                      <div className="text-sm text-gray-500 mb-3">
                        📅 {new Date(email.datetime).toLocaleDateString()} at{' '}
                        {new Date(email.datetime).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                    
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline">
                        Archive
                      </Button>
                      <Button size="sm" variant="outline">
                        Mark Done
                      </Button>
                      {email.category === "meetings" || email.category === "interviews" ? (
                        <Button size="sm">
                          Add to Calendar
                        </Button>
                      ) : (
                        <Button size="sm">
                          Follow Up
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      
      {filteredEmails.length === 0 && !loading && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto">
              {emails.length === 0 ? (
                <>
                  <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">No emails yet</h3>
                  <p className="text-gray-500 mb-6">
                    Your inbox is empty. Try syncing your Gmail account to import your emails, 
                    or check back later for new messages.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 Tip: Click the "Refresh Emails" button above to sync your latest emails from Gmail.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matching emails</h3>
                  <p className="text-gray-500 mb-4">
                    No emails match your current search or category filter. 
                    Try adjusting your search terms or selecting a different category.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Reset filters - this would need to be passed as props
                      window.location.reload();
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailList;
