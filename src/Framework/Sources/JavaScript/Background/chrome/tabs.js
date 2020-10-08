'use strict';

var eventEmitter = require('../event-bus.js');
var urlMatcher = require('../url-matcher.js');

// Internal state management
var browserTabs = { /* id, url */ };
var lastFocusedTabId = null;

// Created/Alive related
function registerTab() {
    // TODO: Change to assert? Only top window should send these messages
    if (this.frameId !== 0) { return; }

    var emitActivated = false;
    if (this.hasFocus) {
        if (lastFocusedTabId && lastFocusedTabId !== this.tabId) {
            browserTabs[lastFocusedTabId].hasFocus = false;
        }

        lastFocusedTabId = this.tabId;
        emitActivated = true;
    }

    var tab = {
        id: this.tabId,
        url: this.url,
        hasFocus: this.hasFocus,
        isVisible: this.isVisible,
        status: this.status,
    };

    if (browserTabs[this.tabId]) {
        var changeInfo = buildTabChangeInfo(browserTabs[this.tabId], tab);
        if (Object.keys(changeInfo).length) {
            tabs.onUpdated._emit(this.tabId, changeInfo, tab);
        }
    } else {
        tabs.onCreated._emit(tab);
        tabs.onUpdated._emit(this.tabId, {status: "loading"}, tab);
    }

    browserTabs[this.tabId] = tab;

    if (emitActivated) {
        tabs.onActivated._emit({ tabId: this.tabId });
    }
}

function buildTabChangeInfo(before, after) {
    // https://developer.chrome.com/extensions/tabs#event-onUpdated
    var changeInfo = {};

    if (before.url !== after.url) {
        changeInfo.url = after.url;
        changeInfo.status = "loading";
    }

    if (before.status !== after.status) {
        changeInfo.status = after.status;
    }

    return changeInfo;
}

// Remove related
function unregisterTab() {
    if (typeof this.frameId !== 'undefined' && this.frameId !== 0) { return; }
    if (!browserTabs[this.tabId]) {
        console.log('closing an undetected tab', this.tabId);
        return;
    }
    browserTabs[this.tabId]._deleted = true;
    setTimeout(function () {
        if (browserTabs[this.tabId]._deleted) {
            delete browserTabs[this.tabId];

            if (lastFocusedTabId === this.tabId) {
                lastFocusedTabId = null;
            }
        }
    }.bind(this), 700);  // content.js revokes bye if still alive 500ms later. adding 200 ms margin
}

// Query related
let unsupportedQueryWarning = [ 'pinned', 'audible', 'muted', 'highlighted', 'discarded', 'autoDiscardable', 'currentWindow', 'status', 'title', 'windowId', 'windowType', 'index' ]
    .reduce(function (w, opt) {
        w[opt] = function () {
            console.error('chrome.tabs.query "' + opt + '" option is not supported');
            delete unsupportedQueryWarning[opt];
        };
        return w;
    }, {});
unsupportedQueryWarning.active = function (opts) {
    if (!opts.lastFocusedWindow) {
        console.error('chrome.tabs.query "active" option is only valid in a conjunction with "lastFocusedWindow"');
        delete unsupportedQueryWarning.active;
    }
};

function query(queryInfo, callback) {
    for (var opt in queryInfo) {
        if (unsupportedQueryWarning[opt]) {
            unsupportedQueryWarning[opt](queryInfo);
        }
    }

    var tabs = [];
    for (var tab in browserTabs) {
        tabs.push(browserTabs[tab]);
    }

    // URL filtering
    if (queryInfo.url) {
        tabs = tabs.filter(function (tab) {
            return urlMatcher.match(queryInfo.url, tab.url);
        });
    }

    // Active tab (in last focussed window) filter
    if (queryInfo.active) {
        tabs = tabs.filter(function (tab) {
            return tab.id === lastFocusedTabId;
        });
    }

    callback(tabs);
}

// Event listener related
var listeners = {
    onCreated: [],
    onUpdated: [],
    onRemoved: [],
    onActivated: []
};

function generateEventHandler(type) {
    return {
        type: type,
        _emit: function() {
            eventEmitter.emit.apply(eventEmitter, [`tab@${this.type}`].concat(Array.prototype.slice.call(arguments)));
        },
        addListener: function(callback) {
            listeners[type].push(callback);
            eventEmitter.addListener(`tab@${type}`, callback);
        },
        removeListener: function(callback) {
            listeners[type] = listeners[type].filter(function(item) {
                if(callback === item) {
                    eventEmitter.removeListener(`tab@${type}`, callback);
                    return false;
                }
                return true;
            });
        },
        hasListener: function(callback) {
            return listeners[this.type].includes(callback);
        },
    };
}

// https://developer.chrome.com/extensions/tabs
var tabs = {
    // Methods
    create: function(createProperties, callback) {
        window.webkit.messageHandlers.appex.postMessage({
            type: 'createTab',
            url: typeof createProperties.url === 'undefined' ? 'favorites://' : createProperties.url,
            active: typeof createProperties.active === 'undefined' ? true : createProperties.active
        });

        if (callback) {
            tabs.onCreated.addListener(onTabCreated);
        }

        function onTabCreated(tabId, changeInfo, tab) {
            setTimeout(function () {
                callback(tab || tabId);
            }, 0);

            tabs.onCreated.removeListener(onTabCreated);
        }
    },

    get: function(id, callback) {
        callback(browserTabs[id]);
    },
    
    // when chrome.tabs.query is called before the background script finishes loading,
    // query would propagate faster than hello and return nothing
    query: function(queryInfo, callback) {
        setTimeout(function () {
            query(queryInfo, callback);
            tabs.query = query;
        }, 0);
    },
    
    // this could be implement in SafariExtensionBridge.swift,
    // but SFSafariPage.getContainingTab only exists since 10.14 and Topee targets 10.11
    update: function(tabId, updateProperties, callback) {
       if (!updateProperties.url) {
           console.error('chrome.tabs.update only supports url parameter');
       }
       window.webkit.messageHandlers.content.postMessage({
           eventName: 'tabUpdate',
           tabId: tabId,
           frameId: 0,
           url: updateProperties.url
       });
       setTimeout(function () {
           callback({ id: tabId, url: updateProperties.url });
       }, 0);
    },
    
    remove: function(id, callback) {
        window.webkit.messageHandlers.appex.postMessage({
            type: 'removeTab',
            tabId: id
        });
        if (callback) {
            setTimeout(callback, 0);
        }
    },
    
    sendMessage: function (tabId, message, options, responseCallback) {
        var messageId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        options = options || {};

        if (typeof options === 'function') {
            responseCallback = options;
            options = {};
        }

        function onResponse(...args) {
            if (this.messageId === messageId) {
                eventEmitter.removeEventListener('tabs.messageResponse', onResponse);
                responseCallback.apply(this, args);
            }
        }
        if (responseCallback) {
            eventEmitter.addEventListener('tabs.messageResponse', onResponse);
        }

        // Send message to tab
        window.webkit.messageHandlers.content.postMessage({
            tabId: tabId,
            eventName: 'tabs.message',
            frameId: options.frameId,
            messageId: messageId,
            payload: [
                message,
            ],
        });
    },

    // Events
    onCreated: generateEventHandler('onCreated'),
    onUpdated:generateEventHandler('onUpdated'),
    onRemoved: generateEventHandler('onRemoved'),
    onActivated: generateEventHandler('onActivated'),
};

// Listen to external calls
eventEmitter.addTopeeListener('tabs.load', registerTab);
eventEmitter.addTopeeListener('tabs.alive', registerTab);
eventEmitter.addTopeeListener('tabs.unload', unregisterTab);
eventEmitter.addTopeeListener('tabs.get', tabs.get);
eventEmitter.addTopeeListener('tabs.query', tabs.query);


module.exports = tabs;
