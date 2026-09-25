const router = require('express').Router();
const ctrl   = require('../controllers/deploy.controller');
router.get('/',              ctrl.getDeployments);
router.get('/timeline',      ctrl.getTimeline);
router.get('/environments',  ctrl.getEnvironments);
module.exports = router;
