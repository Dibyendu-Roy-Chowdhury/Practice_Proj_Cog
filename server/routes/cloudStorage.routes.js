const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/cloudStorage.controller');

router.get('/status',              ctrl.getStatus);
router.get('/config',              ctrl.getConfig);
router.get('/records',             ctrl.listRecords);
router.get('/records/:recordId',   ctrl.getRecord);
router.post('/sync/:recordId',     requireAdmin, ctrl.syncRecord);

module.exports = router;
