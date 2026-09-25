/**
 * AzureBlobAdapter.js
 * Azure Blob Storage implementation of CloudStorageAdapter.
 * Uses @azure/storage-blob (lazily required).
 */

const CloudStorageAdapter = require('./CloudStorageAdapter');

class AzureBlobAdapter extends CloudStorageAdapter {
  /**
   * @param {object} config
   * @param {string} config.connectionString  - Azure Storage connection string
   * @param {string} config.containerName     - Blob container name
   */
  constructor(config) {
    super(config);
    this.provider = 'azure';
    if (!config.connectionString) throw new Error('AzureBlobAdapter: config.connectionString is required');
    if (!config.containerName)    throw new Error('AzureBlobAdapter: config.containerName is required');
    this._containerClient = null;
  }

  _getContainer() {
    if (this._containerClient) return this._containerClient;
    let BlobServiceClient;
    try {
      ({ BlobServiceClient } = require('@azure/storage-blob'));
    } catch {
      throw new Error('AzureBlobAdapter: @azure/storage-blob is not installed. Run: npm install @azure/storage-blob');
    }
    const serviceClient = BlobServiceClient.fromConnectionString(this.config.connectionString);
    this._containerClient = serviceClient.getContainerClient(this.config.containerName);
    return this._containerClient;
  }

  async write(key, data, metadata = {}) {
    const container  = this._getContainer();
    const blobClient = container.getBlockBlobClient(key);
    const buf        = typeof data === 'string' ? Buffer.from(data) : data;
    await blobClient.uploadData(buf, {
      blobHTTPHeaders: { blobContentType: metadata.contentType || 'application/json' },
      metadata: Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k.replace(/-/g, '_'), String(v)])),
    });
    return { uri: `https://${blobClient.accountName}.blob.core.windows.net/${this.config.containerName}/${key}`, provider: 'azure', key };
  }

  async read(key) {
    const container  = this._getContainer();
    const blobClient = container.getBlobClient(key);
    const resp       = await blobClient.download(0);
    const chunks     = [];
    for await (const chunk of resp.readableStreamBody) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async exists(key) {
    const container  = this._getContainer();
    const blobClient = container.getBlobClient(key);
    return blobClient.exists();
  }

  async list(prefix) {
    const container = this._getContainer();
    const keys      = [];
    for await (const blob of container.listBlobsFlat({ prefix })) {
      keys.push(blob.name);
    }
    return keys;
  }

  async delete(key) {
    const container  = this._getContainer();
    const blobClient = container.getBlobClient(key);
    await blobClient.deleteIfExists();
  }

  async health() {
    const t0 = Date.now();
    try {
      await this.exists('__veriforge_health_probe__');
      return { provider: 'azure', status: 'ok', latency_ms: Date.now() - t0 };
    } catch (err) {
      return { provider: 'azure', status: 'error', latency_ms: Date.now() - t0, error: err.message };
    }
  }
}

module.exports = AzureBlobAdapter;
