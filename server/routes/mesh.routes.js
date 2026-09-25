const router              = require('express').Router();
const ctrl                = require('../controllers/mesh.controller');
const { requireAdmin }    = require('../middleware/auth');

router.get('/topology',                       ctrl.getTopology);
router.get('/messages',                       ctrl.getMessages);
router.get('/loops',                          ctrl.getLoops);
router.get('/consistency',                    ctrl.getSemanticConsistency);
router.get('/quarantine',                     ctrl.getQuarantine);
router.post('/quarantine',        requireAdmin, ctrl.quarantineAgent);
router.delete('/quarantine/:agentId', requireAdmin, ctrl.liftQuarantine);
router.get('/routing',                        ctrl.getRoutingRules);
router.patch('/routing/:id',      requireAdmin, ctrl.updateRoutingRule);
module.exports = router;
