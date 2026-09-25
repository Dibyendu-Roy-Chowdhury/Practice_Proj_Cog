const router = require('express').Router();
const ctrl   = require('../controllers/logs.controller');
router.get('/',              ctrl.getPortalLogs);
router.post('/sync',         ctrl.syncLogs);
router.post('/sync/:agent',  ctrl.syncAgentLogs);
module.exports = router;
