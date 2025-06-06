
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Calendar, Package, Briefcase, Mail, ArrowLeft, Archive, Trash2, Clock } from "lucide-react";
import Header from "../components/Header";

const EmailDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock email data - in real app, this would be fetched based on the ID
  const email = {
    id: 1,
    sender: "Sarah Johnson",
    senderEmail: "sarah@techcorp.com",
    subject: "Weekly Team Meeting - Tomorrow 2PM",
    summary: "Team meeting scheduled for tomorrow at 2PM in Conference Room B to discuss project milestones.",
    fullContent: `Hi Team,

I hope this email finds you well. I wanted to schedule our weekly team meeting for tomorrow (Wednesday) at 2:00 PM in Conference Room B.

Agenda items:
• Review of last week's deliverables
• Q3 project milestone discussion
• Budget allocation for upcoming sprint
• Client feedback review
• Planning for next week's objectives

Please come prepared with your individual progress reports and any blockers you're currently facing. If you have any additional items you'd like to discuss, please let me know by end of day today.

Looking forward to seeing everyone there!

Best regards,
Sarah Johnson
Project Manager
TechCorp Solutions
sarah@techcorp.com
(555) 123-4567`,
    category: "meetings",
    datetime: "2025-06-06T14:00:00",
    timestamp: "2 hours ago",
    priority: "high",
    attachments: [
      { name: "meeting-agenda.pdf", size: "245 KB" },
      { name: "project-timeline.xlsx", size: "87 KB" }
    ],
    tags: ["meeting", "urgent", "team", "q3"],
    status: "unread"
  };

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
      case "meetings": return "text-green-600 bg-green-50";
      case "delivery": return "text-orange-600 bg-orange-50";
      case "interviews": return "text-purple-600 bg-purple-50";
      default: return "text-blue-600 bg-blue-50";
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

  const Icon = getCategoryIcon(email.category);
  const categoryColorClass = getCategoryColor(email.category);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${categoryColorClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{email.subject}</h1>
                <p className="text-gray-600">{email.category} • {email.timestamp}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(email.priority)}>
                {email.priority}
              </Badge>
              <Badge variant="outline">
                {email.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{email.sender}</CardTitle>
                    <p className="text-sm text-gray-500">{email.senderEmail}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{new Date(email.datetime).toLocaleDateString()}</p>
                    <p>{new Date(email.datetime).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-sm font-medium text-blue-800">AI Summary</p>
                  <p className="text-sm text-blue-700 mt-1">{email.summary}</p>
                </div>
                
                <Separator className="my-4" />
                
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                    {email.fullContent}
                  </pre>
                </div>

                {email.attachments && email.attachments.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Attachments ({email.attachments.length})</h4>
                      <div className="space-y-2">
                        {email.attachments.map((attachment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{attachment.name}</span>
                            <span className="text-xs text-gray-500">{attachment.size}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Reply</Button>
                  <Button variant="outline">Reply All</Button>
                  <Button variant="outline">Forward</Button>
                  <Button variant="outline">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                  <Button variant="outline">Mark as Done</Button>
                  <Button variant="outline" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {email.category === "meetings" && (
                  <Button className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>
                )}
                <Button variant="outline" className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Snooze
                </Button>
                <Button variant="outline" className="w-full">
                  Create Task
                </Button>
                <Button variant="outline" className="w-full">
                  Set Reminder
                </Button>
              </CardContent>
            </Card>

            {/* Email Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</Label>
                  <p className="mt-1 capitalize">{email.category}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</Label>
                  <p className="mt-1 capitalize">{email.priority}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</Label>
                  <p className="mt-1 capitalize">{email.status}</p>
                </div>
                {email.datetime && (
                  <div>
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled Time</Label>
                    <p className="mt-1">{new Date(email.datetime).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {email.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailDetails;
