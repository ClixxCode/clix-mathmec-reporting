import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, AlertCircle } from "lucide-react";

const MATHEWS_LOCATIONS = ["Newark", "Seattle", "Portland", "Denver"] as const;

type MathewsLocation = typeof MATHEWS_LOCATIONS[number];

interface UnmappedMetro {
  metro_area: string;
  conversions: number;
  cost: number;
}

interface MetroMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unmappedMetros: UnmappedMetro[];
  onConfirmMappings: (mappings: Record<string, string>) => void;
  isSubmitting?: boolean;
}

export function MetroMappingModal({
  open,
  onOpenChange,
  unmappedMetros,
  onConfirmMappings,
  isSubmitting = false,
}: MetroMappingModalProps) {
  const [mappings, setMappings] = useState<Record<string, MathewsLocation>>({});

  const allMapped = unmappedMetros.every((metro) => mappings[metro.metro_area]);

  const handleLocationChange = (metroArea: string, location: MathewsLocation) => {
    setMappings((prev) => ({
      ...prev,
      [metroArea]: location,
    }));
  };

  const handleConfirm = () => {
    onConfirmMappings(mappings);
  };

  const handleSkip = () => {
    // Confirm with empty mappings - metros will remain as "Unknown"
    onConfirmMappings({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Unmapped Metro Areas Detected
          </DialogTitle>
          <DialogDescription>
            The following metro areas aren't mapped to a Mathews Mechanical location.
            Please assign each one to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto py-2">
          {unmappedMetros.map((metro) => (
            <div
              key={metro.metro_area}
              className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {metro.metro_area}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">
                  {metro.conversions} conv · ${metro.cost.toFixed(0)} spend
                </p>
              </div>

              <Select
                value={mappings[metro.metro_area] || ""}
                onValueChange={(value) =>
                  handleLocationChange(metro.metro_area, value as MathewsLocation)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {MATHEWS_LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip (Keep as Unknown)
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allMapped || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Confirm Mappings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
