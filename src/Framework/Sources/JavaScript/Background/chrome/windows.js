'use strict';

var eventEmitter = require('../event-bus.js');

// https://developer.chrome.com/extensions/windows
var windows = {
    // Properties
    WINDOW_ID_NONE: -1,
    WINDOW_ID_CURRENT: -2,

    // Methods
    getAll: function (getInfo, callback) {
        if (callback) {
            setTimeout(function () {
                callback([]);
            }, 0);
        }
    },

    create: function (createData, callback) {
        window.webkit.messageHandlers.appex.postMessage({
            type: 'createWindow',
            url: typeof createData.url === 'undefined' ? 'favorites://' : createData.url
        });

        if (callback) {
            setTimeout(function () {
                callback({ id: windows.WINDOW_ID_CURRENT });
            }, 0);
        }
    },

    update: function (id, updateData, callback) {
        if (callback) {
            setTimeout(function () {
                callback({ id: id });
            }, 0);
        }
    },
};

// Listen to external calls
eventEmitter.addTopeeListener('windows.getAll', windows.getAll);
eventEmitter.addTopeeListener('windows.create', function (data, cb) {
    // Transform topee URLs to safari-extension URLs
    if (data.url && data.url.startsWith('topee://')) {
        data.url = chrome.runtime.getURL(data.url.substring('topee://'.length));
    }

    windows.create.call(this, data, cb);
});
eventEmitter.addTopeeListener('windows.update', windows.update);

module.exports = windows;
