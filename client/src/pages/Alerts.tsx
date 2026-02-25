import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Bell, Mail } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Alerts() {
  const { isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    alertType: "availability_opened" as "availability_opened" | "score_improved" | "cancellation_detected" | "price_dropped",
    channel: "email" as "email" | "push" | "sms",
    minScoreThreshold: undefined as number | undefined,
  });

  const utils = trpc.useUtils();
  const alertsQuery = trpc.alerts.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.alerts.create.useMutation({
    onSuccess: () => {
      toast.success("Alert created!");
      setIsDialogOpen(false);
      utils.alerts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const updateMutation = trpc.alerts.update.useMutation({
    onSuccess: () => {
      toast.success("Alert updated");
      utils.alerts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const deleteMutation = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      toast.success("Alert deleted");
      utils.alerts.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      availability_opened: "Availability Opened",
      score_improved: "Score Improved",
      cancellation_detected: "Cancellation Detected",
      price_dropped: "Price Dropped",
    };
    return labels[type] || type;
  };

  const getChannelIcon = (channel: string) => {
    if (channel === "email") return <Mail className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Sign in to manage alerts
              </h2>
              <p className="text-gray-600 mb-6">
                Create an account to set up availability alerts
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
            <h1 className="text-4xl font-bold text-green-900 mb-2">Alert Subscriptions</h1>
            <p className="text-gray-600">Manage your campsite availability alerts</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
            <Link href="/saved-searches">
              <Button variant="outline">Saved Searches</Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Alert
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Alert Subscription</DialogTitle>
                  <DialogDescription>
                    Set up a new alert for campsite availability changes
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="alertType">Alert Type</Label>
                    <Select
                      value={formData.alertType}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, alertType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="availability_opened">Availability Opened</SelectItem>
                        <SelectItem value="score_improved">Score Improved</SelectItem>
                        <SelectItem value="cancellation_detected">
                          Cancellation Detected
                        </SelectItem>
                        <SelectItem value="price_dropped">Price Dropped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="channel">Notification Channel</Label>
                    <Select
                      value={formData.channel}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, channel: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="push">Push Notification</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.alertType === "score_improved" && (
                    <div>
                      <Label htmlFor="minScoreThreshold">Minimum Score Threshold</Label>
                      <Input
                        id="minScoreThreshold"
                        type="number"
                        value={formData.minScoreThreshold || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minScoreThreshold: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        min="0"
                        max="100"
                        placeholder="0-100"
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Alert"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Alerts List */}
        {alertsQuery.isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
          </div>
        )}

        {alertsQuery.data && alertsQuery.data.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No alerts yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first alert to get notified about campsite availability
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Alert
              </Button>
            </CardContent>
          </Card>
        )}

        {alertsQuery.data && alertsQuery.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alertsQuery.data.map((alert) => (
              <Card key={alert.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {getAlertTypeLabel(alert.alertType)}
                    </CardTitle>
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={(enabled) =>
                        updateMutation.mutate({ id: alert.id, enabled })
                      }
                    />
                  </div>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(alert.channel)}
                      <span className="capitalize">{alert.channel}</span>
                    </div>
                    {alert.minScoreThreshold && (
                      <div>Min Score: {alert.minScoreThreshold}</div>
                    )}
                    <Badge variant={alert.enabled ? "default" : "secondary"}>
                      {alert.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ id: alert.id })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
