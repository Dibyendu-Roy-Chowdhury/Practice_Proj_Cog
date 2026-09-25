const router = require('express').Router();
const ctrl   = require('../controllers/cicd.controller');
router.get('/pipeline', ctrl.getPipelineData);
module.exports = router;
