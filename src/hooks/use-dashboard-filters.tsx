import { createContext, useContext, useState, ReactNode } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface DashboardFilters {
  selectedMonth: Date;
  startDate: string;
  endDate: string;
}

interface DashboardFiltersContextType {
  filters: DashboardFilters;
  setSelectedMonth: (date: Date) => void;
  availableMonths: { value: string; label: string; date: Date }[];
}

const DashboardFiltersContext = createContext<DashboardFiltersContextType | undefined>(undefined);

// Generate last 24 months for dropdown
function generateAvailableMonths(): { value: string; label: string; date: Date }[] {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const date = subMonths(now, i);
    months.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
      date: startOfMonth(date),
    });
  }
  
  return months;
}

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  // Default to January 2026 based on the data we have
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date(2026, 2, 1));
  
  const availableMonths = generateAvailableMonths();
  
  const filters: DashboardFilters = {
    selectedMonth,
    startDate: format(startOfMonth(selectedMonth), "yyyy-MM-dd"),
    endDate: format(endOfMonth(selectedMonth), "yyyy-MM-dd"),
  };

  return (
    <DashboardFiltersContext.Provider value={{ filters, setSelectedMonth, availableMonths }}>
      {children}
    </DashboardFiltersContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = useContext(DashboardFiltersContext);
  if (!context) {
    throw new Error("useDashboardFilters must be used within DashboardFiltersProvider");
  }
  return context;
}
