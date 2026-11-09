// Self-healing database schema migration for Cloudflare D1 / SQLite
let schemaInitialized = false;

export async function ensureSchema(env) {
  if (schemaInitialized) return;

  // Customers table: village columns for 2-entity identification
  try {
    await env.DB.exec("ALTER TABLE customers ADD COLUMN village TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec("ALTER TABLE customers ADD COLUMN village_key TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec("ALTER TABLE entries ADD COLUMN village TEXT NOT NULL DEFAULT '';");
  } catch (e) {}
  try {
    await env.DB.exec("ALTER TABLE tokens ADD COLUMN village TEXT NOT NULL DEFAULT '';");
  } catch (e) {}

  // Services table: loss / wastage deduction rate per unit in grams
  try {
    await env.DB.exec('ALTER TABLE services ADD COLUMN loss_rate_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE services ADD COLUMN katoti_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}

  // Entries table: total loss in grams and net weight
  try {
    await env.DB.exec('ALTER TABLE entries ADD COLUMN loss_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE entries ADD COLUMN katoti_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE entries ADD COLUMN net_weight REAL;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE entries ADD COLUMN net_qty REAL;');
  } catch (e) {}

  // Tokens table: weight, loss and net output
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN qty REAL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN loss_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN katoti_g REAL NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN net_weight REAL DEFAULT 0;');
  } catch (e) {}
  try {
    await env.DB.exec('ALTER TABLE tokens ADD COLUMN net_qty REAL DEFAULT 0;');
  } catch (e) {}

  // Sync loss_rate_g from legacy katoti_g if present
  try {
    await env.DB.exec('UPDATE services SET loss_rate_g = katoti_g WHERE loss_rate_g = 0 AND katoti_g > 0;');
  } catch (e) {}

  schemaInitialized = true;
}
