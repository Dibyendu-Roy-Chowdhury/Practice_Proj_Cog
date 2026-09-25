const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
router.post('/login',    ctrl.login);
router.post('/sso',      ctrl.sso);
router.post('/validate', ctrl.validate);
router.post('/logout',   ctrl.logout);
module.exports = router;
