import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Package, 
  Briefcase, 
  Mail, 
  AlertCircle, 
  Loader2, 
  Inbox, 
  Star, 
  Paperclip, 
  MoreVertical, 
  Archive, 
  Trash2, 
  Reply, 
  ReplyAll, 
  Forward, 
  User, 
  Clock,
  CheckCircle2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { emailService, Email } from "@/services/emailService";
import { authService } from "@/services/authService";
import { logger } from "@/utils/logger";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailListProps {
  selectedCategory: string;
  searchTerm: string;
  refreshTrigger?: number;
  selectedEmailId?: string | null;
  onSelectEmail?: (emailId: string) => void;
}

const EmailList = ({ 
  selectedCategory, 
  searchTerm, 
  refreshTrigger, 
  selectedEmailId, 
  onSelectEmail 
}: EmailListProps) => {
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

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      "from-blue-500 to-purple-500",
      "from-green-500 to-teal-500",
      "from-orange-500 to-red-500",
      "from-pink-500 to-rose-500",
      "from-indigo-500 to-blue-500",
      "from-yellow-500 to-orange-500",
    ];
    
    const index = email.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "meetings": return Calendar;
      case "delivery": return Package;
      case "interviews": return Briefcase;
      case "work": return Briefcase;
      default: return Mail;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "meetings": return "text-green-600 bg-green-50";
      case "delivery": return "text-orange-600 bg-orange-50";
      case "interviews": return "text-purple-600 bg-purple-50";
      case "work": return "text-blue-600 bg-blue-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { color: "destructive", label: "High" },
      medium: { color: "warning", label: "Medium" },
      low: { color: "secondary", label: "Low" }
    };
    
    const variant = variants[priority as keyof typeof variants] || variants.low;
    
    return (
      <Badge variant={variant.color as any} className="text-xs">
        {variant.label}
      </Badge>
    );
  };

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else if (isThisWeek(date)) {
      return format(date, "EEEE");
    } else {
      return format(date, "MMM d");
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

  // Loading state with skeletons
  if (loading) {
    return (
      <div className="divide-y divide-gray-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex space-x-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 text-center">
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
    );
  }

  // Empty state
  if (filteredEmails.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto">
          {emails.length === 0 ? (
            <>
              <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No emails yet</h3>
              <p className="text-gray-500 mb-6">
                Your inbox is empty. Try syncing your Gmail account to import your emails.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Tip: Click the "Sync Emails" button to fetch your latest emails from Gmail.
                </p>
              </div>
            </>
          ) : (
            <>
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No matching emails</h3>
              <p className="text-gray-500 mb-4">
                No emails match your current search or category filter.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {filteredEmails.map((email) => {
        const Icon = getCategoryIcon(email.category);
        const isSelected = selectedEmailId === email.id;
        const isRead = email.isRead || false;
        const isStarred = email.isStarred || false;
        
        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail ? onSelectEmail(email.id) : navigate(`/email/${email.id}`)}
            className={cn(
              "group relative px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 cursor-pointer transition-all duration-200",
              !isRead && "bg-blue-50/30 hover:bg-blue-50/50",
              isSelected && "bg-blue-50 border-l-2 border-l-blue-500"
            )}
          >
            <div className="flex items-start space-x-2 sm:space-x-3">
              {/* Avatar */}
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                <AvatarFallback className={cn(
                  "text-white text-xs sm:text-sm font-medium bg-gradient-to-br",
                  getAvatarColor(email.senderEmail)
                )}>
                  {getInitials(email.sender)}
                </AvatarFallback>
              </Avatar>

              {/* Email Content */}
              <div className="flex-1 min-w-0">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className={cn(
                      "text-sm truncate",
                      !isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                    )}>
                      {email.sender}
                    </span>
                    
                    {/* Priority Badge */}
                    {getPriorityBadge(email.priority)}
                    
                    {/* Attachments Icon */}
                    {email.attachments && email.attachments.length > 0 && (
                      <Paperclip className="h-3 w-3 text-gray-400" />
                    )}
                  </div>

                  {/* Time and Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">
                      {formatEmailDate(email.timestamp)}
                    </span>
                    
                    {/* Star Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle star toggle
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star className={cn(
                        "h-4 w-4 transition-colors",
                        isStarred 
                          ? "fill-amber-400 text-amber-400" 
                          : "text-gray-400 hover:text-amber-400"
                      )} />
                    </button>

                    {/* More Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem>
                          <Reply className="mr-2 h-4 w-4" />
                          Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ReplyAll className="mr-2 h-4 w-4" />
                          Reply All
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Forward className="mr-2 h-4 w-4" />
                          Forward
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark as Read
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Subject */}
                <h3 className={cn(
                  "text-sm mb-1 line-clamp-1",
                  !isRead ? "font-semibold text-gray-900" : "text-gray-800"
                )}>
                  {email.subject || "(No subject)"}
                </h3>

                {/* Preview/Summary */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {email.summary || "No preview available"}
                </p>

                {/* Footer with Category and Date */}
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs",
                    getCategoryColor(email.category)
                  )}>
                    <Icon className="h-3 w-3" />
                    <span className="capitalize">
                      {email.category}
                    </span>
                  </div>
                  
                  {email.datetime && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(email.datetime), "MMM d 'at' h:mm a")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EmailList;