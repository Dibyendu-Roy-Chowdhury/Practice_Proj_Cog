const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/compliance.controller');

router.get ('/events',                   ctrl.listEvents);
router.get ('/events/:ceId',             ctrl.getEvent);
router.get ('/summary',                  ctrl.getSummary);
router.get ('/controls',                 ctrl.getControlMap);
router.post('/reports',                  requireAdmin, ctrl.generateReport);
router.get ('/reports/:reportId/csv',    requireAdmin, ctrl.downloadReportCsv);

module.exports = router;
