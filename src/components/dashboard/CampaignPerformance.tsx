import { useCampaignPerformance } from "@/hooks/use-campaign-performance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingUp } from "lucide-react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

export function CampaignPerformance() {
  const { data, isLoading } = useCampaignPerformance();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg font-semibold">Campaign Performance</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Google Ads metrics merged with HubSpot contacts and deals
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No campaign data for this month</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {/* Column group headers */}
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="pb-1" />
                  <TableHead colSpan={5} className="text-center pb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Google Ads Data
                    </span>
                  </TableHead>
                  <TableHead colSpan={3} className="text-center pb-1 border-l border-gray-200">
                    <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                      HubSpot Data
                    </span>
                  </TableHead>
                </TableRow>
                {/* Column headers */}
                <TableRow>
                  <TableHead className="min-w-[180px]">Campaign</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Impr.</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">Cost/Conv.</TableHead>
                  <TableHead className="text-right border-l border-gray-200 text-teal-700">Contacts</TableHead>
                  <TableHead className="text-right text-teal-700">Deals</TableHead>
                  <TableHead className="text-right text-teal-700">Deal Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.campaign}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={row.campaign}>
                      {row.campaign}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.spend)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.impressions)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.conversions)}</TableCell>
                    <TableCell className="text-right">
                      {row.costPerConversion !== null ? formatCurrency(row.costPerConversion) : "—"}
                    </TableCell>
                    <TableCell className="text-right border-l border-gray-200 font-medium text-teal-600">
                      {row.contacts > 0 ? row.contacts : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-teal-600">
                      {row.deals > 0 ? row.deals : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-teal-600">
                      {row.dealValue > 0 ? formatCurrency(row.dealValue) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(data.reduce((sum, r) => sum + r.spend, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(data.reduce((sum, r) => sum + r.impressions, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(data.reduce((sum, r) => sum + r.clicks, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(data.reduce((sum, r) => sum + r.conversions, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      const totalSpend = data.reduce((sum, r) => sum + r.spend, 0);
                      const totalConversions = data.reduce((sum, r) => sum + r.conversions, 0);
                      return totalConversions > 0 ? formatCurrency(totalSpend / totalConversions) : "—";
                    })()}
                  </TableCell>
                  <TableCell className="text-right border-l border-gray-200 text-teal-600">
                    {data.reduce((sum, r) => sum + r.contacts, 0)}
                  </TableCell>
                  <TableCell className="text-right text-teal-600">
                    {data.reduce((sum, r) => sum + r.deals, 0)}
                  </TableCell>
                  <TableCell className="text-right text-teal-600">
                    {formatCurrency(data.reduce((sum, r) => sum + r.dealValue, 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
