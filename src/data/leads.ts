// Scored leads data parsed from CSV
export interface ScoredLead {
  contactId: string;
  createDate: string;
  originalTrafficSource: string;
  qualityScore: number;
  qualityTier: number;
  qualityTierLabel: string;
  isSpam: boolean;
  leadType: string;
}

// Raw lead data - parsed from scored_leads.csv (updated January 2026)
export const scoredLeads: ScoredLead[] = [
  // November 2025
  { contactId: "176388374605", createDate: "2025-11-18", originalTrafficSource: "Paid Search", qualityScore: 21, qualityTier: 5, qualityTierLabel: "Hot Lead", isSpam: false, leadType: "Phone Call" },
  { contactId: "177135739541", createDate: "2025-11-20", originalTrafficSource: "Paid Search", qualityScore: 18, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "334454096620", createDate: "2025-11-25", originalTrafficSource: "Paid Search", qualityScore: 14, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Phone Call" },
  { contactId: "334058852063", createDate: "2025-11-25", originalTrafficSource: "Paid Search", qualityScore: 12, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "332224710351", createDate: "2025-11-24", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "177612163124", createDate: "2025-11-21", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "175360442492", createDate: "2025-11-15", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "174500290310", createDate: "2025-11-12", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "174462817954", createDate: "2025-11-12", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "173891418911", createDate: "2025-11-10", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "177214544508", createDate: "2025-11-20", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "176812274999", createDate: "2025-11-19", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "175280940396", createDate: "2025-11-15", originalTrafficSource: "Paid Search", qualityScore: 6, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },

  // December 2025
  { contactId: "340997501640", createDate: "2025-12-02", originalTrafficSource: "Paid Search", qualityScore: 16, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "368364815067", createDate: "2025-12-30", originalTrafficSource: "Paid Search", qualityScore: 14, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "362006895295", createDate: "2025-12-22", originalTrafficSource: "Organic Search", qualityScore: 14, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "352835365569", createDate: "2025-12-13", originalTrafficSource: "Organic Search", qualityScore: 14, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "363754390233", createDate: "2025-12-25", originalTrafficSource: "Paid Search", qualityScore: 12, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "358209410753", createDate: "2025-12-23", originalTrafficSource: "Organic Search", qualityScore: 11, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "345647409910", createDate: "2025-12-07", originalTrafficSource: "Paid Search", qualityScore: 11, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "341795202799", createDate: "2025-12-03", originalTrafficSource: "Paid Search", qualityScore: 11, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "364467812049", createDate: "2025-12-26", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "362570402544", createDate: "2025-12-23", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "360295283431", createDate: "2025-12-20", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "357405081096", createDate: "2025-12-18", originalTrafficSource: "Paid Search", qualityScore: 8, qualityTier: 2, qualityTierLabel: "Standard Lead", isSpam: false, leadType: "Phone Call" },
  { contactId: "353978396091", createDate: "2025-12-16", originalTrafficSource: "Paid Search", qualityScore: 8, qualityTier: 2, qualityTierLabel: "Standard Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "350898779321", createDate: "2025-12-11", originalTrafficSource: "Paid Search", qualityScore: 8, qualityTier: 2, qualityTierLabel: "Standard Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "366808205001", createDate: "2025-12-29", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },

  // October 2025
  { contactId: "161458865700", createDate: "2025-10-06", originalTrafficSource: "Organic Search", qualityScore: 19, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "169173048582", createDate: "2025-10-28", originalTrafficSource: "Paid Search", qualityScore: 15, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "168557445680", createDate: "2025-10-27", originalTrafficSource: "Organic Search", qualityScore: 15, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "164312546317", createDate: "2025-10-15", originalTrafficSource: "Organic Search", qualityScore: 14, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "169722821679", createDate: "2025-10-29", originalTrafficSource: "Paid Search", qualityScore: 13, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "166362085436", createDate: "2025-10-22", originalTrafficSource: "Organic Search", qualityScore: 12, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "169730896737", createDate: "2025-10-29", originalTrafficSource: "Organic Search", qualityScore: 12, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "163553934703", createDate: "2025-10-13", originalTrafficSource: "Paid Search", qualityScore: 11, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "166558080001", createDate: "2025-10-23", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "162763343018", createDate: "2025-10-10", originalTrafficSource: "Organic Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "162427583270", createDate: "2025-10-09", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "165432406697", createDate: "2025-10-20", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "161778259630", createDate: "2025-10-07", originalTrafficSource: "Organic Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "160760739845", createDate: "2025-10-03", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "160969874267", createDate: "2025-10-04", originalTrafficSource: "Paid Search", qualityScore: 5, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "160423081872", createDate: "2025-10-02", originalTrafficSource: "Paid Search", qualityScore: 5, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "160417930761", createDate: "2025-10-02", originalTrafficSource: "Paid Search", qualityScore: 5, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "160138413635", createDate: "2025-10-01", originalTrafficSource: "Organic Search", qualityScore: 12, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },

  // September 2025
  { contactId: "154368838514", createDate: "2025-09-10", originalTrafficSource: "Organic Search", qualityScore: 17, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "159557308703", createDate: "2025-09-29", originalTrafficSource: "Paid Search", qualityScore: 16, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "157872231034", createDate: "2025-09-23", originalTrafficSource: "Paid Search", qualityScore: 15, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "157397284486", createDate: "2025-09-22", originalTrafficSource: "Paid Search", qualityScore: 13, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "159882507937", createDate: "2025-09-30", originalTrafficSource: "Organic Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "158728653931", createDate: "2025-09-26", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "159843049235", createDate: "2025-09-30", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "157416291109", createDate: "2025-09-22", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "156991019564", createDate: "2025-09-20", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "155832636948", createDate: "2025-09-16", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "116203463331", createDate: "2025-09-12", originalTrafficSource: "Organic Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "156182361875", createDate: "2025-09-17", originalTrafficSource: "Paid Search", qualityScore: 11, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "156502364601", createDate: "2025-09-19", originalTrafficSource: "Paid Search", qualityScore: 6, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "155073887136", createDate: "2025-09-13", originalTrafficSource: "Paid Search", qualityScore: 6, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "155486041963", createDate: "2025-09-15", originalTrafficSource: "Paid Search", qualityScore: 5, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "152673429114", createDate: "2025-09-03", originalTrafficSource: "Organic Search", qualityScore: 5, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "152648258921", createDate: "2025-09-03", originalTrafficSource: "Paid Search", qualityScore: 3, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "158719194269", createDate: "2025-09-26", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "154860403011", createDate: "2025-09-12", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "154019795476", createDate: "2025-09-09", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "157280087988", createDate: "2025-09-22", originalTrafficSource: "Organic Search", qualityScore: 3, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },

  // August 2025
  { contactId: "147352042275", createDate: "2025-08-15", originalTrafficSource: "Paid Search", qualityScore: 13, qualityTier: 3, qualityTierLabel: "Qualified Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "143108289547", createDate: "2025-08-01", originalTrafficSource: "Paid Search", qualityScore: 11, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "149629060362", createDate: "2025-08-22", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "147429966457", createDate: "2025-08-15", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "145342249377", createDate: "2025-08-09", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "151111664255", createDate: "2025-08-28", originalTrafficSource: "Paid Search", qualityScore: 6, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "150309252901", createDate: "2025-08-25", originalTrafficSource: "Paid Search", qualityScore: 6, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "150223441430", createDate: "2025-08-25", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "144251325864", createDate: "2025-08-05", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },

  // July 2025
  { contactId: "142770153776", createDate: "2025-07-31", originalTrafficSource: "Organic Search", qualityScore: 16, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "139705073748", createDate: "2025-07-20", originalTrafficSource: "Paid Search", qualityScore: 16, qualityTier: 4, qualityTierLabel: "High Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "135576490913", createDate: "2025-07-07", originalTrafficSource: "Paid Search", qualityScore: 11, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "136211614988", createDate: "2025-07-09", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "139918328996", createDate: "2025-07-21", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "139542006089", createDate: "2025-07-19", originalTrafficSource: "Paid Search", qualityScore: 10, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "142147274074", createDate: "2025-07-29", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Phone Call" },
  { contactId: "134637271672", createDate: "2025-07-03", originalTrafficSource: "Paid Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "134202490403", createDate: "2025-07-02", originalTrafficSource: "Organic Search", qualityScore: 9, qualityTier: 3, qualityTierLabel: "Nurture", isSpam: false, leadType: "Form Fill" },
  { contactId: "134201572926", createDate: "2025-07-02", originalTrafficSource: "Paid Search", qualityScore: 7, qualityTier: 2, qualityTierLabel: "Standard Lead", isSpam: false, leadType: "Form Fill" },
  { contactId: "141852735269", createDate: "2025-07-28", originalTrafficSource: "Paid Search", qualityScore: 6, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "137639053891", createDate: "2025-07-14", originalTrafficSource: "Organic Search", qualityScore: 6, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "135686057510", createDate: "2025-07-07", originalTrafficSource: "Paid Search", qualityScore: 5, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "136594490178", createDate: "2025-07-10", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Form Fill" },
  { contactId: "134263633049", createDate: "2025-07-02", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
  { contactId: "139988691479", createDate: "2025-07-21", originalTrafficSource: "Paid Search", qualityScore: 4, qualityTier: 2, qualityTierLabel: "Low Priority", isSpam: false, leadType: "Phone Call" },
];

// Quality tier definitions
export interface QualityTrendRow {
  month: string;
  totalContacts: number;
  quality1to10: number;
  quality11to20: number;
  avgQuality: number;
}

// Generate quality trends from the scored leads data (non-spam only)
export function generateLeadQualityTrends(): QualityTrendRow[] {
  const monthlyData: Record<string, { scores: number[]; count1to10: number; count11to20: number }> = {};

  // Filter out spam and group by month
  scoredLeads
    .filter(lead => !lead.isSpam)
    .forEach((lead) => {
      const date = new Date(lead.createDate);
      const monthKey = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { scores: [], count1to10: 0, count11to20: 0 };
      }

      monthlyData[monthKey].scores.push(lead.qualityScore);

      if (lead.qualityScore >= 1 && lead.qualityScore <= 10) {
        monthlyData[monthKey].count1to10++;
      } else if (lead.qualityScore >= 11 && lead.qualityScore <= 20) {
        monthlyData[monthKey].count11to20++;
      }
    });

  // Sort by date
  const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  return sortedMonths.map((month) => {
    const data = monthlyData[month];
    const totalContacts = data.scores.length;
    const avgQuality = totalContacts > 0 ? data.scores.reduce((a, b) => a + b, 0) / totalContacts : 0;

    return {
      month,
      totalContacts,
      quality1to10: data.count1to10,
      quality11to20: data.count11to20,
      avgQuality: Math.round(avgQuality * 10) / 10,
    };
  });
}

export const leadQualityTrends = generateLeadQualityTrends();

// Get December 2025 leads only
export function getDecemberLeads(): ScoredLead[] {
  return scoredLeads.filter(lead => lead.createDate.startsWith("2025-12"));
}

// Calculate metrics for December 2025
export function getDecemberMetrics() {
  const decemberLeads = getDecemberLeads();
  // Non-spam contacts only for total contacts
  const nonSpamLeads = decemberLeads.filter(lead => !lead.isSpam);
  const totalContacts = nonSpamLeads.length;
  // All phone calls (including spam) for total calls
  const totalCalls = decemberLeads.filter(lead => lead.leadType === "Phone Call").length;
  // Average quality score for December (non-spam leads only)
  const avgQuality = totalContacts > 0 
    ? Math.round((nonSpamLeads.reduce((sum, lead) => sum + lead.qualityScore, 0) / totalContacts) * 10) / 10
    : 0;

  return {
    totalContacts,
    totalCalls,
    // Conversions from location performance data (12 + 3 + 2 + 2 = 19)
    conversions: 19,
    qualityRate: avgQuality,
  };
}
