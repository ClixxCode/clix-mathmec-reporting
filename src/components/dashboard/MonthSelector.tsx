import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MonthSelector() {
  const { filters, setSelectedMonth, availableMonths } = useDashboardFilters();
  
  const currentValue = format(filters.selectedMonth, "yyyy-MM");

  const handleChange = (value: string) => {
    const selected = availableMonths.find((m) => m.value === value);
    if (selected) {
      setSelectedMonth(selected.date);
    }
  };

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px] bg-white border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <SelectValue placeholder="Select month" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {availableMonths.map((month) => (
          <SelectItem key={month.value} value={month.value}>
            {month.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
