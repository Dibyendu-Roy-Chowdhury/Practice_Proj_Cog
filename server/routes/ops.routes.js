const router              = require('express').Router();
const ctrl                = require('../controllers/ops.controller');
const { requireAdmin }    = require('../middleware/auth');

router.post('/execute',      requireAdmin, ctrl.executeOpTask);
router.post('/fleet-reboot', requireAdmin, ctrl.fleetReboot);
router.post('/cache-purge',  requireAdmin, ctrl.cachePurge);
router.post('/rotate-key',   requireAdmin, ctrl.rotateKey);
module.exports = router;
