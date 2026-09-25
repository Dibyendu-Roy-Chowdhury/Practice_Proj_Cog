/**
 * tenantContext — LOB isolation middleware
 *
 * Extracts the X-Tenant-ID header sent by the frontend (wired in Phase B),
 * validates it against the platform's known tenant registry, and attaches:
 *
 *   req.tenantId     — the validated tenant string (e.g. 'arcadia-health')
 *   req.tenantFilter — a Mongoose query fragment: {} for the demo/admin
 *                      tenant (cross-tenant visibility), or
 *                      { tenant_id: req.tenantId } for all others.
 *
 * This middleware runs after auth so req.user is already populated.
 * Controllers add req.tenantFilter to every find() / findOne() call to
 * enforce row-level LOB isolation without duplicating logic in each handler.
 */

const KNOWN_TENANTS = new Set([
  'demo',              // VeriForge platform admin (cross-tenant admin view)
  'arcadia-health',    // Arcadia Health AI — Clinical AI, HIPAA, ISO 42001
  'zenith-capital',    // Zenith Capital AI  — Algo trading, SEC, SOC 2
]);

const tenantContext = (req, res, next) => {
  const raw = (req.headers['x-tenant-id'] || '').trim().toLowerCase();

  // Fall back to 'demo' if header is absent or unrecognised.
  req.tenantId = KNOWN_TENANTS.has(raw) ? raw : 'demo';

  // The 'demo' tenant acts as the Cognizant platform-admin view:
  // it can see all documents regardless of tenant_id.
  // All other tenants are strictly scoped to their own data.
  req.tenantFilter = req.tenantId === 'demo' ? {} : { tenant_id: req.tenantId };

  next();
};

module.exports = { tenantContext, KNOWN_TENANTS };
