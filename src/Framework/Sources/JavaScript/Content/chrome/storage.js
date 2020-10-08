'use strict';

const background = require('../background-bridge');
const eventEmitter = require('../event-bus.js');

function generateStorage(storageArea) {
    return {
        /**
         * @param keys (optional)
         * @param cb function
         */
        get (keys, cb) {
            const callback = cb || keys;
            background.dispatchRequest(
                {
                    eventName: 'storage.get',
                    message: [
                        storageArea,
                        keys,
                    ],
                },
                (resp) => callback(resp)
            );
        },
        set(items,callback) {
            background.dispatchRequest(
                {
                    eventName: 'storage.set',
                    message: [
                        storageArea,
                        items,
                    ],
                },
                () => callback()
            );
        },
        remove(keys, callback) {
            background.dispatchRequest(
                {
                    eventName: 'storage.remove',
                    message: [
                        storageArea,
                        keys,
                    ],
                },
                () => callback()
            );
        },
        clear(callback) {
            background.dispatchRequest(
                {
                    eventName: 'storage.clear',
                    message: [
                        storageArea,
                    ],
                },
                () => callback()
            );
        },
    };
}

// https://developer.chrome.com/extensions/extension
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
            eventEmitter.on('storage.onChanged', callback);
        }
    }
};

eventEmitter.on('storage.changed', function(message) {
    eventEmitter.emit('storage.onChanged', ...message.payload);
});

module.exports = storage;
