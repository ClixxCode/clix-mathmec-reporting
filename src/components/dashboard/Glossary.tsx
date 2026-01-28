const glossaryTerms = [
  {
    term: "State (Matched)",
    definition:
      "The user's location (at the time of the ad interaction) that Google Ads matched to a state. Used to break performance down by geography.",
  },
  {
    term: "Campaign",
    definition: "The Google Ads campaign the traffic and results are attributed to.",
  },
  {
    term: "Cost",
    definition: "Total ad spend for the selected date range and filters.",
  },
  {
    term: "Impr. (Impressions)",
    definition: "The number of times your ads were shown.",
  },
  {
    term: "Clicks",
    definition: "The number of clicks on your ads.",
  },
  {
    term: "CTR (Click-through rate)",
    definition: "Clicks divided by impressions. Indicates how often people click after seeing the ad.",
  },
  {
    term: "Avg. CPC (Average cost per click)",
    definition: "Total cost divided by clicks. The average amount paid per click.",
  },
  {
    term: "Conversions",
    definition:
      "The total number of conversion actions recorded (as defined in the account, such as forms, calls logged in CTM, etc.).",
  },
  {
    term: "Conv. rate (Conversion rate)",
    definition: "Conversions divided by clicks. Indicates how often clicks turn into tracked conversions.",
  },
  {
    term: "Cost / conv. (Cost per conversion)",
    definition: "Total cost divided by conversions. The average spend required to generate one tracked conversion.",
  },
  {
    term: "Quality Lead",
    definition:
      "A contact that resulted in a Closed Won deal, is currently In Progress, or was Closed Lost without a negative reason (spam, solicitation, etc.).",
  },
  {
    term: "Low Quality Lead",
    definition: "A contact identified as spam/bot, job seeker, solicitation, or otherwise non-viable.",
  },
];

const scoringCategories = [
  {
    category: "Service Relevance",
    points: "0-8",
    description: "Matches to fabrication, maintenance, material handling, fall protection, piping",
  },
  {
    category: "Project Specificity",
    points: "0-7",
    description: "Dimensions, materials, model numbers, quantities, drawings",
  },
  { category: "Commercial Intent", points: "0-6", description: "Quote requests, urgency, budget, RFQ language" },
  { category: "Engagement Quality", points: "0-5", description: "Call duration, message detail, referrals" },
  {
    category: "Conversion Indicators",
    points: "0-7",
    description: "Graduated by deal count (1 deal = 3pts, 3+ = 5pts, 5+ = 6pts)",
  },
];

export const Glossary = () => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Glossary</h3>
      </div>
      <div className="p-6">
        <div className="grid gap-4">
          {glossaryTerms.map((item) => (
            <div key={item.term} className="grid grid-cols-[180px_1fr] sm:grid-cols-[220px_1fr] gap-4 text-sm">
              <dt className="font-medium text-gray-900">{item.term}</dt>
              <dd className="text-gray-500">{item.definition}</dd>
            </div>
          ))}
        </div>

        {/* Contact Quality Scoring Model */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Quality Scoring Model</h3>
          <p className="text-sm text-gray-500 mb-5">0-30 points across 5 categories</p>

          <div className="grid gap-3 mb-5">
            {scoringCategories.map((item) => (
              <div
                key={item.category}
                className="grid grid-cols-[160px_60px_1fr] sm:grid-cols-[180px_70px_1fr] gap-3 text-sm items-center"
              >
                <dt className="font-medium text-gray-900">{item.category}</dt>
                <dd className="text-blue-600 font-mono text-xs bg-blue-50 px-2.5 py-1 rounded-md text-center font-medium">
                  {item.points}
                </dd>
                <dd className="text-gray-500">{item.description}</dd>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-5 text-sm">
            <p className="font-medium text-gray-900 mb-1">Spam Detection</p>
            <p className="text-gray-500">
              Disregards leads that mention SPAM subjects including: SEO pitches, estimating service spam, business
              brokers, procurement scams, empty forms, and vague bot messages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
