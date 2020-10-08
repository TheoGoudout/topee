'use strict';

// https://developer.chrome.com/extensions/runtime
var runtime = {
    // Properties
    id: 'topee://',  // in sync with POPUP_PROTOCOL@PopupViewCOntroller.swift

    // Methods
    sendMessage: function(message, callback) {
        window.topee.dispatchRequest(0, {
            eventName: 'runtime.message',
            message: [
                message,
            ],
        }, callback);
    },

    getURL: function (path) {
        if (path.startsWith('/')) {
            path = path.substr(1)
        }
        return "topee://" + path;
    },

    openOptionsPage: function(callback) {
        window.topee.dispatchRequest(0, {
            eventName: 'runtime.openOptionsPage',
        }, callback);
    },
    
    // Events
    onMessage: {
        addListener: function () {},
        removeListener: function () {}
    },
};

module.exports = runtime;
