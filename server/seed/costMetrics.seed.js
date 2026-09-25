const DailyCostMetric  = require('../models/DailyCostMetric');
const AgentCostMetric  = require('../models/AgentCostMetric');

module.exports = async function seedCostMetrics() {
  await DailyCostMetric.deleteMany({});
  await AgentCostMetric.deleteMany({});

  // 30-day window: Jun 14 – Jul 13 2026 (ending yesterday, today = Jul 14)
  const DAILY = [
    { date: 'Jun 14', cost: 23.41, tokens: 1098234 },
    { date: 'Jun 15', cost: 25.18, tokens: 1214670 },
    { date: 'Jun 16', cost: 22.97, tokens: 1088412 },
    { date: 'Jun 17', cost: 24.33, tokens: 1152890 },
    { date: 'Jun 18', cost: 15.82, tokens: 701234  },
    { date: 'Jun 19', cost: 11.44, tokens: 548921  },
    { date: 'Jun 20', cost: 33.67, tokens: 1623445 },
    { date: 'Jun 21', cost: 31.09, tokens: 1481023 },
    { date: 'Jun 22', cost: 26.88, tokens: 1301567 },
    { date: 'Jun 23', cost: 29.41, tokens: 1423098 },
    { date: 'Jun 24', cost: 30.75, tokens: 1489334 },
    { date: 'Jun 25', cost: 17.23, tokens: 821456  },
    { date: 'Jun 26', cost: 14.88, tokens: 634512  },
    { date: 'Jun 27', cost: 43.21, tokens: 1987654 },
    { date: 'Jun 28', cost: 48.77, tokens: 2412309 },
    { date: 'Jun 29', cost: 35.14, tokens: 1712344 },
    { date: 'Jun 30', cost: 36.02, tokens: 1756789 },
    { date: 'Jul 1',  cost: 22.89, tokens: 1109876 },
    { date: 'Jul 2',  cost: 16.44, tokens: 781234  },
    { date: 'Jul 3',  cost: 15.91, tokens: 751023  },
    { date: 'Jul 4',  cost: 51.34, tokens: 2654321 },
    { date: 'Jul 5',  cost: 29.87, tokens: 1534512 },
    { date: 'Jul 6',  cost: 38.23, tokens: 1823456 },
    { date: 'Jul 7',  cost: 36.91, tokens: 1812345 },
    { date: 'Jul 8',  cost: 39.44, tokens: 2043210 },
    { date: 'Jul 9',  cost: 24.56, tokens: 1334567 },
    { date: 'Jul 10', cost: 15.03, tokens: 734890  },
    { date: 'Jul 11', cost: 48.12, tokens: 2489765 },
    { date: 'Jul 12', cost: 44.98, tokens: 2234512 },
    { date: 'Jul 13', cost: 45.67, tokens: 2312098 },
  ];

  const monthMap = { 'Jan':0,'Feb':1,'Mar':2,'Apr':3,'May':4,'Jun':5,'Jul':6,'Aug':7,'Sep':8,'Oct':9,'Nov':10,'Dec':11 };
  const rows = DAILY.map(r => {
    const [m, d] = r.date.split(' ');
    return { ...r, date_iso: new Date(2026, monthMap[m], parseInt(d)) };
  });
  await DailyCostMetric.insertMany(rows);

  // Per-agent cost metrics (30-day Jun 14 – Jul 13 2026).
  // Totals align with FLEET_CONSTANTS.MTD_SPEND_USD = 2340.
  const periodStart = new Date('2026-06-14');
  const periodEnd   = new Date('2026-07-13');
  await AgentCostMetric.insertMany([
    { agentId: 'agent-001', agentName: 'Concierge Agent',              inputTokens: 7640330, outputTokens: 2859419, totalCost: '620.00', totalCostNum: 620, requests: 4368, period_start: periodStart, period_end: periodEnd },
    { agentId: 'agent-002', agentName: 'Public Research Agent',        inputTokens: 3474447, outputTokens: 1502825, totalCost: '510.00', totalCostNum: 510, requests: 2907, period_start: periodStart, period_end: periodEnd },
    { agentId: 'agent-003', agentName: 'Insurance Underwriting Agent', inputTokens: 7498371, outputTokens: 3710571, totalCost: '460.00', totalCostNum: 460, requests: 3457, period_start: periodStart, period_end: periodEnd },
    { agentId: 'agent-005', agentName: 'Shipment Insight Agent',       inputTokens: 4054027, outputTokens: 2005827, totalCost: '360.00', totalCostNum: 360, requests: 5100, period_start: periodStart, period_end: periodEnd },
    { agentId: 'agent-009', agentName: 'Workforce Planning and Recruitment', inputTokens: 392000, outputTokens: 196000, totalCost: '390.00', totalCostNum: 390, requests: 1200, period_start: periodStart, period_end: periodEnd },
  ]);
};
