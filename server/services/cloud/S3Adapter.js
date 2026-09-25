/**
 * S3Adapter.js
 * AWS S3 implementation of CloudStorageAdapter.
 * Uses the AWS SDK v3 (@aws-sdk/client-s3).
 * The SDK is required lazily so the server starts without it if AWS is not configured.
 */

const CloudStorageAdapter = require('./CloudStorageAdapter');

class S3Adapter extends CloudStorageAdapter {
  /**
   * @param {object} config
   * @param {string} config.bucket       - S3 bucket name
   * @param {string} config.region       - AWS region (e.g. 'us-east-1')
   * @param {string} [config.accessKeyId]
   * @param {string} [config.secretAccessKey]
   * @param {string} [config.endpoint]   - custom endpoint for LocalStack / MinIO
   */
  constructor(config) {
    super(config);
    this.provider = 'aws';
    if (!config.bucket) throw new Error('S3Adapter: config.bucket is required');
    this._client = null;
  }

  _getClient() {
    if (this._client) return this._client;
    // Lazy-load so missing SDK does not crash startup
    let S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand;
    try {
      ({ S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } =
        require('@aws-sdk/client-s3'));
    } catch {
      throw new Error('S3Adapter: @aws-sdk/client-s3 is not installed. Run: npm install @aws-sdk/client-s3');
    }
    const opts = { region: this.config.region || 'us-east-1' };
    if (this.config.accessKeyId && this.config.secretAccessKey) {
      opts.credentials = { accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey };
    }
    if (this.config.endpoint) opts.endpoint = this.config.endpoint;
    this._client = new S3Client(opts);
    this._cmds   = { PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand };
    return this._client;
  }

  async write(key, data, metadata = {}) {
    const client = this._getClient();
    const { PutObjectCommand } = this._cmds;
    await client.send(new PutObjectCommand({
      Bucket:   this.config.bucket,
      Key:      key,
      Body:     typeof data === 'string' ? Buffer.from(data) : data,
      Metadata: Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)])),
      ContentType: metadata.contentType || 'application/json',
    }));
    return { uri: `s3://${this.config.bucket}/${key}`, provider: 'aws', key };
  }

  async read(key) {
    const client = this._getClient();
    const { GetObjectCommand } = this._cmds;
    const resp = await client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    const chunks = [];
    for await (const chunk of resp.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async exists(key) {
    try {
      const client = this._getClient();
      const { HeadObjectCommand } = this._cmds;
      await client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }

  async list(prefix) {
    const client = this._getClient();
    const { ListObjectsV2Command } = this._cmds;
    const resp = await client.send(new ListObjectsV2Command({ Bucket: this.config.bucket, Prefix: prefix }));
    return (resp.Contents || []).map(o => o.Key);
  }

  async delete(key) {
    const client = this._getClient();
    const { DeleteObjectCommand } = this._cmds;
    await client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  async health() {
    const t0 = Date.now();
    try {
      await this.exists('__veriforge_health_probe__');
      return { provider: 'aws', status: 'ok', latency_ms: Date.now() - t0 };
    } catch (err) {
      return { provider: 'aws', status: 'error', latency_ms: Date.now() - t0, error: err.message };
    }
  }
}

module.exports = S3Adapter;
