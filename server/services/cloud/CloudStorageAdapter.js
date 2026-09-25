/**
 * CloudStorageAdapter.js
 * Abstract interface for cloud object storage providers.
 * All concrete adapters must implement every method below.
 */

class CloudStorageAdapter {
  constructor(config) {
    if (new.target === CloudStorageAdapter) {
      throw new Error('CloudStorageAdapter is abstract — instantiate a concrete adapter');
    }
    this.config   = config || {};
    this.provider = 'unknown';
  }

  /**
   * Upload an object.
   * @param {string} key        - object key / blob name
   * @param {Buffer|string} data
   * @param {object} metadata   - optional key/value pairs
   * @returns {Promise<{ uri: string, provider: string, key: string }>}
   */
  async write(key, data, metadata = {}) {   // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.write() not implemented`);
  }

  /**
   * Download an object.
   * @param {string} key
   * @returns {Promise<Buffer>}
   */
  async read(key) {   // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.read() not implemented`);
  }

  /**
   * Check if an object exists.
   * @param {string} key
   * @returns {Promise<boolean>}
   */
  async exists(key) {   // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.exists() not implemented`);
  }

  /**
   * List objects with a key prefix.
   * @param {string} prefix
   * @returns {Promise<string[]>} list of keys
   */
  async list(prefix) {   // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.list() not implemented`);
  }

  /**
   * Delete an object.
   * @param {string} key
   * @returns {Promise<void>}
   */
  async delete(key) {   // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.delete() not implemented`);
  }

  /**
   * Health check — returns provider name, status, and measured latency.
   * @returns {Promise<{ provider: string, status: 'ok'|'error', latency_ms: number, error?: string }>}
   */
  async health() {
    throw new Error(`${this.constructor.name}.health() not implemented`);
  }
}

module.exports = CloudStorageAdapter;
