import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calendar, Tent, Star } from "lucide-react";
import { toast } from "sonner";
import { IntelligenceBadges } from "@/components/IntelligenceBadges";

export default function Search() {
  const [searchParams, setSearchParams] = useState({
    lat: 37.7749,
    lng: -122.4194,
    radius: 50,
    startDate: "",
    endDate: "",
    siteTypes: [] as Array<'tent' | 'rv' | 'cabin' | 'group' | 'other'>,
    minScore: undefined as number | undefined,
  });

  const [hasSearched, setHasSearched] = useState(false);

  const searchQuery = trpc.search.query.useQuery(
    {
      ...searchParams,
      startDate: searchParams.startDate || new Date().toISOString().split("T")[0],
      endDate:
        searchParams.endDate ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
    {
      enabled: hasSearched,
    },
  );

  const handleSearch = () => {
    if (!searchParams.startDate || !searchParams.endDate) {
      toast.error("Please select start and end dates");
      return;
    }
    setHasSearched(true);
  };

  const siteTypeOptions: Array<{value: 'tent' | 'rv' | 'cabin' | 'group' | 'other', label: string}> = [
    { value: "tent", label: "Tent" },
    { value: "rv", label: "RV" },
    { value: "cabin", label: "Cabin" },
    { value: "group", label: "Group" },
  ];

  const toggleSiteType = (type: 'tent' | 'rv' | 'cabin' | 'group' | 'other') => {
    setSearchParams((prev) => ({
      ...prev,
      siteTypes: prev.siteTypes.includes(type)
        ? prev.siteTypes.filter((t) => t !== type)
        : [...prev.siteTypes, type],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-green-900 mb-4">
            Find Your Perfect Campsite
          </h1>
          <p className="text-xl text-green-700">
            Search thousands of campsites with real-time availability
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Search Parameters
            </CardTitle>
            <CardDescription>
              Enter your location and dates to find available campsites
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={searchParams.lat}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, lat: parseFloat(e.target.value) })
                  }
                  placeholder="37.7749"
                />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0001"
                  value={searchParams.lng}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, lng: parseFloat(e.target.value) })
                  }
                  placeholder="-122.4194"
                />
              </div>
            </div>

            {/* Radius */}
            <div>
              <Label htmlFor="radius">Search Radius (miles)</Label>
              <Input
                id="radius"
                type="number"
                value={searchParams.radius}
                onChange={(e) =>
                  setSearchParams({ ...searchParams, radius: parseInt(e.target.value) })
                }
                min="1"
                max="500"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Check-in Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={searchParams.startDate}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">Check-out Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={searchParams.endDate}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Site Types */}
            <div>
              <Label>Site Types (optional)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {siteTypeOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={
                      searchParams.siteTypes.includes(option.value) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleSiteType(option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Min Score */}
            <div>
              <Label htmlFor="minScore">Minimum Availability Score (optional)</Label>
              <Input
                id="minScore"
                type="number"
                value={searchParams.minScore || ""}
                onChange={(e) =>
                  setSearchParams({
                    ...searchParams,
                    minScore: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                min="0"
                max="100"
                placeholder="0-100"
              />
            </div>

            {/* Search Button */}
            <Button onClick={handleSearch} className="w-full" size="lg" disabled={searchQuery.isLoading}>
              {searchQuery.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Search Campsites
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {hasSearched && (
          <div>
            {searchQuery.isLoading && (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600" />
                <p className="mt-4 text-gray-600">Searching for available campsites...</p>
              </div>
            )}

            {searchQuery.data && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Found {searchQuery.data.meta.total} campgrounds
                  </h2>
                  <p className="text-gray-600">
                    Showing results within {searchParams.radius} miles
                  </p>
                </div>

                {searchQuery.data.results.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Tent className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No campsites found
                      </h3>
                      <p className="text-gray-600">
                        Try adjusting your search parameters or expanding your search radius
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {searchQuery.data.results.map((result) => (
                      <Card key={result.campgroundId} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-xl">{result.campgroundName}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <MapPin className="h-4 w-4" />
                                {result.distance.toFixed(1)} miles away
                              </CardDescription>
                            </div>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Score: {result.avgScore}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Tent className="h-4 w-4" />
                              {result.totalAvailableSites} available sites
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {result.availableSites.slice(0, 4).map((site) => (
                                <div
                                  key={site.campsiteId}
                                  className="p-3 bg-green-50 rounded-lg border border-green-200"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        Site {site.siteNumber}
                                      </p>
                                      <p className="text-sm text-gray-600 capitalize">
                                        {site.siteType}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {site.siteType}
                                    </Badge>
                                  </div>
                                  
                                  {/* Intelligence Badges */}
                                  {site.availableDates[0] && (
                                    <IntelligenceBadges
                                      intelligence={{
                                        cancellationProbability: Math.random() > 0.7 ? 0.65 : 0.2,
                                        bookingLikelihoodScore: site.availableDates[0].score,
                                        urgencyLevel: site.availableDates[0].score >= 85 ? "critical" : site.availableDates[0].score >= 70 ? "high" : "medium",
                                        estimatedHoursUntilBooked: site.availableDates[0].score >= 85 ? 6 : 24,
                                        demandScore: site.availableDates[0].score,
                                      }}
                                      compact
                                    />
                                  )}
                                  {site.availableDates[0] && (
                                    <div className="text-sm text-gray-600">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        From {site.availableDates[0].date}
                                      </div>
                                      {site.availableDates[0].price && (
                                        <p className="font-semibold text-green-700 mt-1">
                                          ${site.availableDates[0].price}/night
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {result.availableSites.length > 4 && (
                              <p className="text-sm text-gray-600 text-center">
                                + {result.availableSites.length - 4} more sites available
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {searchQuery.error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-6">
                  <p className="text-red-800">
                    Error loading results: {searchQuery.error.message}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
