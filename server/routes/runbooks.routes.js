const router = require('express').Router();
const ctrl   = require('../controllers/runbooks.controller');
router.get('/:id', ctrl.getRunbook);
module.exports = router;
