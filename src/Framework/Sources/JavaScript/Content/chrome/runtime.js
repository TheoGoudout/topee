'use strict';

var eventEmitter = require('../event-bus.js');
var tabInfo = require('../tabInfo.js');
var iframesParent = require('../iframes.js');
var background = require('../background-bridge.js');

var runtime = {
    // Internals
    _manifest: {},

    // Methods
    sendMessage: function(message, callback) {
        background.dispatchRequest({
            eventName: 'runtime.message',
            message: [
                message,
            ],
        }, callback);
    },

    getManifest: function () {
        return runtime._manifest;
    },

    getURL: function (path) {
        if (!safari.extension.baseURI) {
            // Sometimes this happens (on first page load after XCode build & run)
            throw new Error('safari.extension.baseURI didn\'t return usable value');
        }
        if (path[0] === '/') {
            path = path.substr(1);
        }

        return safari.extension.baseURI + path;
    },
    
    openOptionsPage: function(callback) {
        background.dispatchRequest({
            eventName: 'runtime.openOptionsPage',
        }, callback);
    },

    getPlatformInfo: function (fn) {
        fn({
            os: 'mac',
            arch: 'x86-64',
            nacl_arch: 'x86-64'
        });
    },

    // Events
    onMessage: {
        addListener: function(callback) {
            eventEmitter.addListener('tabs.onMessage', callback);
        },
        removeListener: function(callback) {
            eventEmitter.removeListener('tabs.onMessage', callback);
        }
    },
};

// Update internal manifet values
var version = sessionStorage.getItem('topee_manifest_version');
if (version) {
    runtime._manifest.version = version;
}
var name = sessionStorage.getItem('topee_manifest_name');
if (name) {
    runtime._manifest.name = name;
}

// Pass messages to listeners with proper arguments
// TODO: Handle listeners returning `true` for asynchronous response
eventEmitter.on('tabs.message', function (message) {
    // Reply only once if at all
    var responseSent = false;
    function sendResponseOnce(result) {
        if (!responseSent) {
            responseSent = true;
            background.dispatchRequest({
                eventName: 'tabs.messageResponse',
                messageId: message.messageId,
                payload: result,
            });
        }
    }

    // message from the background script and a response
    if (tabInfo.isForThisFrame(message.frameId)) {
        eventEmitter.emit('tabs.onMessage', ...message.payload, {
            id: runtime.id
        }, sendResponseOnce);

        // Return undefined by default
        sendResponseOnce();

        // It's a broadcast message so let's pass it to all children IFRAMEs
        if (typeof message.frameId === 'undefined') {
            iframesParent.broadcast(message);
        }
        return;
    }
    if (event.name === 'tabs.message' && iframesParent.hasChild(message.frameId)) {
        iframesParent.forward(message.frameId, message);
        return;
    }
});

module.exports = runtime;
