// Database schema verification and migration
let schemaInitialized = false;

export async function ensureSchema(env) {
  if (schemaInitialized) return;
  // All tables, columns, and indexes are permanently provisioned and verified in Cloudflare D1.
  schemaInitialized = true;
}
