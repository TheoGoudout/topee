'use strict';

var eventEmitter = require('../event-bus.js');
var tabs = require('./tabs.js');

var state = {
    popup: {}
};

// https://developer.chrome.com/extensions/browserAction
var browserAction = {
    // Methods
    setTitle: function ({title, tabId}) {
        window.webkit.messageHandlers.appex.postMessage({type: 'setIconTitle', title, tabId});
    },

    // TODO: Implementation (actual display of popup + callback handling is missing)
    setPopup: function ({tabId, popup}, callback) {
        state.popup = {tabId, popup, callback};
    },

    setIcon: function ({path, imageData, tabId}) {
        window.webkit.messageHandlers.appex.postMessage({type: 'setIcon', path, imageData, tabId});
    },

    enable: function () {
        console.warn('browserAction.enable is not implemented.');
    },
    
    // Events
    onClicked: {
        listeners: [],
        addListener: function (fn) {
            var callback = function (event) {
                // Only call fn if popup isn't defined
                if (!state.popup.popup) {
                    // TODO: Also check tabId
                    tabs.get(event.tab.id, fn);
                }
            };

            browserAction.onClicked.listeners.push({fn: fn, callback: callback});

            eventEmitter.addEventListener('toolbarItemClicked', callback);
        },
        removeListener: function(fn) {
            browserAction.onClicked.listeners = browserAction.onClicked.listeners.filter(function(item) {
                if(item.fn === fn) {
                    eventEmitter.removeEventListener('toolbarItemClicked', item.callback);
                    return false;
                }

                return true;
            });
        },
    },
};

module.exports = browserAction;
