const CloudStorageRecord = require('../models/CloudStorageRecord');
const { checkHealth, getConfiguredProviders, fanOut } = require('../services/cloud/MultiCloudStorage');

exports.getStatus = async (_req, res, next) => {
  try {
    const health    = await checkHealth();
    const providers = getConfiguredProviders();
    res.json({ status: 'success', configured_providers: providers, health });
  } catch (err) { next(err); }
};

exports.getConfig = (req, res) => {
  res.json({ status: 'success', configured_providers: getConfiguredProviders() });
};

exports.listRecords = async (req, res, next) => {
  try {
    const { recordType, limit = 50 } = req.query;
    const query = { ...req.tenantFilter };
    if (recordType) query.record_type = recordType;
    const records = await CloudStorageRecord.find(query)
      .sort({ created_at: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200))
      .lean();
    res.json({ status: 'success', records });
  } catch (err) { next(err); }
};

exports.getRecord = async (req, res, next) => {
  try {
    const record = await CloudStorageRecord.findOne({ ...req.tenantFilter, record_id: req.params.recordId }).lean();
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json({ status: 'success', record });
  } catch (err) { next(err); }
};

exports.syncRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const record = await CloudStorageRecord.findOne({ ...req.tenantFilter, record_id: recordId });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const failedProviders = ['aws', 'azure', 'gcp'].filter(p => record.sync_state[p]?.status === 'failed');
    if (!failedProviders.length) {
      return res.json({ status: 'success', message: 'No failed providers — nothing to retry', record_id: recordId });
    }
    // Re-sync requires fresh data from the caller
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'data is required to re-sync' });

    const result = await fanOut({
      key:        record.storage_key,
      data:       typeof data === 'object' ? JSON.stringify(data) : data,
      recordType: record.record_type,
      sourceId:   record.source_id,
      tenantId:   req.tenantId,
    });
    res.json({ status: 'success', ...result });
  } catch (err) { next(err); }
};
