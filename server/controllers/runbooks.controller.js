const Runbook = require('../models/Runbook');

exports.getRunbook = async (req, res, next) => {
  try {
    const rb = await Runbook.findOne({ runbook_id: req.params.id }).lean();
    if (!rb) return res.status(404).json({ detail: `Runbook '${req.params.id}' not found` });
    res.json({
      id: rb.runbook_id, title: rb.title, severity: rb.severity,
      personas: rb.personas, triggers: rb.triggers,
      steps: rb.steps.map(s => ({ title: s.title, desc: s.desc, command: s.command, verify: s.verify, executable: s.executable || false })),
      escalation: rb.escalation, relatedIncidents: rb.related_incidents,
    });
  } catch (err) { next(err); }
};
