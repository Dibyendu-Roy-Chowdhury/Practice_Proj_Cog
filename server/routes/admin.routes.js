const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth');
router.get('/users', requireAdmin, ctrl.getUsers);
module.exports = router;
