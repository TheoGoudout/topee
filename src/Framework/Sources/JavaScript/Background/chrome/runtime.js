'use strict';

var eventEmitter = require('../event-bus.js');
var windows = require('./windows.js');

var VERSION_INFO_KEY = '__topee_extension_version';

// https://developer.chrome.com/extensions/runtime
var runtime = {
    // Internals

    // Manifest will be updated by Topee SafariExtensionBridge before user
    // background scripts are executed.
    _manifest: undefined,
    
    // Options Page will be updated by Topee SafariExtensionBridge before user
    // background scripts are executed.
    _optionsPage: undefined,

    // Properties
    id: '',

    // Methods
    getManifest: function () {
        return runtime._manifest;
    },

    getURL: function (path) {
        if (path[0] === '/') {
            path = path.substr(1);
        }
        return 'safari-extension://' + runtime.id + path;
    },
    
    openOptionsPage: function(callback) {
        if (runtime._optionsPage) {
            windows.create({ url: runtime.getURL(runtime._optionsPage) }, callback);
        } else {
            console.error("Missing optionsPage");
            callback();
        }
    },

    //Events
    onMessage: {
        _listeners: new Set(),
        addListener: function (listener) {
            runtime.onMessage._listeners.add(listener);
        },
        removeListener: function (listener) {
            runtime.onMessage._listeners.delete(listener);
        },
    },

    onUpdateAvailable: {
        addListener: function () {
            // Not available in Safari
        }
    },

    // you get the installed / updated notification basically once once per a run
    onInstalled: {
        addListener (listener) {
            // just to be safe, if the caller didn't expect the callback synchronously
            setTimeout(function () {
                if (!runtime._manifest) {
                    return;
                }

                var currentVersion = runtime._manifest.version;
                if (!currentVersion) {
                    return;
                }

                var storedVersion = localStorage.getItem(VERSION_INFO_KEY);

                localStorage.setItem(VERSION_INFO_KEY, currentVersion);

                if (!storedVersion) {
                    listener({
                        reason: 'install'
                    });
                }
                else if (currentVersion !== storedVersion) {
                    listener({
                        reason: 'update',
                        previousVersion: storedVersion
                    });
                }
            }, 0);
        },
        removeListener: function () {}
    },
};

// Pass messages to listeners with proper arguments
// TODO: Handle listeners returning `true` for asynchronous response
eventEmitter.addTopeeListener('runtime.openOptionsPage', runtime.openOptionsPage);
eventEmitter.addTopeeListener('runtime.message', function(message, sendResponse) {
    // Forward message to popup
    window.webkit.messageHandlers.popup.postMessage({
        eventName: 'runtime.message',
        messageId: this.messageId,
        payload: message,
    });

    if (runtime.onMessage._listeners.size) {
        var payload = this;
        Promise.race([...runtime.onMessage._listeners].map(function (listener) {
            return new Promise(function(resolve) {
                var result = listener(message, {
                    tab: (payload.tabId === 'popup') ? undefined : { id: payload.tabId },
                    frameId: payload.frameId,
                    id: 'topee',
                    url: payload.url,
                    tlsChannelId: undefined,
                }, resolve);
                if (result.then) {
                    resolve(result);
                } else if (result !== true) {
                    resolve();
                }
            });
        })).then(function(result) {
            sendResponse(result);
        });
    } else {
        sendResponse();
    }
});


module.exports = runtime;
