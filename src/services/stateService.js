// Aggregated Multi-tenant Business State Service
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
      `SELECT id, name, unit, rate_paise, COALESCE(loss_rate_g, katoti_g, 0) AS loss_rate_g, sort
         FROM services WHERE business_id = ? AND active = 1 ORDER BY sort, name`
    ).bind(businessId),
    // 1: customers
    env.DB.prepare(
      `SELECT c.id, c.name, COALESCE(c.village, '') AS village, c.phone, c.created_at,
              COALESCE(SUM(CASE WHEN e.kind = 'job' AND e.paid = 0 THEN e.amount_paise
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
      `SELECT e.id, e.kind, e.customer_id, e.name, COALESCE(e.village, '') AS village, e.qty,
              COALESCE(e.loss_g, e.katoti_g, 0) AS loss_g, COALESCE(e.net_weight, e.net_qty) AS net_weight,
              e.rate_paise, e.amount_paise, e.paid, e.note, e.token_no, e.created_at,
              s.name AS service_name, s.unit AS unit
         FROM entries e
         LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
        WHERE e.business_id = ? AND ${entriesTimeCondition}
        ORDER BY e.created_at DESC
        LIMIT 400`
    ).bind(...entriesTimeBinds),
    // 3: tokens today
    env.DB.prepare(
      `SELECT id, no, name, COALESCE(village, '') AS village, service_id,
              COALESCE(qty, 0) AS qty, COALESCE(loss_g, katoti_g, 0) AS loss_g,
              COALESCE(net_weight, net_qty, 0) AS net_weight, status, created_at
         FROM tokens WHERE business_id = ? AND day = ? ORDER BY no`
    ).bind(businessId, day),
    // 4: summary stats for range
    env.DB.prepare(
      `SELECT COUNT(CASE WHEN kind = 'job' THEN 1 END) AS jobs,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN amount_paise ELSE 0 END), 0) AS sale,
              COALESCE(SUM(CASE WHEN kind = 'job' AND paid = 1 THEN amount_paise ELSE 0 END), 0) AS cash_jobs,
              COALESCE(SUM(CASE WHEN kind = 'payment' THEN amount_paise ELSE 0 END), 0) AS recovered,
              COALESCE(SUM(CASE WHEN kind = 'job' AND paid = 0 THEN amount_paise ELSE 0 END), 0) AS credit,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN qty ELSE 0 END), 0) AS qty,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN COALESCE(loss_g, katoti_g, 0) ELSE 0 END), 0) AS loss_g,
              COALESCE(SUM(CASE WHEN kind = 'job' THEN COALESCE(net_weight, net_qty, 0) ELSE 0 END), 0) AS net_weight
         FROM entries WHERE business_id = ? AND ${entriesTimeCondition.replace(/e\./g, '')}`
    ).bind(...entriesTimeBinds),
    // 5: breakdown by service for range
    env.DB.prepare(
      `SELECT e.service_id AS id, COALESCE(s.name, 'हटाई गई सेवा') AS name, COALESCE(s.unit, 'kg') AS unit,
              COUNT(*) AS count, COALESCE(SUM(e.qty), 0) AS qty,
              COALESCE(SUM(COALESCE(e.loss_g, e.katoti_g, 0)), 0) AS loss_g,
              COALESCE(SUM(COALESCE(e.net_weight, e.net_qty, 0)), 0) AS net_weight,
              COALESCE(SUM(e.amount_paise), 0) AS amount_paise
         FROM entries e LEFT JOIN services s ON s.id = e.service_id AND s.business_id = e.business_id
        WHERE e.business_id = ? AND ${entriesTimeCondition} AND e.kind = 'job'
        GROUP BY e.service_id
        ORDER BY amount_paise DESC`
    ).bind(...entriesTimeBinds),
    // 6: day counter
    env.DB.prepare('SELECT last_no FROM day_counters WHERE business_id = ? AND day = ?').bind(businessId, day),
    // 7: business info
    env.DB.prepare('SELECT id, name, phone, address, upi, note, created_at FROM businesses WHERE id = ?').bind(businessId),
  ]);

  const services = results[0].results.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    ratePaise: s.rate_paise,
    lossRateG: Number(s.loss_rate_g) || 0,
    katotiG: Number(s.loss_rate_g) || 0,
  }));

  const customers = results[1].results.map((c) => ({
    id: c.id,
    name: c.name,
    village: c.village || '',
    phone: c.phone || '',
    balancePaise: c.balance_paise || 0,
    lastAt: c.last_at || null,
  }));

  const entries = results[2].results.map((e) => {
    const lossG = Number(e.loss_g) || 0;
    const netWeight = e.net_weight != null ? Number(e.net_weight) : (e.qty ? Math.max(0, e.qty - (lossG / 1000)) : null);
    return {
      id: e.id,
      kind: e.kind,
      customerId: e.customer_id,
      name: e.name || '',
      village: e.village || '',
      qty: e.qty,
      lossG,
      katotiG: lossG,
      netWeight,
      netQty: netWeight,
      ratePaise: e.rate_paise,
      amountPaise: e.amount_paise,
      paid: !!e.paid,
      note: e.note || '',
      tokenNo: e.token_no,
      serviceName: e.service_name || '',
      unit: e.unit || 'kg',
      at: e.created_at,
    };
  });

  const tokensToday = results[3].results.map((t) => {
    const lossG = Number(t.loss_g) || 0;
    const netWeight = Number(t.net_weight) || 0;
    return {
      id: t.id,
      no: t.no,
      name: t.name,
      village: t.village || '',
      serviceId: t.service_id,
      qty: Number(t.qty) || 0,
      lossG,
      katotiG: lossG,
      netWeight,
      netQty: netWeight,
      status: t.status,
      at: t.created_at,
    };
  });

  const s = results[4].results[0] || {};
  const counter = results[6].results[0];
  const biz = results[7].results[0] || {};

  let outstandingPaise = 0;
  let outstandingCount = 0;
  for (const c of customers) {
    if (c.balancePaise > 0) {
      outstandingPaise += c.balancePaise;
      outstandingCount += 1;
    }
  }

  const maxTokenNo = tokensToday.reduce((m, t) => Math.max(m, t.no), 0);
  const lastNo = counter && counter.last_no ? counter.last_no : maxTokenNo;

  return {
    business: {
      id: biz.id,
      name: biz.name,
      phone: biz.phone,
      address: biz.address || '',
      upi: biz.upi || '',
      note: biz.note || '',
      since: biz.created_at,
    },
    services,
    customers,
    entries,
    tokens: {
      day,
      serving: tokensToday.find((t) => t.status === 'serving') || null,
      waiting: tokensToday.filter((t) => t.status === 'waiting'),
      done: tokensToday.filter((t) => t.status === 'done').length,
      total: tokensToday.length,
      nextNo: lastNo + 1,
    },
    stats: {
      range: safeRange,
      jobs: s.jobs || 0,
      salePaise: s.sale || 0,
      cashPaise: (s.cash_jobs || 0) + (s.recovered || 0),
      creditPaise: s.credit || 0,
      qty: s.qty || 0,
      lossG: s.loss_g || 0,
      katotiG: s.loss_g || 0,
      netWeight: s.net_weight || 0,
      netQty: s.net_weight || 0,
      outstandingPaise,
      outstandingCount,
      byService: results[5].results.map((r) => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        count: r.count,
        qty: r.qty,
        lossG: r.loss_g || 0,
        katotiG: r.loss_g || 0,
        netWeight: r.net_weight || 0,
        netQty: r.net_weight || 0,
        amountPaise: r.amount_paise,
      })),
    },
  };
}
