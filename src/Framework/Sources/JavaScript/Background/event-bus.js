'use strict';

var EventEmitter = require('events');

var eventBus = new EventEmitter();

// We are adding quite a few listeners so let's increase listeners limit. Otherwise we get following warning:
// (node) warning: possible EventEmitter memory leak detected. 11 listeners added. Use emitter.setMaxListeners() to increase limit.
eventBus.setMaxListeners(1024);

// Add utility function to simplify event listening
// coming from content scripts and popup.
eventBus.topeeEvents = {};
eventBus.addTopeeListener = function (eventName, eventHandler) {
    // Topee listener cannot be removed
    eventBus.topeeEvents[eventName] = Infinity;
    eventBus.addListener(eventName, function (payload) {
        console.log(payload);
        var message = payload.message || [];
        eventHandler.call(payload, ...message, function (result) {
            if (payload.tabId === 'popup') {
                window.webkit.messageHandlers.popup.postMessage({
                    eventName: 'response',
                    messageId: payload.messageId,
                    payload: result,
                });
            } else {
                window.webkit.messageHandlers.content.postMessage({
                    eventName: 'response',
                    messageId: payload.messageId,
                    payload: result,

                    tabId: payload.tabId,
                    frameId: payload.frameId,
                });
            }
        });
    });
};
eventBus.addEventListener = function(eventName, eventHandler) {
    eventBus.topeeEvents[eventName] = (eventBus.topeeEvents[eventName] || 0) + 1;
    eventBus.addListener(eventName, eventHandler);
};
eventBus.removeTopeeListener = function (eventName, eventHandler) {
    var count = eventBus.topeeEvents[eventName];
    if (count) {
        eventBus.topeeEvents[eventName] = count - 1;
        eventBus.removeListener(eventName, eventHandler);
    }
};


module.exports = eventBus;
