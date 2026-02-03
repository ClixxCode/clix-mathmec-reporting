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
                  <TableHead colSpan={6} className="text-left pb-1 bg-blue-50">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                      Google Ads Data
                    </span>
                  </TableHead>
                  <TableHead colSpan={3} className="text-left pb-1 bg-emerald-50">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                      HubSpot Data
                    </span>
                  </TableHead>
                </TableRow>
                {/* Column headers */}
                <TableRow>
                  <TableHead className="min-w-[180px] bg-blue-50/50">Campaign</TableHead>
                  <TableHead className="text-right bg-blue-50/50">Spend</TableHead>
                  <TableHead className="text-right bg-blue-50/50">Impr.</TableHead>
                  <TableHead className="text-right bg-blue-50/50">Clicks</TableHead>
                  <TableHead className="text-right bg-blue-50/50">Conv.</TableHead>
                  <TableHead className="text-right bg-blue-50/50">Cost/Conv.</TableHead>
                  <TableHead className="text-right bg-emerald-50/50 text-emerald-700">Contacts</TableHead>
                  <TableHead className="text-right bg-emerald-50/50 text-emerald-700">Deals</TableHead>
                  <TableHead className="text-right bg-emerald-50/50 text-emerald-700">Deal Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.campaign}>
                    <TableCell className="font-medium max-w-[200px] truncate bg-blue-50/20" title={row.campaign}>
                      {row.campaign}
                    </TableCell>
                    <TableCell className="text-right bg-blue-50/20">{formatCurrency(row.spend)}</TableCell>
                    <TableCell className="text-right bg-blue-50/20">{formatNumber(row.impressions)}</TableCell>
                    <TableCell className="text-right bg-blue-50/20">{formatNumber(row.clicks)}</TableCell>
                    <TableCell className="text-right bg-blue-50/20">{formatNumber(row.conversions)}</TableCell>
                    <TableCell className="text-right bg-blue-50/20">
                      {row.costPerConversion !== null ? formatCurrency(row.costPerConversion) : "—"}
                    </TableCell>
                    <TableCell className="text-right bg-emerald-50/30 font-medium text-emerald-600">
                      {row.contacts > 0 ? row.contacts : "—"}
                    </TableCell>
                    <TableCell className="text-right bg-emerald-50/30 font-medium text-emerald-600">
                      {row.deals > 0 ? row.deals : "—"}
                    </TableCell>
                    <TableCell className="text-right bg-emerald-50/30 font-medium text-emerald-600">
                      {row.dealValue > 0 ? formatCurrency(row.dealValue) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="font-semibold border-t-2 border-gray-200">
                  <TableCell className="bg-blue-100/50">Total</TableCell>
                  <TableCell className="text-right bg-blue-100/50">
                    {formatCurrency(data.reduce((sum, r) => sum + r.spend, 0))}
                  </TableCell>
                  <TableCell className="text-right bg-blue-100/50">
                    {formatNumber(data.reduce((sum, r) => sum + r.impressions, 0))}
                  </TableCell>
                  <TableCell className="text-right bg-blue-100/50">
                    {formatNumber(data.reduce((sum, r) => sum + r.clicks, 0))}
                  </TableCell>
                  <TableCell className="text-right bg-blue-100/50">
                    {formatNumber(data.reduce((sum, r) => sum + r.conversions, 0))}
                  </TableCell>
                  <TableCell className="text-right bg-blue-100/50">
                    {(() => {
                      const totalSpend = data.reduce((sum, r) => sum + r.spend, 0);
                      const totalConversions = data.reduce((sum, r) => sum + r.conversions, 0);
                      return totalConversions > 0 ? formatCurrency(totalSpend / totalConversions) : "—";
                    })()}
                  </TableCell>
                  <TableCell className="text-right bg-emerald-100/50 text-emerald-600">
                    {data.reduce((sum, r) => sum + r.contacts, 0)}
                  </TableCell>
                  <TableCell className="text-right bg-emerald-100/50 text-emerald-600">
                    {data.reduce((sum, r) => sum + r.deals, 0)}
                  </TableCell>
                  <TableCell className="text-right bg-emerald-100/50 text-emerald-600">
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
