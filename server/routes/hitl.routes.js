const router = require('express').Router();
const ctrl   = require('../controllers/hitl.controller');
router.get('/queue',   ctrl.getQueue);
router.get('/history', ctrl.getHistory);
module.exports = router;
