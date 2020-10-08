// Low-level communication bridge with background script

var tabInfo = require('./tabInfo.js');
var eventEmitter = require('./event-bus.js');

function dispatchRequest(tabId, payload, callback) {
    var messageId = payload.messageId || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    function listener(message) {
        if (message.messageId === messageId) {
            eventEmitter.off('response', listener);
            callback.call(message, message.payload);
        }
    }
    
    if (callback) {
        eventEmitter.on('response', listener);
        // this is needed for iframe-resources.js communication
        listener.messageId = messageId;
    }

    payload.tabId = tabId;
    payload.messageId = messageId;
    payload.frameId = tabInfo.frameId;
    payload.url = window.location.href;

    safari.extension.dispatchMessage('request', {
        tabId: tabId,
        payload: payload
    });
}

var bridge = {
    dispatchRequest: function(payload, callback) {
        tabInfo.tabId.then(tabId => {
            dispatchRequest(tabId, payload, callback);
        });
    },
};

// Update method when tabId is available
tabInfo.tabId.then(tabId => {
    bridge.dispatchRequest = function (payload, callback) {
        dispatchRequest(tabId, payload, callback);
    };
});

module.exports = bridge;
