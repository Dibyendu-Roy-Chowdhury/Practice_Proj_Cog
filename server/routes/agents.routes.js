const router              = require('express').Router();
const ctrl                = require('../controllers/agents.controller');
const { requireAdmin }    = require('../middleware/auth');

router.get('/',                       ctrl.listAgents);
router.get('/active',                 ctrl.listActiveAgents);
router.get('/:agentId',               ctrl.getAgent);
router.get('/:agentId/history',       ctrl.getVersionHistory);
router.post('/',                      ctrl.registerAgent);
router.patch('/:agentId',             ctrl.updateAgent);
router.patch('/:agentId/status',      requireAdmin, ctrl.updateAgentStatus);
router.post('/:agentId/rollback',     ctrl.rollbackAgent);
module.exports = router;
