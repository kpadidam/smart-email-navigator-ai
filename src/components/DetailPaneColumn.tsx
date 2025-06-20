import { useEffect, useState } from "react";
import { emailService, Email } from "@/services/emailService";
import { Loader2, Reply, Archive, Trash2, MoreHorizontal } from "lucide-react";

interface DetailPaneColumnProps {
  selectedEmailId: string | null;
}

const DetailPaneColumn = ({ selectedEmailId }: DetailPaneColumnProps) => {
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

  if (!selectedEmailId) {
    return (
      <div className="column-detail flex-shrink-0 w-[600px] bg-white flex flex-col overflow-hidden lg:flex hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-lg font-medium mb-2">Select an email to view details</h3>
            <p className="text-sm">Choose an email from the list to see its content and AI analysis</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="column-detail flex-shrink-0 w-[600px] bg-white flex flex-col overflow-hidden lg:flex hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading email details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="column-detail flex-shrink-0 w-[600px] bg-white flex flex-col overflow-hidden lg:flex hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error loading email</h3>
            <p className="text-sm">{error || 'Email not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="column-detail flex-shrink-0 w-[600px] bg-white flex flex-col overflow-hidden lg:flex hidden">
      {/* Email Detail Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Email Details</h2>
          <div className="flex gap-2">
            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Reply className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
              <Archive className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Email Subject */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{email.subject}</h3>
        
        {/* Sender/Recipient Info */}
        <div className="text-sm text-gray-600 space-y-1">
          <div><span className="font-medium">From:</span> {email.sender} &lt;{email.senderEmail}&gt;</div>
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
      
      {/* Email Content */}
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
          
          {/* Priority Badge */}
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
          
          {/* Email Body */}
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
  );
};

export default DetailPaneColumn; 