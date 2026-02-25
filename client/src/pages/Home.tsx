import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Bell, Star, TrendingUp, Tent } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-6xl font-bold text-green-900 mb-6">
            Never Miss a Campsite
          </h1>
          <p className="text-2xl text-green-700 mb-8">
            Real-time availability tracking and smart alerts for your favorite campgrounds
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/search">
              <Button size="lg" className="text-lg px-8">
                <MapPin className="mr-2 h-5 w-5" />
                Search Campsites
              </Button>
            </Link>
            {!isAuthenticated && (
              <a href={getLoginUrl()}>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <Bell className="mr-2 h-5 w-5" />
                  Set Up Alerts
                </Button>
              </a>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Geo-Spatial Search</CardTitle>
              <CardDescription>
                Find campsites within any radius of your location with precise distance calculations
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Availability Scoring</CardTitle>
              <CardDescription>
                Smart scores (0-100) based on provider reliability, data freshness, and historical patterns
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Smart Alerts</CardTitle>
              <CardDescription>
                Get notified when sites open up, scores improve, or cancellations are detected
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-green-900 mb-12">
            How It Works
          </h2>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  Search Your Area
                </h3>
                <p className="text-gray-600 text-lg">
                  Enter your location, dates, and preferences to find available campsites within your desired radius
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  Save Your Searches
                </h3>
                <p className="text-gray-600 text-lg">
                  Create an account to save your favorite searches and set up custom alert preferences
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 h-12 w-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  Get Notified
                </h3>
                <p className="text-gray-600 text-lg">
                  Receive email alerts when new availability opens up, scores improve, or cancellations are detected
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Card className="bg-green-600 border-green-600 text-white">
            <CardContent className="py-12">
              <Tent className="h-16 w-16 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                Ready to Find Your Perfect Campsite?
              </h2>
              <p className="text-xl mb-8 text-green-100">
                Start searching now or create an account to unlock alerts
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/search">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    Start Searching
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <a href={getLoginUrl()}>
                    <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent border-white text-white hover:bg-white hover:text-green-600">
                      Sign Up Free
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
