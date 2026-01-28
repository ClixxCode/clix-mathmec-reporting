import { LucideIcon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant: "blue" | "green" | "purple" | "orange";
  tooltipContent?: ReactNode;
}

// Unified icon styling - Slate Blue/Grey
const iconBgColor = "bg-[#F1F5F9]";
const iconColor = "text-[#2663EB]";

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant,
  tooltipContent,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {tooltipContent && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs p-3">
                    {tooltipContent}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
