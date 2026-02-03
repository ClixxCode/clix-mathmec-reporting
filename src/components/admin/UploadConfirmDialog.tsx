import { format, parse } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, AlertTriangle } from "lucide-react";

interface UploadConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  reportMonth: string; // "YYYY-MM" format
  onConfirm: () => void;
}

export function UploadConfirmDialog({
  open,
  onOpenChange,
  fileName,
  reportMonth,
  onConfirm,
}: UploadConfirmDialogProps) {
  // Parse "YYYY-MM" to display as "January 2025"
  const monthDate = parse(reportMonth, "yyyy-MM", new Date());
  const formattedMonth = format(monthDate, "MMMM yyyy");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Confirm Upload Month
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>You're about to import geo data for:</p>
              
              <div className="flex items-center justify-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <CalendarIcon className="w-6 h-6 text-amber-600" />
                <span className="text-2xl font-bold text-amber-900">
                  {formattedMonth}
                </span>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">File: {fileName}</p>
                <p className="mt-1">
                  Make sure this matches the report period in your CSV.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Yes, Import for {format(monthDate, "MMM yyyy")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
