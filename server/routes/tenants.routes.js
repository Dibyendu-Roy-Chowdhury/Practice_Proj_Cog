const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/tenants.controller');

router.get('/',    requireAdmin, ctrl.listTenants);
router.get('/:tenantId', requireAdmin, ctrl.getTenant);

module.exports = router;
