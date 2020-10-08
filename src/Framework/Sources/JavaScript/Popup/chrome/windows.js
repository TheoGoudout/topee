'use strict';

// https://developer.chrome.com/extensions/windows
var windows = {
    WINDOW_ID_NONE: -1,
    WINDOW_ID_CURRENT: -2,

    getAll: function (getInfo, callback) {
        if (callback) {
            setTimeout(function () {
                callback([]);
            }, 0);
        }
    },

    create: function (createData, callback) {
        window.topee.dispatchRequest(0, {
            eventName: 'windows.create',
            message: [{
                url: typeof createData.url === 'undefined' ? 'favorites://' : createData.url,
            }],
        }, callback);
    },

    update: function (id, updateData, callback) {
        if (callback) {
            setTimeout(function () {
                callback({ id: id });
            }, 0);
        }
    },
};

module.exports = windows;
