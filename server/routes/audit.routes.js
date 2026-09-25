const router = require('express').Router();
const ctrl   = require('../controllers/audit.controller');
router.get('/traces', ctrl.getTraces);
module.exports = router;
