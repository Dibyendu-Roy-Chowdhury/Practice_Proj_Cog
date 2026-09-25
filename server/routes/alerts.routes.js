const router = require('express').Router();
const ctrl   = require('../controllers/alerts.controller');
router.get('/critical', ctrl.getCritical);
router.get('/warnings', ctrl.getWarnings);
module.exports = router;
