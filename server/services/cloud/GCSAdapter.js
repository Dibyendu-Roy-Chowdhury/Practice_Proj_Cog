/**
 * GCSAdapter.js
 * Google Cloud Storage implementation of CloudStorageAdapter.
 * Uses @google-cloud/storage (lazily required).
 */

const CloudStorageAdapter = require('./CloudStorageAdapter');

class GCSAdapter extends CloudStorageAdapter {
  /**
   * @param {object} config
   * @param {string} config.bucketName         - GCS bucket name
   * @param {string} [config.projectId]        - GCP project ID
   * @param {string} [config.keyFilename]      - path to service account JSON
   * @param {object} [config.credentials]      - inline service account credentials
   */
  constructor(config) {
    super(config);
    this.provider = 'gcp';
    if (!config.bucketName) throw new Error('GCSAdapter: config.bucketName is required');
    this._bucket = null;
  }

  _getBucket() {
    if (this._bucket) return this._bucket;
    let Storage;
    try {
      ({ Storage } = require('@google-cloud/storage'));
    } catch {
      throw new Error('GCSAdapter: @google-cloud/storage is not installed. Run: npm install @google-cloud/storage');
    }
    const opts = {};
    if (this.config.projectId)   opts.projectId   = this.config.projectId;
    if (this.config.keyFilename) opts.keyFilename  = this.config.keyFilename;
    if (this.config.credentials) opts.credentials  = this.config.credentials;
    const storage = new Storage(opts);
    this._bucket  = storage.bucket(this.config.bucketName);
    return this._bucket;
  }

  async write(key, data, metadata = {}) {
    const bucket = this._getBucket();
    const file   = bucket.file(key);
    const buf    = typeof data === 'string' ? Buffer.from(data) : data;
    await file.save(buf, {
      contentType: metadata.contentType || 'application/json',
      metadata:    { metadata },
    });
    return { uri: `gs://${this.config.bucketName}/${key}`, provider: 'gcp', key };
  }

  async read(key) {
    const bucket = this._getBucket();
    const [buf]  = await bucket.file(key).download();
    return buf;
  }

  async exists(key) {
    const bucket     = this._getBucket();
    const [fileExists] = await bucket.file(key).exists();
    return fileExists;
  }

  async list(prefix) {
    const bucket = this._getBucket();
    const [files] = await bucket.getFiles({ prefix });
    return files.map(f => f.name);
  }

  async delete(key) {
    const bucket = this._getBucket();
    await bucket.file(key).delete({ ignoreNotFound: true });
  }

  async health() {
    const t0 = Date.now();
    try {
      await this.exists('__veriforge_health_probe__');
      return { provider: 'gcp', status: 'ok', latency_ms: Date.now() - t0 };
    } catch (err) {
      return { provider: 'gcp', status: 'error', latency_ms: Date.now() - t0, error: err.message };
    }
  }
}

module.exports = GCSAdapter;
