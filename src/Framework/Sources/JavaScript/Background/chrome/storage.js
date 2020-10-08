'use strict';

const eventEmitter = require('../event-bus.js');

function generateStorage(storageArea) {
    const STORAGE_KEY_PREFIX = '__topee_internal.' + storageArea + '.';
    function keyName(key) {
        return STORAGE_KEY_PREFIX + key;
    }

    function getAllKeys() {
        return Object.keys(localStorage)
            .filter(function (key) {
                return key.startsWith(STORAGE_KEY_PREFIX);
            })
            .map(function (key) {
                return key.replace(STORAGE_KEY_PREFIX, '');
            });
    }

    return {
        /**
         * @param keys (optional)
         * @param cb function
         */
        get: function (keys, cb) {
            const callbackFunc = cb || keys;
            let keysToFetch = [];
            let defaults = {};
            if (Array.isArray(keys)) {
                keysToFetch = keys;
            } else if (typeof keys === 'string') {
                keysToFetch = [keys];
            } else if (typeof keys === 'object') {
                keysToFetch = Object.keys(keys);
                defaults = keys;
            } else if (typeof keys === 'function') {
                keysToFetch = getAllKeys();
            } else {
                console.log('storage.get keys:', keys);
                throw new Error('storage.getinvalid type of argument: ' + typeof keys);
            }
            const result = {};
            for (const key of keysToFetch) {
                const inStorage = localStorage.getItem(keyName(key));
                result[key] = inStorage ? JSON.parse(inStorage) : defaults[key] || null;
            }
            callbackFunc(result);
        },
        /**
         * @param {object} items
         * @param {function} [callbackFunc]
         */
        set: function (items, callbackFunc) {
            const changes = {};
            for (const key of Object.keys(items)) {
                const oldValue = localStorage.getItem(key);
                const newValue = items[key];
                localStorage.setItem(keyName(key), JSON.stringify(items[key]));
                changes[key] = { oldValue, newValue };
            }

            eventEmitter.emit('storage.changed', changes, storageArea);
            callbackFunc && callbackFunc();
        },
        /**
         * @param {string|string[]} keys
         * @param {function} [callbackFunc]
         */
        remove: function (keys, callbackFunc) {
            let keysToRemove;
            if (typeof keys === 'string') {
                keysToRemove = [keys];
            } else if (Array.isArray(keys)) {
                keysToRemove = keys;
            } else {
                throw new Error('Invalid "keys" argument type');
            }
            for (const key of keysToRemove) {
                localStorage.removeItem(keyName(key));
            }
            callbackFunc && callbackFunc();
        },
        /**
         * @param {function} callbackFunc
         */
        clear: function (callbackFunc) {
            this.remove(getAllKeys(), callbackFunc);
        },
    };
}

// https://developer.chrome.com/extensions/storage
var storage = {
    // Properties
    local: generateStorage('local'),
    sync: generateStorage('sync'),
    managed: {
        get: generateStorage('managed').get
    },

    // Events
    onChanged: {
        addListener(callback) {
            eventEmitter.on('storage.changed', callback);
        },
    }
};

// Listen to external calls
function addTopeeAreaListener(eventName, eventHandler) {
    eventEmitter.addTopeeListener(eventName, function(area, ...args) {
        storage[area][eventHandler].apply(this, args);
    });
}
addTopeeAreaListener('storage.get', 'get');
addTopeeAreaListener('storage.set', 'set');
addTopeeAreaListener('storage.remove', 'remove');
addTopeeAreaListener('storage.clear', 'clear');

eventEmitter.addEventListener('storage.onChanged', function(payload) {
    storage.onChanged.addListener(function (...args) {
        window.webkit.messageHandlers.content.postMessage({
            tabId: payload.tabId,
            eventName: 'storage.changed',
            listenerId: payload.listenerId,
            payload: args,
        });
    });
});


module.exports = storage;
