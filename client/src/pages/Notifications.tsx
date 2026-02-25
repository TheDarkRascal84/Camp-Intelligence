import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Notifications() {
  const { isAuthenticated } = useAuth();

  const notificationsQuery = trpc.notifications.list.useQuery(
    { limit: 50 },
    {
      enabled: isAuthenticated,
    },
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      sent: "default",
      failed: "destructive",
      pending: "secondary",
      bounced: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Sign in to view notifications
              </h2>
              <p className="text-gray-600 mb-6">
                Create an account to see your notification history
              </p>
              <a href={getLoginUrl()}>
                <Button size="lg">Sign In</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-green-900 mb-2">Notification History</h1>
            <p className="text-gray-600">View all your campsite availability notifications</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
            <Link href="/alerts">
              <Button variant="outline">Manage Alerts</Button>
            </Link>
          </div>
        </div>

        {/* Notifications List */}
        {notificationsQuery.isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
          </div>
        )}

        {notificationsQuery.data && notificationsQuery.data.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600 mb-6">
                You'll see your notification history here once alerts are triggered
              </p>
              <Link href="/alerts">
                <Button>Set Up Alerts</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {notificationsQuery.data && notificationsQuery.data.length > 0 && (
          <div className="space-y-4">
            {notificationsQuery.data.map((notification) => (
              <Card key={notification.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(notification.status)}
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {notification.subject || "Campsite Alert"}
                        </CardTitle>
                        <CardDescription className="whitespace-pre-wrap">
                          {notification.body}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(notification.status)}
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {notification.channel === "email" ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                        <span className="capitalize">{notification.channel}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <div>
                      {notification.sentAt
                        ? `Sent: ${new Date(notification.sentAt).toLocaleString()}`
                        : notification.failedAt
                          ? `Failed: ${new Date(notification.failedAt).toLocaleString()}`
                          : `Created: ${new Date(notification.createdAt).toLocaleString()}`}
                    </div>
                    {notification.errorMessage && (
                      <div className="text-red-600 text-xs">
                        Error: {notification.errorMessage}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {notificationsQuery.error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6">
              <p className="text-red-800">
                Error loading notifications: {notificationsQuery.error.message}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
