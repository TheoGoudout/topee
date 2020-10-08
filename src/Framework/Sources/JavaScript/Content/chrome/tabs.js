'use strict';

const background = require('../background-bridge.js');

// https://developer.chrome.com/extensions/tabs
var tabs = {
    // Methods
    query: function(queryInfo, callback) {
        background.dispatchRequest({
            eventName: 'tabs.query',
            message: [
                queryInfo,
            ],
        }, callback);
    },

    get: function(queryTabId, callback) {
        background.dispatchRequest({
            eventName: 'tabs.get',
            message: [
                queryTabId,
            ],
        }, callback);
    },
};

module.exports = tabs;
