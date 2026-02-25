import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, AlertTriangle, Clock, DollarSign } from "lucide-react";

export interface IntelligenceData {
  cancellationProbability?: number;
  bookingLikelihoodScore?: number;
  urgencyLevel?: "low" | "medium" | "high" | "critical";
  estimatedHoursUntilBooked?: number;
  demandScore?: number;
  priceChange?: number;
}

interface IntelligenceBadgesProps {
  intelligence: IntelligenceData;
  compact?: boolean;
}

export function IntelligenceBadges({ intelligence, compact = false }: IntelligenceBadgesProps) {
  const badges = [];

  // High cancellation probability badge
  if (intelligence.cancellationProbability && intelligence.cancellationProbability >= 0.6) {
    badges.push(
      <Tooltip key="cancellation">
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
            <AlertTriangle className="h-3 w-3" />
            {!compact && "High Cancellation Risk"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">
            {Math.round(intelligence.cancellationProbability * 100)}% cancellation probability
          </p>
          <p className="text-xs text-muted-foreground">
            This site may become available due to cancellation
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Booking urgency badge
  if (intelligence.urgencyLevel && ["high", "critical"].includes(intelligence.urgencyLevel)) {
    const isCritical = intelligence.urgencyLevel === "critical";
    badges.push(
      <Tooltip key="urgency">
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gap-1 ${
              isCritical
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200"
            }`}
          >
            <Clock className="h-3 w-3" />
            {!compact && (isCritical ? "Book Now" : "Likely to Book Soon")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">
            {isCritical ? "Critical urgency" : "High booking velocity"}
          </p>
          {intelligence.estimatedHoursUntilBooked && (
            <p className="text-xs text-muted-foreground">
              Estimated to book in {Math.round(intelligence.estimatedHoursUntilBooked)} hours
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  // High demand badge
  if (intelligence.demandScore && intelligence.demandScore >= 70) {
    badges.push(
      <Tooltip key="demand">
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
            <TrendingUp className="h-3 w-3" />
            {!compact && "High Demand"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">Demand score: {Math.round(intelligence.demandScore)}/100</p>
          <p className="text-xs text-muted-foreground">
            This area has high camping demand
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Price drop badge
  if (intelligence.priceChange && intelligence.priceChange < -10) {
    badges.push(
      <Tooltip key="price">
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <DollarSign className="h-3 w-3" />
            {!compact && "Price Drop"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">
            {Math.abs(Math.round(intelligence.priceChange))}% price decrease
          </p>
          <p className="text-xs text-muted-foreground">
            Recent price reduction detected
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  return <div className="flex flex-wrap gap-1.5">{badges}</div>;
}
