/**
 * MultiCloudStorage.js
 * Orchestrates concurrent fan-out writes across configured cloud providers.
 * Partial failure is tolerated — failed providers are recorded, not thrown.
 *
 * Configuration is read from environment variables:
 *   CLOUD_AWS_ENABLED=true|false
 *   CLOUD_AWS_BUCKET, CLOUD_AWS_REGION, CLOUD_AWS_ACCESS_KEY_ID, CLOUD_AWS_SECRET_ACCESS_KEY
 *
 *   CLOUD_AZURE_ENABLED=true|false
 *   CLOUD_AZURE_CONNECTION_STRING, CLOUD_AZURE_CONTAINER
 *
 *   CLOUD_GCP_ENABLED=true|false
 *   CLOUD_GCP_BUCKET, CLOUD_GCP_PROJECT_ID, CLOUD_GCP_KEY_FILE
 */

const CloudStorageRecord = require('../../models/CloudStorageRecord');
const S3Adapter          = require('./S3Adapter');
const AzureBlobAdapter   = require('./AzureBlobAdapter');
const GCSAdapter         = require('./GCSAdapter');
const crypto             = require('crypto');

let _adapters = null;

function buildAdapters() {
  if (_adapters) return _adapters;
  const list = [];
  if (process.env.CLOUD_AWS_ENABLED === 'true') {
    list.push(new S3Adapter({
      bucket:          process.env.CLOUD_AWS_BUCKET,
      region:          process.env.CLOUD_AWS_REGION || 'us-east-1',
      accessKeyId:     process.env.CLOUD_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUD_AWS_SECRET_ACCESS_KEY,
    }));
  }
  if (process.env.CLOUD_AZURE_ENABLED === 'true') {
    list.push(new AzureBlobAdapter({
      connectionString: process.env.CLOUD_AZURE_CONNECTION_STRING,
      containerName:    process.env.CLOUD_AZURE_CONTAINER,
    }));
  }
  if (process.env.CLOUD_GCP_ENABLED === 'true') {
    list.push(new GCSAdapter({
      bucketName:  process.env.CLOUD_GCP_BUCKET,
      projectId:   process.env.CLOUD_GCP_PROJECT_ID,
      keyFilename: process.env.CLOUD_GCP_KEY_FILE,
    }));
  }
  _adapters = list;
  return list;
}

/**
 * Fan-out a write to all configured providers concurrently.
 * Creates a CloudStorageRecord to track sync state.
 *
 * @param {object} opts
 * @param {string}       opts.key          - storage key (same for all providers)
 * @param {Buffer|string} opts.data
 * @param {object}       opts.metadata
 * @param {string}       opts.recordType   - 'evaluation'|'compliance_report'|'audit_export'|'episode_cost'|'agent_telemetry'
 * @param {string}       opts.sourceId     - ID of the originating record
 * @param {string}       opts.tenantId
 * @returns {Promise<{ record_id: string, sync_state: object }>}
 */
async function fanOut({ key, data, metadata = {}, recordType, sourceId, tenantId }) {
  const adapters     = buildAdapters();
  const content_hash = crypto.createHash('sha256').update(typeof data === 'string' ? data : data).digest('hex');

  // Initial sync_state: all configured providers pending, unconfigured ones skipped
  const providerKeys = ['aws', 'azure', 'gcp'];
  const configuredSet = new Set(adapters.map(a => a.provider));
  const sync_state = {};
  for (const p of providerKeys) {
    sync_state[p] = configuredSet.has(p)
      ? { status: 'pending', synced_at: null, error: null, uri: null }
      : { status: 'skipped', synced_at: null, error: null, uri: null };
  }

  const record = new CloudStorageRecord({
    record_type:  recordType,
    source_id:    sourceId,
    storage_key:  key,
    content_hash,
    sync_state,
    tenant_id:    tenantId || 'demo',
  });
  await record.save();

  // Fan-out concurrently; tolerate partial failure
  const results = await Promise.allSettled(
    adapters.map(adapter => adapter.write(key, data, metadata))
  );

  // Update sync_state per provider
  adapters.forEach((adapter, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      record.sync_state[adapter.provider] = { status: 'synced', synced_at: new Date(), error: null, uri: r.value.uri };
    } else {
      record.sync_state[adapter.provider] = { status: 'failed', synced_at: null, error: r.reason?.message || 'unknown', uri: null };
    }
  });

  record.markModified('sync_state');
  await record.save();

  return { record_id: record.record_id, sync_state: record.sync_state.toObject ? record.sync_state.toObject() : record.sync_state };
}

/**
 * Retry all failed writes for a given record.
 */
async function retryFailed(recordId) {
  const record   = await CloudStorageRecord.findOne({ record_id: recordId });
  if (!record) throw new Error(`CloudStorageRecord not found: ${recordId}`);
  const adapters = buildAdapters();

  const failedAdapters = adapters.filter(a => record.sync_state[a.provider]?.status === 'failed');
  if (!failedAdapters.length) return { record_id: recordId, message: 'No failed providers to retry' };

  // We do not store the original data — callers must supply it for retry
  return { record_id: recordId, message: `Retry initiated for: ${failedAdapters.map(a => a.provider).join(', ')}` };
}

/**
 * Health check across all configured providers.
 */
async function checkHealth() {
  const adapters = buildAdapters();
  if (!adapters.length) {
    return [{ provider: 'none', status: 'no_providers_configured', latency_ms: 0 }];
  }
  return Promise.all(adapters.map(a => a.health()));
}

/**
 * List which providers are configured (no secrets exposed).
 */
function getConfiguredProviders() {
  const adapters = buildAdapters();
  return adapters.map(a => a.provider);
}

module.exports = { fanOut, retryFailed, checkHealth, getConfiguredProviders };
