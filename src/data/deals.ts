export interface Deal {
  dealName: string;
  dealStage: string;
  closedAmount: number;
  daysToClose: number;
  closedLostReason: string | null;
  closedWon: string | null;
  closedLost: string | null;
  firstName: string;
  lastName: string;
  originalTrafficSource: string;
  trafficSourceDrillDown1: string;
  trafficSourceDrillDown2: string;
  ipCity: string;
  creationDate: string;
  dealId: string;
  contactId: string;
}

export const deals: Deal[] = [
  {
    dealName: "Website Form Submission",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 1,
    closedLostReason: "DEAD",
    closedWon: null,
    closedLost: "2025-11-07",
    firstName: "Emma",
    lastName: "Bailey",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-newark",
    trafficSourceDrillDown2: "custom metal fabrication company",
    ipCity: "Redwood City",
    creationDate: "2025-09-16",
    dealId: "43821676559",
    contactId: "155832636948"
  },
  {
    dealName: "2591 Advanced Design Fabricate 9.5' Aluminum Railing 6061",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 45,
    closedLostReason: "DEAD",
    closedWon: null,
    closedLost: "2025-11-07",
    firstName: "Andrew",
    lastName: "Lipsett",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-newark",
    trafficSourceDrillDown2: "custom aluminum fabrication",
    ipCity: "San Francisco",
    creationDate: "2025-08-22",
    dealId: "42720399980",
    contactId: "149629060362"
  },
  {
    dealName: "2713 Advantech Labor Support - Reattach Cable for Door",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 75,
    closedLostReason: null,
    closedWon: null,
    closedLost: "2025-12-10",
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "44462257730",
    contactId: "157872231034"
  },
  {
    dealName: "2713 Advantech Labor Support - Reattach Cable for Door - Version 2",
    dealStage: "Closed Won",
    closedAmount: 1048.5,
    daysToClose: 22,
    closedLostReason: null,
    closedWon: "2025-11-07",
    closedLost: null,
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "46257081215",
    contactId: "157872231034"
  },
  {
    dealName: "2715 Advantech Supply Install High Speed Door",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 75,
    closedLostReason: null,
    closedWon: null,
    closedLost: "2025-12-10",
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "44570758716",
    contactId: "157872231034"
  },
  {
    dealName: "2717 Supply Install High Speed Door",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 75,
    closedLostReason: null,
    closedWon: null,
    closedLost: "2025-12-10",
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "44506509128",
    contactId: "157872231034"
  },
  {
    dealName: "2718 Bi-Annual PM Contract (2) Shrink Wrappers",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 24,
    closedLostReason: "Restructured",
    closedWon: null,
    closedLost: "2025-11-07",
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "44462258004",
    contactId: "157872231034"
  },
  {
    dealName: "2719 Supply Install High Speed Door W/ Sensors",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 75,
    closedLostReason: null,
    closedWon: null,
    closedLost: "2025-12-10",
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "44506509202",
    contactId: "157872231034"
  },
  {
    dealName: "2720 Bi-Annual PM Contract (4) High-Speed Doors",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 24,
    closedLostReason: "Restructured",
    closedWon: null,
    closedLost: "2025-11-07",
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "44506509265",
    contactId: "157872231034"
  },
  {
    dealName: "2721 Bi-Annual PM Contract (1) High-Speed Door",
    dealStage: "Closed Won",
    closedAmount: 2400,
    daysToClose: 22,
    closedLostReason: null,
    closedWon: "2025-11-07",
    closedLost: null,
    firstName: "Stanley",
    lastName: "Shen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-newark",
    trafficSourceDrillDown2: "industrial equipment maintenance",
    ipCity: "San Jose",
    creationDate: "2025-09-23",
    dealId: "46257081318",
    contactId: "157872231034"
  },
  {
    dealName: "2722 Shipping Container Platform Build",
    dealStage: "Closed Won",
    closedAmount: 5250,
    daysToClose: 30,
    closedLostReason: null,
    closedWon: "2025-10-15",
    closedLost: null,
    firstName: "Mike",
    lastName: "Rodriguez",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-newark",
    trafficSourceDrillDown2: "custom metal fabrication",
    ipCity: "Oakland",
    creationDate: "2025-09-15",
    dealId: "46257081400",
    contactId: "157872231100"
  },
  {
    dealName: "2723 Stainless Steel Handrail Installation",
    dealStage: "Closed Won",
    closedAmount: 3800,
    daysToClose: 18,
    closedLostReason: null,
    closedWon: "2025-11-20",
    closedLost: null,
    firstName: "Sarah",
    lastName: "Chen",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-newark",
    trafficSourceDrillDown2: "stainless steel fabrication",
    ipCity: "San Francisco",
    creationDate: "2025-11-02",
    dealId: "46257081500",
    contactId: "157872231200"
  },
  {
    dealName: "2724 Industrial Equipment Repair",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 14,
    closedLostReason: "Price",
    closedWon: null,
    closedLost: "2025-10-28",
    firstName: "David",
    lastName: "Kim",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-seattle",
    trafficSourceDrillDown2: "equipment repair services",
    ipCity: "Seattle",
    creationDate: "2025-10-14",
    dealId: "46257081600",
    contactId: "157872231300"
  },
  {
    dealName: "2725 Custom Aluminum Enclosure",
    dealStage: "Closed Won",
    closedAmount: 7500,
    daysToClose: 35,
    closedLostReason: null,
    closedWon: "2025-12-05",
    closedLost: null,
    firstName: "Jennifer",
    lastName: "Walsh",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-portland",
    trafficSourceDrillDown2: "aluminum fabrication",
    ipCity: "Portland",
    creationDate: "2025-10-31",
    dealId: "46257081700",
    contactId: "157872231400"
  },
  {
    dealName: "2726 Fall Protection System Quote",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 7,
    closedLostReason: "Spam/Bot",
    closedWon: null,
    closedLost: "2025-11-15",
    firstName: "Test",
    lastName: "User",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "safety-denver",
    trafficSourceDrillDown2: "fall protection systems",
    ipCity: "Denver",
    creationDate: "2025-11-08",
    dealId: "46257081800",
    contactId: "157872231500"
  },
  {
    dealName: "2727 Metal Gate Fabrication",
    dealStage: "Closed Won",
    closedAmount: 4200,
    daysToClose: 28,
    closedLostReason: null,
    closedWon: "2025-12-18",
    closedLost: null,
    firstName: "Robert",
    lastName: "Taylor",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-newark",
    trafficSourceDrillDown2: "metal gate fabrication",
    ipCity: "Fremont",
    creationDate: "2025-11-20",
    dealId: "46257081900",
    contactId: "157872231600"
  },
  {
    dealName: "2728 Job Application",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 1,
    closedLostReason: "Job Seeker",
    closedWon: null,
    closedLost: "2025-12-02",
    firstName: "Alex",
    lastName: "Johnson",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-seattle",
    trafficSourceDrillDown2: "welding jobs",
    ipCity: "Seattle",
    creationDate: "2025-12-01",
    dealId: "46257082000",
    contactId: "157872231700"
  },
  {
    dealName: "2729 Structural Steel Platform",
    dealStage: "Closed Won",
    closedAmount: 12500,
    daysToClose: 42,
    closedLostReason: null,
    closedWon: "2025-12-22",
    closedLost: null,
    firstName: "Marcus",
    lastName: "Brown",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-newark",
    trafficSourceDrillDown2: "structural steel fabrication",
    ipCity: "Newark",
    creationDate: "2025-11-10",
    dealId: "46257082100",
    contactId: "157872231800"
  },
  {
    dealName: "2730 Equipment Maintenance Contract",
    dealStage: "In Progress",
    closedAmount: 0,
    daysToClose: 0,
    closedLostReason: null,
    closedWon: null,
    closedLost: null,
    firstName: "Lisa",
    lastName: "Martinez",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "handling-portland",
    trafficSourceDrillDown2: "equipment maintenance",
    ipCity: "Portland",
    creationDate: "2025-12-15",
    dealId: "46257082200",
    contactId: "157872231900"
  },
  {
    dealName: "2731 Solicitation Email",
    dealStage: "Closed Lost",
    closedAmount: 0,
    daysToClose: 1,
    closedLostReason: "Solicitation",
    closedWon: null,
    closedLost: "2025-12-10",
    firstName: "Marketing",
    lastName: "Company",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-denver",
    trafficSourceDrillDown2: "metal fabrication services",
    ipCity: "Denver",
    creationDate: "2025-12-09",
    dealId: "46257082300",
    contactId: "157872232000"
  },
  {
    dealName: "2732 Custom Railing Project",
    dealStage: "In Progress",
    closedAmount: 0,
    daysToClose: 0,
    closedLostReason: null,
    closedWon: null,
    closedLost: null,
    firstName: "Patricia",
    lastName: "Lee",
    originalTrafficSource: "Paid Search",
    trafficSourceDrillDown1: "metalfab-newark",
    trafficSourceDrillDown2: "custom railing fabrication",
    ipCity: "San Jose",
    creationDate: "2025-12-20",
    dealId: "46257082400",
    contactId: "157872232100"
  }
];
// Advertising locations we target
export const advertisingLocations = ["Newark", "Seattle", "Portland", "Denver"];

// City mapping: maps IP cities to nearest advertising location
export const cityToAdLocation: Record<string, string> = {
  "newark": "Newark",
  "san francisco": "Newark",
  "san jose": "Newark",
  "oakland": "Newark",
  "fremont": "Newark",
  "redwood city": "Newark",
  "seattle": "Seattle",
  "portland": "Portland",
  "denver": "Denver",
};

// Helper function to get the advertising city for any IP city
export function getAdCity(ipCity: string): string {
  const mapped = cityToAdLocation[ipCity.toLowerCase()];
  return mapped || ipCity; // Return original if not in mapping
}

// Location performance data from December (from campaign_report.csv)
export const locationPerformance = [
  { location: "Newark", cost: 1436.21, percentBudget: 51.04, clicks: 522, conversions: 12, cpc: 2.75, conversionRate: 2.30, costPerConversion: 119.68 },
  { location: "Seattle", cost: 668.01, percentBudget: 23.74, clicks: 217, conversions: 3, cpc: 3.08, conversionRate: 1.38, costPerConversion: 222.67 },
  { location: "Portland", cost: 370.70, percentBudget: 13.17, clicks: 127, conversions: 2, cpc: 2.92, conversionRate: 1.57, costPerConversion: 185.35 },
  { location: "Denver", cost: 338.93, percentBudget: 12.05, clicks: 116, conversions: 2, cpc: 2.92, conversionRate: 1.72, costPerConversion: 169.47 },
];

// Low quality reasons that indicate spam/junk leads
const lowQualityReasons = ["spam/bot", "job seeker", "solicitation", "dead"];

// Determine if a deal is considered "quality" based on its stage and close reason
export function isQualityLead(deal: Deal): boolean {
  // Closed Won and In Progress are quality
  if (deal.dealStage === "Closed Won" || deal.dealStage === "In Progress") {
    return true;
  }
  // Closed Lost with low quality reasons are not quality
  if (deal.dealStage === "Closed Lost" && deal.closedLostReason) {
    return !lowQualityReasons.includes(deal.closedLostReason.toLowerCase());
  }
  // Closed Lost without reason (legitimate lost deal) is still quality
  return deal.dealStage === "Closed Lost" && !deal.closedLostReason;
}

// Generate quality trends from actual deal data grouped by month
export function generateQualityTrends(): { month: string; totalContacts: number; quality: number; lowQuality: number; qualityRate: number }[] {
  const monthlyData: Record<string, { total: number; quality: number; lowQuality: number }> = {};
  
  deals.forEach(deal => {
    const date = new Date(deal.creationDate);
    const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, quality: 0, lowQuality: 0 };
    }
    
    monthlyData[monthKey].total++;
    
    if (isQualityLead(deal)) {
      monthlyData[monthKey].quality++;
    } else {
      monthlyData[monthKey].lowQuality++;
    }
  });
  
  // Sort by date and convert to array
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });
  
  return sortedMonths.map(month => ({
    month,
    totalContacts: monthlyData[month].total,
    quality: monthlyData[month].quality,
    lowQuality: monthlyData[month].lowQuality,
    qualityRate: (monthlyData[month].quality / monthlyData[month].total) * 100
  }));
}

// Quality trends derived from actual deal data
export const qualityTrends = generateQualityTrends();

// Filter deals created in December 2025
export function isDecemberDeal(deal: Deal): boolean {
  const date = new Date(deal.creationDate);
  return date.getMonth() === 11 && date.getFullYear() === 2025; // 11 = December
}

export const decemberDeals = deals.filter(isDecemberDeal);

// December-specific quality metrics
export function getDecemberQualityMetrics() {
  const total = decemberDeals.length;
  const quality = decemberDeals.filter(isQualityLead).length;
  const lowQuality = total - quality;
  const qualityRate = total > 0 ? (quality / total) * 100 : 0;
  return { total, quality, lowQuality, qualityRate };
}
