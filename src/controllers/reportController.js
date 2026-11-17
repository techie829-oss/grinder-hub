import { json, bad } from '../utils/response.js';
import { clean, dayKey } from '../utils/helpers.js';

export async function getDaySummary(request, env, business, url) {
  let day = clean(url.searchParams.get('day'), 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    day = dayKey(Date.now());
  }

  const [tokensRes, entriesRes, daysRes, expensesRes] = await env.DB.batch([
    // 0: tokens for the day
    env.DB.prepare(
      `SELECT t.id, t.no, t.name, COALESCE(t.village, '') AS village, COALESCE(t.phone, '') AS phone,
              t.service_id, COALESCE(t.gross_weight, 0) AS gross_weight, COALESCE(t.loss_g, 0) AS loss_g,
              COALESCE(t.net_weight, 0) AS net_weight, t.status, t.created_at,
              COALESCE(s.name, 'पिसाई') AS service_name, COALESCE(s.unit, 'kg') AS unit
         FROM tokens t
         LEFT JOIN services s ON s.id = t.service_id AND s.business_id = t.business_id
        WHERE t.business_id = ? AND t.day = ?
        ORDER BY t.no ASC`
    ).bind(business.id, day),
    // 1: entries for the day
    env.DB.prepare(
      `SELECT e.id, e.kind, e.customer_id, e.name, COALESCE(e.village, '') AS village,
              COALESCE(e.item_name, '') AS item_name,
              COALESCE(e.gross_weight, 0) AS gross_weight, COALESCE(e.loss_g, 0) AS loss_g,
              COALESCE(e.net_weight, 0) AS net_weight, e.rate_paise, e.amount_paise, e.paid,
              COALESCE(e.note, '') AS note, e.token_no, e.created_at,
              COALESCE(s.name, e.item_name, 'सुविधा / बिक्री') AS service_name,
              COALESCE(e.unit, s.unit, 'kg') AS unit
         FROM entries e
         LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
        WHERE e.business_id = ? AND e.day = ?
        ORDER BY e.created_at DESC`
    ).bind(business.id, day),
    // 2: available active days for quick selection
    env.DB.prepare(
      `SELECT DISTINCT day FROM (
         SELECT day FROM tokens WHERE business_id = ?
         UNION
         SELECT day FROM entries WHERE business_id = ?
         UNION
         SELECT day FROM expenses WHERE business_id = ?
       ) ORDER BY day DESC LIMIT 30`
    ).bind(business.id, business.id, business.id),
    // 3: shop expenses for the day
    env.DB.prepare(
      `SELECT id, category, amount_paise, payment_mode, note, day, created_at
         FROM expenses
        WHERE business_id = ? AND day = ?
        ORDER BY created_at DESC`
    ).bind(business.id, day),
  ]);

  const rawTokens = tokensRes?.results || [];
  const rawEntries = entriesRes?.results || [];
  const availableDays = (daysRes?.results || []).map((r) => r.day);
  const rawExpenses = (expensesRes?.results || []).map((ex) => ({
    id: ex.id,
    category: ex.category,
    amountPaise: Number(ex.amount_paise) || 0,
    paymentMode: ex.payment_mode || 'cash',
    note: ex.note || '',
    day: ex.day,
    at: ex.created_at,
  }));

  const totalExpenseAmountPaise = rawExpenses.reduce((sum, e) => sum + e.amountPaise, 0);
  const cashExpenseAmountPaise = rawExpenses.filter((e) => e.paymentMode === 'cash').reduce((sum, e) => sum + e.amountPaise, 0);

  // Map token_no -> entry for this day
  const tokenEntryMap = new Map();
  const matchedEntryIds = new Set();
  for (const entry of rawEntries) {
    if (entry.token_no != null && !tokenEntryMap.has(entry.token_no)) {
      tokenEntryMap.set(entry.token_no, entry);
      matchedEntryIds.add(entry.id);
    }
  }

  // Build unified order items list
  const orders = [];

  let paidCashCount = 0;
  let paidCashAmountPaise = 0;
  let unpaidUdhaarCount = 0;
  let unpaidUdhaarAmountPaise = 0;
  let unbilledCount = 0;
  let deliveredCount = 0;
  let deliveredWeightKg = 0;
  let pendingCount = 0;
  let pendingWeightKg = 0;
  let totalGrossWeightKg = 0;

  for (const tok of rawTokens) {
    totalGrossWeightKg += tok.gross_weight || 0;
    const isDelivered = tok.status === 'delivered';
    if (isDelivered) {
      deliveredCount++;
      deliveredWeightKg += tok.net_weight || tok.gross_weight || 0;
    } else {
      pendingCount++;
      pendingWeightKg += tok.net_weight || tok.gross_weight || 0;
    }

    const linkedEntry = tokenEntryMap.get(tok.no);
    const isBilled = Boolean(linkedEntry);
    const isPaid = linkedEntry ? linkedEntry.paid === 1 : null;
    const amountPaise = linkedEntry ? linkedEntry.amount_paise : 0;

    if (isBilled) {
      if (isPaid) {
        paidCashCount++;
        paidCashAmountPaise += amountPaise;
      } else {
        unpaidUdhaarCount++;
        unpaidUdhaarAmountPaise += amountPaise;
      }
    } else {
      unbilledCount++;
    }

    orders.push({
      itemType: 'token',
      id: tok.id,
      tokenNo: tok.no,
      name: tok.name,
      village: tok.village,
      phone: tok.phone,
      serviceId: tok.service_id,
      serviceName: tok.service_name,
      grossWeight: tok.gross_weight,
      lossG: tok.loss_g,
      netWeight: tok.net_weight,
      unit: tok.unit,
      status: tok.status, // waiting, serving, done, delivered
      isDelivered,
      isBilled,
      isPaid,
      amountPaise,
      ratePaise: linkedEntry ? linkedEntry.rate_paise : null,
      entryId: linkedEntry ? linkedEntry.id : null,
      customerId: linkedEntry ? linkedEntry.customer_id : null,
      note: linkedEntry ? linkedEntry.note : '',
      createdAt: tok.created_at,
    });
  }

  // Include non-token entries (e.g. direct store sale, crop purchase, cash payments)
  for (const entry of rawEntries) {
    if (matchedEntryIds.has(entry.id)) continue;

    if (entry.kind === 'payment') {
      paidCashCount++;
      paidCashAmountPaise += entry.amount_paise;
    } else if (entry.paid === 1) {
      paidCashCount++;
      paidCashAmountPaise += entry.amount_paise;
      if (entry.kind === 'sale') deliveredCount++;
    } else {
      unpaidUdhaarCount++;
      unpaidUdhaarAmountPaise += entry.amount_paise;
    }

    orders.push({
      itemType: 'entry',
      id: entry.id,
      tokenNo: entry.token_no || null,
      kind: entry.kind, // job, sale, purchase, payment
      name: entry.name,
      village: entry.village,
      phone: '',
      serviceId: null,
      serviceName: entry.service_name || entry.item_name || (entry.kind === 'payment' ? 'उधार जमा' : 'सुविधा / बिक्री'),
      grossWeight: entry.gross_weight || 0,
      lossG: entry.loss_g || 0,
      netWeight: entry.net_weight || 0,
      unit: entry.unit || 'kg',
      status: entry.kind === 'purchase' ? 'खरीद' : (entry.kind === 'payment' ? 'जमा' : 'पूर्ण'),
      isDelivered: true,
      isBilled: true,
      isPaid: entry.paid === 1,
      amountPaise: entry.amount_paise,
      ratePaise: entry.rate_paise,
      entryId: entry.id,
      customerId: entry.customer_id,
      note: entry.note || '',
      createdAt: entry.created_at,
    });
  }

  // Sort orders: tokens in order of tokenNo asc, then entries by createdAt desc
  orders.sort((a, b) => {
    if (a.tokenNo != null && b.tokenNo != null) return a.tokenNo - b.tokenNo;
    if (a.tokenNo != null) return -1;
    if (b.tokenNo != null) return 1;
    return b.createdAt - a.createdAt;
  });

  const summary = {
    day,
    totalOrders: orders.length,
    totalTokens: rawTokens.length,
    totalGrossWeightKg: Math.round(totalGrossWeightKg * 1000) / 1000,
    paidCashCount,
    paidCashAmountPaise,
    unpaidUdhaarCount,
    unpaidUdhaarAmountPaise,
    unbilledCount,
    deliveredCount,
    deliveredWeightKg: Math.round(deliveredWeightKg * 1000) / 1000,
    pendingCount,
    pendingWeightKg: Math.round(pendingWeightKg * 1000) / 1000,
    totalExpensesCount: rawExpenses.length,
    totalExpenseAmountPaise,
    cashExpenseAmountPaise,
    netCashInHandPaise: paidCashAmountPaise - cashExpenseAmountPaise,
  };

  return json({
    ok: true,
    day,
    summary,
    orders,
    expenses: rawExpenses,
    availableDays,
  });
}
