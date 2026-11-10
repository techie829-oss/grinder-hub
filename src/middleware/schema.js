// Database schema verification and migration
let schemaInitialized = false;

export async function ensureSchema(env) {
  if (schemaInitialized) return;

  // Customers: ensure 2-entity verification columns
  try {
    await env.DB.exec("ALTER TABLE customers ADD COLUMN village TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec("ALTER TABLE customers ADD COLUMN village_key TEXT NOT NULL DEFAULT '';");
  } catch (e) {}

  // Services: loss_rate_g (deduction per unit in grams)
  try {
    await env.DB.exec('ALTER TABLE services ADD COLUMN loss_rate_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}

  // Entries: single clean columns
  try {
    await env.DB.exec("ALTER TABLE entries ADD COLUMN village TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE entries ADD COLUMN gross_weight REAL;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE entries ADD COLUMN loss_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE entries ADD COLUMN net_weight REAL;');
  } catch (e) {}

  // If gross_weight is null but legacy qty existed, populate gross_weight
  try {
    await env.DB.exec('UPDATE entries SET gross_weight = qty WHERE gross_weight IS NULL AND qty IS NOT NULL;');
  } catch (e) {}

  // Tokens: single clean columns
  try {
    await env.DB.exec("ALTER TABLE tokens ADD COLUMN village TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec("ALTER TABLE tokens ADD COLUMN phone TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN gross_weight REAL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN loss_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN net_weight REAL DEFAULT 0;');
  } catch (e) {}

  // Populate token gross_weight from legacy qty if present
  try {
    await env.DB.exec('UPDATE tokens SET gross_weight = qty WHERE (gross_weight IS NULL OR gross_weight = 0) AND qty > 0;');
  } catch (e) {}

  // Businesses: Tenant management columns
  try {
    await env.DB.exec("ALTER TABLE businesses ADD COLUMN email TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec("ALTER TABLE businesses ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
  } catch (e) {}
  try {
    await env.DB.exec("ALTER TABLE businesses ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';");
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE businesses ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE businesses ADD COLUMN last_active_at INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {}

  schemaInitialized = true;
}
