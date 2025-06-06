
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MailOpen, Tag, Clock, Loader2 } from "lucide-react";
import { EmailStats } from "@/services/emailService";

interface StatsCardsProps {
  stats?: EmailStats;
  isLoading?: boolean;
}

const StatsCards = ({ stats, isLoading }: StatsCardsProps) => {
  const statsData = [
    {
      title: "Total Emails",
      value: stats?.totalEmails || 0,
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Unread Emails",
      value: stats?.unreadEmails || 0,
      icon: MailOpen,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Categorized",
      value: stats?.categorizedEmails || 0,
      icon: Tag,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Pending Actions",
      value: stats?.pendingActions || 0,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  stat.value.toLocaleString()
                )}
              </div>
              {!isLoading && (
                <p className="text-xs text-gray-500 mt-1">
                  {stat.title === "Unread Emails" && stats?.totalEmails 
                    ? `${Math.round((stat.value / stats.totalEmails) * 100)}% of total`
                    : stat.title === "Categorized" && stats?.totalEmails
                    ? `${Math.round((stat.value / stats.totalEmails) * 100)}% processed`
                    : "Updated in real-time"
                  }
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsCards;
