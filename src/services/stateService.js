// Aggregated Business State Service (Normalized & Strict Schema)
import { RANGES, rangeStart, rangeEnd, dayKey } from '../utils/helpers.js';

export async function buildState(env, businessId, range) {
  const safeRange = RANGES.includes(range) ? range : 'today';
  const from = rangeStart(safeRange);
  const to = rangeEnd(safeRange);
  const day = dayKey();

  const entriesTimeCondition = to === Infinity 
    ? 'e.created_at >= ?' 
    : 'e.created_at >= ? AND e.created_at < ?';
  const entriesTimeBinds = to === Infinity ? [businessId, from] : [businessId, from, to];

  const results = await env.DB.batch([
    // 0: services
    env.DB.prepare(
      `SELECT id, name, unit, rate_paise, COALESCE(loss_rate_g, 0) AS loss_rate_g, sort
         FROM services WHERE business_id = ? AND active = 1 ORDER BY sort, name`
    ).bind(businessId),
    // 1: customers
    env.DB.prepare(
      `SELECT c.id, c.name, COALESCE(c.village, '') AS village, c.phone, COALESCE(c.photo, '') AS photo, c.created_at,
              COALESCE(SUM(CASE WHEN e.kind IN ('job', 'sale') AND e.paid = 0 THEN e.amount_paise
                                WHEN e.kind = 'purchase' AND e.paid = 0 THEN -e.amount_paise
                                WHEN e.kind = 'payment' THEN -e.amount_paise ELSE 0 END), 0) AS balance_paise,
              MAX(e.created_at) AS last_at
         FROM customers c
         LEFT JOIN entries e ON e.business_id = c.business_id AND e.customer_id = c.id
        WHERE c.business_id = ?
        GROUP BY c.id
        ORDER BY balance_paise DESC, last_at DESC`
    ).bind(businessId),
    // 2: recent entries for range
    env.DB.prepare(
      `SELECT e.id, e.kind, e.customer_id, e.name, COALESCE(e.village, '') AS village,
              COALESCE(e.item_name, '') AS item_name,
              COALESCE(e.gross_weight, 0) AS gross_weight, COALESCE(e.loss_g, 0) AS loss_g, e.net_weight,
              e.rate_paise, e.amount_paise, e.paid, e.note, e.token_no, e.created_at,
              COALESCE(s.name, e.item_name, 'Other') AS service_name,
              COALESCE(e.unit, s.unit, 'kg') AS unit
         FROM entries e
         LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
        WHERE e.business_id = ? AND ${entriesTimeCondition}
        ORDER BY e.created_at DESC
        LIMIT 400`
    ).bind(...entriesTimeBinds),
    // 3: tokens today
    env.DB.prepare(
      `SELECT id, no, name, COALESCE(village, '') AS village, COALESCE(phone, '') AS phone, service_id,
              COALESCE(gross_weight, 0) AS gross_weight, COALESCE(loss_g, 0) AS loss_g,
              COALESCE(net_weight, 0) AS net_weight, status, created_at
         FROM tokens WHERE business_id = ? AND day = ? ORDER BY no`
    ).bind(businessId, day),
    // 4: summary stats for range
    env.DB.prepare(
      `SELECT COUNT(CASE WHEN kind = 'job' THEN 1 END) AS jobs,
              COUNT(CASE WHEN kind = 'sale' THEN 1 END) AS sales,
              COUNT(CASE WHEN kind = 'purchase' THEN 1 END) AS purchases,
              COALESCE(SUM(CASE WHEN kind IN ('job', 'sale') THEN amount_paise ELSE 0 END), 0) AS sale,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN amount_paise ELSE 0 END), 0) AS grinding_sale,
              COALESCE(SUM(CASE WHEN kind = 'sale' THEN amount_paise ELSE 0 END), 0) AS product_sale,
              COALESCE(SUM(CASE WHEN kind = 'purchase' THEN amount_paise ELSE 0 END), 0) AS purchase_total,
              COALESCE(SUM(CASE WHEN kind IN ('job', 'sale') AND paid = 1 THEN amount_paise ELSE 0 END), 0) AS cash_sales,
              COALESCE(SUM(CASE WHEN kind = 'payment' THEN amount_paise ELSE 0 END), 0) AS recovered,
              COALESCE(SUM(CASE WHEN kind = 'purchase' AND paid = 1 THEN amount_paise ELSE 0 END), 0) AS cash_purchase_paid,
              COALESCE(SUM(CASE WHEN kind IN ('job', 'sale') AND paid = 0 THEN amount_paise ELSE 0 END), 0) AS credit,
              COALESCE(SUM(CASE WHEN kind = 'purchase' AND paid = 0 THEN amount_paise ELSE 0 END), 0) AS farmer_payable,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN gross_weight ELSE 0 END), 0) AS gross_weight,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN loss_g ELSE 0 END), 0) AS loss_g,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN net_weight ELSE 0 END), 0) AS net_weight
         FROM entries WHERE business_id = ? AND ${entriesTimeCondition.replace(/e\./g, '')}`
    ).bind(...entriesTimeBinds),
    // 5: breakdown by service for range
    env.DB.prepare(
      `SELECT e.service_id AS id, COALESCE(s.name, 'Other') AS name, COALESCE(s.unit, 'kg') AS unit,
              COUNT(*) AS count, COALESCE(SUM(e.gross_weight), 0) AS gross_weight,
              COALESCE(SUM(e.loss_g), 0) AS loss_g, COALESCE(SUM(e.net_weight), 0) AS net_weight,
              COALESCE(SUM(e.amount_paise), 0) AS amount_paise
         FROM entries e LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
        WHERE e.business_id = ? AND ${entriesTimeCondition} AND e.kind = 'job'
        GROUP BY e.service_id
        ORDER BY amount_paise DESC`
    ).bind(...entriesTimeBinds),
    // 6: day counter
    env.DB.prepare('SELECT last_no FROM day_counters WHERE business_id = ? AND day = ?').bind(businessId, day),
    // 7: business info
    env.DB.prepare('SELECT id, name, phone, address, upi, note, COALESCE(status, \'active\') AS status, COALESCE(plan, \'free\') AS plan, COALESCE(is_super_admin, 0) AS is_super_admin, created_at FROM businesses WHERE id = ?').bind(businessId),
    // 8: dynamic products
    env.DB.prepare('SELECT id, name, type, unit, default_rate_paise, active FROM products WHERE business_id = ? AND active = 1 ORDER BY name ASC').bind(businessId),
  ]);

  const services = results[0].results.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    ratePaise: s.rate_paise,
    lossRateG: Number(s.loss_rate_g) || 0,
  }));

  const customers = results[1].results.map((c) => ({
    id: c.id,
    name: c.name,
    village: c.village || '',
    phone: c.phone || '',
    photo: c.photo || '',
    balancePaise: c.balance_paise || 0,
    lastAt: c.last_at || null,
  }));

  const entries = results[2].results.map((e) => {
    const lossG = Number(e.loss_g) || 0;
    const netWeight = e.net_weight != null ? Number(e.net_weight) : (e.gross_weight ? Math.max(0, e.gross_weight - (lossG / 1000)) : null);
    return {
      id: e.id,
      kind: e.kind,
      customerId: e.customer_id,
      name: e.name || '',
      village: e.village || '',
      itemName: e.item_name || '',
      grossWeight: e.gross_weight,
      lossG,
      netWeight,
      ratePaise: e.rate_paise,
      amountPaise: e.amount_paise,
      paid: !!e.paid,
      note: e.note || '',
      tokenNo: e.token_no,
      serviceName: e.service_name || e.item_name || '',
      unit: e.unit || 'kg',
      at: e.created_at,
    };
  });

  const tokensToday = results[3].results.map((t) => ({
    id: t.id,
    no: t.no,
    name: t.name,
    village: t.village || '',
    phone: t.phone || '',
    note: t.note || '',
    serviceId: t.service_id,
    serviceName: (services.find((s) => s.id === t.service_id) || {}).name || '',
    grossWeight: Number(t.gross_weight) || 0,
    lossG: Number(t.loss_g) || 0,
    netWeight: Number(t.net_weight) || 0,
    status: t.status,
    at: t.created_at,
  }));

  const s = results[4].results[0] || {};
  const counter = results[6].results[0];
  const biz = results[7].results[0] || {};
  const products = (results[8]?.results || []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type || 'both',
    unit: p.unit || 'kg',
    defaultRatePaise: p.default_rate_paise || 0,
  }));

  let outstandingPaise = 0;
  let outstandingCount = 0;
  let farmerPayablePaise = 0;
  for (const c of customers) {
    if (c.balancePaise > 0) {
      outstandingPaise += c.balancePaise;
      outstandingCount += 1;
    } else if (c.balancePaise < 0) {
      farmerPayablePaise += (-c.balancePaise);
    }
  }

  const maxTokenNo = tokensToday.reduce((m, t) => Math.max(m, t.no), 0);
  const lastNo = counter && counter.last_no ? counter.last_no : maxTokenNo;

  const cashSales = Number(s.cash_sales) || 0;
  const recovered = Number(s.recovered) || 0;
  const cashPurchasePaid = Number(s.cash_purchase_paid) || 0;
  const netCashInHand = cashSales + recovered - cashPurchasePaid;

  return {
    business: {
      id: biz.id,
      name: biz.name,
      phone: biz.phone,
      address: biz.address || '',
      upi: biz.upi || '',
      note: biz.note || '',
      status: biz.status || 'active',
      plan: biz.plan || 'free',
      isSuperAdmin: Number(biz.is_super_admin) === 1,
      since: biz.created_at,
    },
    services,
    products,
    customers,
    entries,
    tokens: {
      day,
      serving: tokensToday.find((t) => t.status === 'serving') || null,
      waiting: tokensToday.filter((t) => t.status === 'waiting'),
      done: tokensToday.filter((t) => t.status === 'done').length,
      doneList: tokensToday.filter((t) => t.status === 'done').reverse(),
      total: tokensToday.length,
      nextNo: lastNo + 1,
    },
    stats: {
      range: safeRange,
      jobs: s.jobs || 0,
      sales: s.sales || 0,
      purchases: s.purchases || 0,
      salePaise: s.sale || 0,
      grindingSalePaise: s.grinding_sale || 0,
      productSalePaise: s.product_sale || 0,
      purchasePaise: s.purchase_total || 0,
      cashPaise: netCashInHand,
      creditPaise: s.credit || 0,
      farmerPayablePaise,
      grossWeight: s.gross_weight || 0,
      lossG: s.loss_g || 0,
      netWeight: s.net_weight || 0,
      outstandingPaise,
      outstandingCount,
      byService: results[5].results.map((r) => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        count: r.count,
        grossWeight: r.gross_weight,
        lossG: r.loss_g || 0,
        netWeight: r.net_weight || 0,
        amountPaise: r.amount_paise,
      })),
    },
  };
}
