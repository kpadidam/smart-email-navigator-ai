import { useEffect, useState } from "react";
import { emailService, Email } from "@/services/emailService";
import { Loader2, Reply, Archive, Trash2, X } from "lucide-react";

interface MobileEmailDetailProps {
  selectedEmailId: string | null;
  onClose: () => void;
}

const MobileEmailDetail = ({ selectedEmailId, onClose }: MobileEmailDetailProps) => {
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmail = async () => {
      if (!selectedEmailId) {
        setEmail(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const emailData = await emailService.fetchEmailById(selectedEmailId);
        setEmail(emailData);
      } catch (err) {
        console.error('Error fetching email:', err);
        setError('Failed to load email details');
      } finally {
        setLoading(false);
      }
    };

    fetchEmail();
  }, [selectedEmailId]);

  if (!selectedEmailId) return null;

  if (loading) {
    return (
      <div className="lg:hidden fixed inset-0 z-50 bg-white">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Email Details</h2>
            <button 
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading email details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="lg:hidden fixed inset-0 z-50 bg-white">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Email Details</h2>
            <button 
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-red-500">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium mb-2">Error loading email</h3>
              <p className="text-sm">{error || 'Email not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-white">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Email Details</h2>
            <button 
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Action buttons for mobile */}
          <div className="flex gap-2 mb-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg">
              <Reply className="h-4 w-4" />
              Reply
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg">
              <Archive className="h-4 w-4" />
              Archive
            </button>
            <button className="px-3 py-2 bg-red-600 text-white rounded-lg">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          
          {/* Email Subject */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{email.subject}</h3>
          
          {/* Sender Info */}
          <div className="text-sm text-gray-600 space-y-1">
            <div><span className="font-medium">From:</span> {email.sender}</div>
            <div><span className="font-medium">Date:</span> {email.timestamp}</div>
            {email.category && (
              <div><span className="font-medium">Category:</span> 
                <span className="ml-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {email.category}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* AI Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <span className="mr-2">🤖</span>
                AI Summary
              </h4>
              <p className="text-sm text-blue-700">
                {email.summary || '[AI Summary will appear here]'}
              </p>
            </div>
            
            {/* Priority */}
            {email.priority && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Priority:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  email.priority === 'high' ? 'bg-red-100 text-red-800' :
                  email.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {email.priority}
                </span>
              </div>
            )}
            
            {/* Email Content */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Email Content</h4>
              <div className="prose prose-sm max-w-none text-gray-700">
                {email.fullContent ? (
                  <div dangerouslySetInnerHTML={{ __html: email.fullContent }} />
                ) : (
                  <p className="text-gray-500 italic">Email content not available</p>
                )}
              </div>
            </div>
            
            {/* Attachments */}
            {email.attachments && email.attachments.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Attachments ({email.attachments.length})</h4>
                <div className="space-y-2">
                  {email.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{attachment.name}</span>
                        <span className="text-xs text-gray-500">({attachment.size})</span>
                      </div>
                      <button className="text-xs text-blue-600 hover:text-blue-800">Download</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileEmailDetail; 