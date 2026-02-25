import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function SavedSearches() {
  const { user, isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    locationLat: 37.7749,
    locationLng: -122.4194,
    radiusMiles: 50,
    startDate: "",
    endDate: "",
    siteTypes: [] as string[],
    minScore: undefined as number | undefined,
  });

  const utils = trpc.useUtils();
  const savedSearchesQuery = trpc.savedSearches.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.savedSearches.create.useMutation({
    onSuccess: () => {
      toast.success("Saved search created!");
      setIsDialogOpen(false);
      utils.savedSearches.list.invalidate();
      setFormData({
        name: "",
        locationLat: 37.7749,
        locationLng: -122.4194,
        radiusMiles: 50,
        startDate: "",
        endDate: "",
        siteTypes: [],
        minScore: undefined,
      });
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  const deleteMutation = trpc.savedSearches.delete.useMutation({
    onSuccess: () => {
      toast.success("Saved search deleted");
      utils.savedSearches.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Please enter a name");
      return;
    }
    createMutation.mutate(formData);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Sign in to save searches
              </h2>
              <p className="text-gray-600 mb-6">
                Create an account to save your favorite searches and set up alerts
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
            <h1 className="text-4xl font-bold text-green-900 mb-2">Saved Searches</h1>
            <p className="text-gray-600">Manage your saved campsite searches</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
            <Link href="/search">
              <Button variant="outline">Search</Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Search
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Saved Search</DialogTitle>
                  <DialogDescription>
                    Save your search parameters for quick access and alerts
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Search Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Yosemite Summer Trip"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lat">Latitude</Label>
                      <Input
                        id="lat"
                        type="number"
                        step="0.0001"
                        value={formData.locationLat}
                        onChange={(e) =>
                          setFormData({ ...formData, locationLat: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="lng">Longitude</Label>
                      <Input
                        id="lng"
                        type="number"
                        step="0.0001"
                        value={formData.locationLng}
                        onChange={(e) =>
                          setFormData({ ...formData, locationLng: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="radius">Search Radius (miles)</Label>
                    <Input
                      id="radius"
                      type="number"
                      value={formData.radiusMiles}
                      onChange={(e) =>
                        setFormData({ ...formData, radiusMiles: parseInt(e.target.value) })
                      }
                      min="1"
                      max="500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date (optional)</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date (optional)</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="minScore">Minimum Score (optional)</Label>
                    <Input
                      id="minScore"
                      type="number"
                      value={formData.minScore || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minScore: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      min="0"
                      max="100"
                      placeholder="0-100"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Saved Search"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Saved Searches List */}
        {savedSearchesQuery.isLoading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
          </div>
        )}

        {savedSearchesQuery.data && savedSearchesQuery.data.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No saved searches yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first saved search to quickly access your favorite campsite queries
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Saved Search
              </Button>
            </CardContent>
          </Card>
        )}

        {savedSearchesQuery.data && savedSearchesQuery.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSearchesQuery.data.map((search) => (
              <Card key={search.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{search.name}</CardTitle>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {search.locationLat.toFixed(4)}, {search.locationLng.toFixed(4)}
                    </div>
                    <div>Radius: {search.radiusMiles} miles</div>
                    {search.startDate && search.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(search.startDate).toLocaleDateString()} -{" "}
                        {new Date(search.endDate).toLocaleDateString()}
                      </div>
                    )}
                    {search.minScore && (
                      <div>Min Score: {search.minScore}</div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: search.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
