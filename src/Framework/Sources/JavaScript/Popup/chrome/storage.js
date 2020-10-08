'use strict';

const EventEmitter = require('events');
const changeEmitter = new EventEmitter();

function storage(storageArea) {
    return {
        /**
         * @param keys (optional)
         * @param cb function
         */
        get (keys, cb) {
            const callback = cb || keys;
            window.topee.dispatchRequest(
                0,
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
        set(items, callback) {
            window.topee.dispatchRequest(
                0,
                {
                    eventName: 'storage.set',
                    message: [
                        storageArea,
                        items
                    ],
                },
                () => callback()
            );
        },
        remove(keys, callback) {
            window.topee.dispatchRequest(
                0,
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
            window.topee.dispatchRequest(
                0,
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

// https://developer.chrome.com/extensions/storage
var storage = {
    local: storage('local'),
    sync: storage('sync'),
    managed: {
        get: storage('managed').get
    },
    onChanged: {
        addListener(callback) {
            changeEmitter.on('storage', callback);
        },
    }
};

module.exports = storage;
