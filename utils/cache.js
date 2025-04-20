// cache.js
class Cache {
    constructor(ttl = 5 * 60 * 1000) { // 5 minutos por defecto
        this.cache = {};
        this.ttl = ttl;
    }

    set(key, value) {
        this.cache[key] = {
            value,
            timestamp: Date.now()
        };
    }

    get(key) {
        const item = this.cache[key];
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            delete this.cache[key];
            return null;
        }

        return item.value;
    }

    clear(key) {
        if (key) {
            delete this.cache[key];
        } else {
            this.cache = {};
        }
    }
}

module.exports = new Cache();