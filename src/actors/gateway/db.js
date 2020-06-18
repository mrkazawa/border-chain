const Memcached = require('memcached');

class DB {
  constructor() {
    if ('instance' in this.constructor) {
      return this.constructor.instance;
    }

    this.constructor.instance = this;

    this.memcached = new Memcached('127.0.0.1:11211');
  }

  set(key, value, ttl = 2592000) {
    return new Promise((resolve, reject) => {
      this.memcached.set(key, value, ttl, (err) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  get(key) {
    return new Promise((resolve, reject) => {
      this.memcached.get(key, (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
    })
  }

  del(key) {
    return new Promise((resolve, reject) => {
      this.memcached.del(key, (err) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }

  incr(key, increment) {
    return new Promise((resolve, reject) => {
      this.memcached.incr(key, increment, (err) => {
        if (err) reject(err);
        resolve(true);
      });
    });
  }
}

module.exports = DB;