'use strict';

// https://developer.chrome.com/extensions/tabs
var tabs = {
    // Methods
    query: function(queryInfo, callback) {
        window.topee.dispatchRequest(0, {
            eventName: 'tabs.query',
            message: [
                queryInfo,
            ],
        }, callback);
    },

    get: function(queryTabId, callback) {
        window.topee.dispatchRequest(0, {
            eventName: 'tabs.get',
            message: [
                queryTabId,
            ],
        }, callback);
    },

    executeScript: function() {
        console.log('chrome.tabs.executeScript is not supported');
        var cb = arguments.length > 0 ? arguments[arguments.length - 1] : null;
        if (typeof cb === 'function') {
            cb();
        }
    },

    // TODO: implement
    sendMessage: function(tabId, message, options, responseCallback) {
        if (typeof options === 'function') {
            responseCallback = options;
            options = {};
        }

        if (responseCallback) {
            setTimeout(function () { responseCallback(null); }, 0);
        }
    },
};

module.exports = tabs;
