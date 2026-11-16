// Shop Expense Tracking Controller for TolMaal
import { readJson, json, bad } from '../utils/response.js';
import { clean, dayKey } from '../utils/helpers.js';
import { buildState } from '../services/stateService.js';

export const EXPENSE_CATEGORIES = {
  diesel: '⛽ डीज़ल',
  electricity: '⚡ बिजली',
  labor: '👷 मजदूरी',
  tea: '☕ चाय-नाश्ता',
  maintenance: '🔧 मरम्मत/ग्रीस',
  other: '📦 अन्य खर्चा'
};

export async function createExpense(request, env, business, range) {
  const body = await readJson(request);
  const category = clean(body.category, 40) || 'other';
  const amountPaise = Math.round(Number(body.amount) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return bad('सही खर्च रकम भरें');
  if (amountPaise > 100000000) return bad('रकम बहुत ज़्यादा है');

  const paymentMode = clean(body.paymentMode || body.payment_mode || 'cash', 20);
  const note = clean(body.note, 200);
  const now = Date.now();
  const day = clean(body.day, 20) || dayKey(now);
  const id = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO expenses (id, business_id, category, amount_paise, payment_mode, note, day, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, business.id, category, amountPaise, paymentMode, note, day, now)
    .run();

  return json({ ok: true, id, state: await buildState(env, business.id, range) });
}

export async function deleteExpense(request, env, business, range) {
  const body = await readJson(request);
  const id = clean(body.id, 40);
  await env.DB.prepare('DELETE FROM expenses WHERE id = ? AND business_id = ?')
    .bind(id, business.id)
    .run();

  return json({ ok: true, state: await buildState(env, business.id, range) });
}

export async function getExpenses(request, env, business, url) {
  const day = clean(url.searchParams.get('day'), 20) || dayKey();
  const rows = await env.DB.prepare(
    `SELECT id, category, amount_paise, payment_mode, note, day, created_at
       FROM expenses
      WHERE business_id = ? AND day = ?
      ORDER BY created_at DESC`
  )
    .bind(business.id, day)
    .all();

  return json({
    ok: true,
    day,
    expenses: rows.results.map((e) => ({
      id: e.id,
      category: e.category,
      categoryLabel: EXPENSE_CATEGORIES[e.category] || e.category,
      amountPaise: e.amount_paise,
      paymentMode: e.payment_mode,
      note: e.note,
      day: e.day,
      at: e.created_at,
    })),
  });
}
