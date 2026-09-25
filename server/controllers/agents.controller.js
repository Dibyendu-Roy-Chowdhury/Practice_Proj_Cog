const Agent = require('../models/Agent');
const { tagComplianceEvent } = require('../services/complianceTagger');

exports.listAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find(req.tenantFilter).select('-__v').lean();
    res.json({ status: 'success', agents });
  } catch (err) { next(err); }
};

exports.listActiveAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find({ ...req.tenantFilter, status: 'Active' }).select('-__v').lean();
    res.json({ status: 'success', agents });
  } catch (err) { next(err); }
};

exports.getAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ ...req.tenantFilter, agent_id: req.params.agentId }).select('-__v').lean();
    if (!agent) return res.status(404).json({ detail: 'Agent not found' });
    res.json({ status: 'success', agent });
  } catch (err) { next(err); }
};

exports.getVersionHistory = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ agent_id: req.params.agentId }).select('name versionHistory').lean();
    if (!agent) return res.status(404).json({ detail: 'Agent not found' });
    res.json({ status: 'success', agent_id: req.params.agentId, name: agent.name, version_history: agent.versionHistory });
  } catch (err) { next(err); }
};

exports.registerAgent = async (req, res, next) => {
  try {
    // Whitelist accepted fields — prevents arbitrary field injection into the document.
    const ALLOWED = ['name', 'arn', 'arn_id', 'desc', 'description', 'role', 'cloud_provider',
                     'model_id', 'log_group', 'log_stream', 'crossAccount', 'cloud_account_id', 'cloud_region'];
    const body = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));

    if (!body.name) return res.status(400).json({ detail: 'Agent name is required' });

    const count  = await Agent.countDocuments();
    const newId  = `agent-${String(count + 1).padStart(3, '0')}`;
    const now    = new Date().toISOString();
    const username = req.user?.username || 'admin';
    const snapshot = {
      version: 1, version_string: 'v1', change_type: 'create', changed_fields: [],
      snapshot_date: now, updated_by: username,
      desc: body.desc || body.description || '',
      model_id: body.model_id || '',
    };
    const agent = new Agent({
      ...body,
      agent_id: newId, id: newId,
      desc: body.description || body.desc || '',
      status: 'Active',
      version: 1, version_string: 'v1', change_type: 'create', changed_fields: [],
      created_by: username, updated_by: username,
      created_at: now, updated_at: now,
      versionHistory: [snapshot],
    });
    await agent.save();
    res.json({ status: 'success', agent_id: newId, version: 'v1', message: `Agent "${body.name}" registered successfully.` });
  } catch (err) { next(err); }
};

exports.updateAgent = async (req, res, next) => {
  try {
    const existing = await Agent.findOne({ agent_id: req.params.agentId });
    if (!existing) return res.status(404).json({ detail: 'Agent not found' });
    const coreFields = ['name', 'arn', 'arn_id', 'desc', 'description', 'role', 'model_id', 'log_group', 'log_stream'];
    const changedFields = coreFields.filter(f => req.body[f] !== undefined && String(req.body[f]) !== String(existing[f]));
    if (!changedFields.length) return res.json({ status: 'success', message: 'No changes detected', version: existing.version_string });
    const newVersion = existing.version + 1;
    const now = new Date().toISOString();
    const username = req.user?.username || 'system';
    const snapshot = { version: newVersion, version_string: `v${newVersion}`, change_type: 'update', changed_fields: changedFields, snapshot_date: now, updated_by: username, desc: req.body.desc || req.body.description || existing.desc, model_id: req.body.model_id || existing.model_id };
    // Only merge whitelisted fields to prevent arbitrary field injection.
    const ALLOWED = ['name', 'arn', 'arn_id', 'desc', 'description', 'role', 'model_id', 'log_group', 'log_stream'];
    const safeBody = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    Object.assign(existing, safeBody, { desc: req.body.description || req.body.desc || existing.desc, version: newVersion, version_string: `v${newVersion}`, change_type: 'update', changed_fields: changedFields, updated_by: username, updated_at: now });
    existing.versionHistory.push(snapshot);
    await existing.save();
    res.json({ status: 'success', message: `Agent updated to v${newVersion}`, version: `v${newVersion}` });
  } catch (err) { next(err); }
};

exports.updateAgentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: `Invalid status '${status}'. Must be 'Active' or 'Inactive'.` });
    }
    const username = req.user?.username || 'system';
    const agent = await Agent.findOneAndUpdate({ agent_id: req.params.agentId }, { status, updated_by: username, updated_at: new Date().toISOString() }, { new: true });
    if (!agent) return res.status(404).json({ detail: 'Agent not found' });
    res.json({ status: 'success', message: `Agent status updated to ${status}` });
  } catch (err) { next(err); }
};

exports.rollbackAgent = async (req, res, next) => {
  try {
    const { targetVersion } = req.body;
    const existing = await Agent.findOne({ agent_id: req.params.agentId });
    if (!existing) return res.status(404).json({ detail: 'Agent not found' });
    const targetSnap = existing.versionHistory.find(v => v.version === targetVersion || v.version_string === targetVersion);
    if (!targetSnap) return res.status(404).json({ detail: `Version ${targetVersion} not found` });
    const newVersion = existing.version + 1;
    const now = new Date().toISOString();
    const username = req.user?.username || 'system';
    const rollbackEntry = { version: newVersion, version_string: `v${newVersion}`, change_type: 'rollback', changed_fields: [], snapshot_date: now, updated_by: username, desc: `Rolled back to ${targetSnap.version_string}`, model_id: targetSnap.model_id || existing.model_id };
    existing.desc = targetSnap.desc || existing.desc;
    existing.model_id = targetSnap.model_id || existing.model_id;
    existing.version = newVersion; existing.version_string = `v${newVersion}`;
    existing.change_type = 'rollback'; existing.updated_by = username; existing.updated_at = now;
    existing.versionHistory.push(rollbackEntry);
    await existing.save();
    tagComplianceEvent({
      eventType: 'agent.rollback', sourceModel: 'Agent', sourceId: existing.agent_id,
      agentId: existing.agent_id, agentName: existing.name, tenantId: existing.tenant_id,
      evidence: { from_version: existing.version_string, to_version: targetSnap.version_string, rolled_back_by: username },
    });
    res.json({ status: 'success', message: `Agent rolled back to ${targetSnap.version_string} (now at v${newVersion})`, version: `v${newVersion}` });
  } catch (err) { next(err); }
};
