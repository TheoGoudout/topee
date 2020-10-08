// create / get tab id
'use strict';

var eventEmitter = require('./event-bus.js');

var tabInfo = {
    Event: {
        GET_TAB_ID: 'topee.tabInfo.getTabId',
        TAB_ID: 'topee.tabInfo.tabId'
    },

    init: init,
    onTabLoad: onTabLoad,
    onTabAlive: onTabAlive,
    onTabUnload: onTabUnload,
    isForThisFrame: isForThisFrame
};

var BACKGROUND_GETURL = 'extension-path:/';

var setTabId;
tabInfo.tabId = new Promise(function (resolve) {
    setTabId = resolve;
});


if (window === window.top) {
    tabInfo.frameId = 0;
}
else {
    tabInfo.frameId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

// this will break when navigating somewhere and then back here, because referrer is not what it should be in this case
// sessionStorage forks, so further writes to it don't affect the original (that called window.open) document's sessionStorage
var storedTabId = window.opener ? NaN : parseInt(sessionStorage.getItem('topee_tabId'));
var helloWithNullTabIdSent = false;
var topeeDebug = loadDebug();
publishDebug();

function init() {
    if (window === window.top) {
        // tabId responder
        window.addEventListener('message', function (msg) {
            if (msg.data && msg.data.type === tabInfo.Event.GET_TAB_ID) {
                tabInfo.tabId.then(id => msg.source && msg.source.postMessage({
                    type: tabInfo.Event.TAB_ID,
                    detail: id,
                    debug: topeeDebug,
                    locale: chrome.i18n._locale
                }, msg.origin));
            }
        });

        eventEmitter.on('tabUpdate', function (message) {
            if (message && message.url) {
                var url = message.url;
                if (message.url.startsWith(BACKGROUND_GETURL)) {
                    url = chrome.runtime.getURL(url.substr(BACKGROUND_GETURL.length));
                }
                window.location = url;
            }        
        });
    }

    if (!isNaN(storedTabId)) {
        setTabId(storedTabId);
        return;
    }

    if (window === window.top) {
        // should arrive as a response to sayHello
        eventEmitter.on('forceTabId', function (message) {
            if (message && typeof message.tabId === 'number') {
                if (message.locale) {
                    try {
                        chrome.i18n._locale = JSON.parse(message.locale);
                        sessionStorage.setItem('topee_locale', message.locale);
                    }
                    catch (ex) {
                        console.error('Cannot parse locale:', ex);
                    }
                }

                if (message.manifest_version) {
                    chrome.runtime._manifest.version = message.manifest_version;
                    sessionStorage.setItem('topee_manifest_version', message.manifest_version);
                }
                if (message.manifest_name) {
                    chrome.runtime._manifest.name = message.manifest_name;
                    sessionStorage.setItem('topee_manifest_name', message.manifest_name);
                }

                storedTabId = message.tabId;
                sessionStorage.setItem('topee_tabId', storedTabId);

                publishDebug(message.debug);
                storeDebug(message.debug);

                setTabId(message.tabId);
            }
        });
        return;
    }


    if (window !== window.top) {
        var poller;
        window.addEventListener('message', function (msg) {
            if (msg.data && msg.data.type === tabInfo.Event.TAB_ID && typeof msg.data.detail === 'number') {
                if (msg.data.locale) {
                    chrome.i18n._locale = msg.data.locale;
                    sessionStorage.setItem('topee_locale', JSON.stringify(msg.data.locale));
                }

                if (msg.data.manifest_version) {
                    chrome.runtime._manifest.version = msg.data.manifest_version;
                    sessionStorage.setItem('topee_manifest_version', msg.data.manifest_version);
                }
                if (msg.data.manifest_name) {
                    chrome.runtime._manifest.name= msg.data.manifest_name;
                    sessionStorage.setItem('topee_manifest_name', msg.data.manifest_name);
                }
                

                storedTabId = msg.data.detail;

                publishDebug(msg.data.debug);
                storeDebug(msg.data.debug);

                setTabId(msg.data.detail);
                clearInterval(poller);
            }
        });
        poller = setInterval(function () {
            window.top.postMessage({ type: tabInfo.Event.GET_TAB_ID }, '*');
        }, 200);
        window.top.postMessage({ type: tabInfo.Event.GET_TAB_ID }, '*');
        return;
    }
}

// True if hello has been sent and bye wasn't yet. This prevents multiple
// hellos/byes being sent from same page (as we listen on multiple load/unload
// events).
window.isTabRegistered = false;

function onTabLoad() {
    var tabId = isNaN(storedTabId) ? null : storedTabId;
    if (tabId === null) {
        if (helloWithNullTabIdSent)
            return;
        helloWithNullTabIdSent = true;
    }

    if (window.isTabRegistered) {
        return;
    }

    tabInfo.tabId.then(
        assignedTabId => window.topee_log && console.debug(`tabs.load(tabId: ${tabId}, referrer: "${document.referrer}", historyLength: ${history.length}) @ ${window.location.href} -> ${assignedTabId}`));

    safari.extension.dispatchMessage('hello', {
        // Info processed by Swift layer only
        tabId: tabId,
        referrer: document.referrer,
        historyLength: history.length,
        userAgent: navigator.userAgent,
        // Payload is passed to background page (and processed by tabs.js for example)
        payload: Object.assign(
            {
                eventName: 'tabs.load',
                tabId: tabId
            },
            getTabState()
        )
    });

    window.isTabRegistered = true;
}

function onTabAlive() {
    safari.extension.dispatchMessage('alive', {
        // Info processed by Swift layer only
        tabId: storedTabId,
        // Payload is passed to background page (and processed by tabs.js for example)
        payload: Object.assign(
            {
                eventName: 'tabs.alive',
                tabId: storedTabId
            },
            getTabState()
        )
    });
}

function getTabState () {
    return {
        frameId: tabInfo.frameId,
        isVisible: !document.hidden,
        hasFocus: document.hasFocus(),
        status: document.readyState === "complete" ? "complete" : "loading",
        url: window.location.href
    };
}

function onTabUnload(event) {
    var tabId = isNaN(storedTabId) ? null : storedTabId;

    if (!window.isTabRegistered) {
        return;
    }

    window.topee_log && console.debug(`tabs.unload(tabId: ${tabId}, url: ${window.location.href})`);

    safari.extension.dispatchMessage('bye', {
        tabId: tabId,
        referrer: document.referrer,
        historyLength: history.length,
        payload: {
            tabId: tabId,
            eventName: 'tabs.unload',
            reason: event ? event.type : 'unknown',
            url: window.location.href
        }
    });

    window.isTabRegistered = false;
}

function isForThisFrame(targetFrameId) {
    // Frame not specified, so it's broadcast
    if (targetFrameId === null || targetFrameId === undefined) {
        return true;
    }

    return targetFrameId === tabInfo.frameId;
}

function loadDebug() {
    var debugStr = sessionStorage.getItem('topee_debug');
    if (!debugStr) {
        return {};
    }
    try {
        var debugObj = JSON.parse(debugStr);
        if (debugObj === null || typeof debugObj !== 'object') {
            return {};
        }

        return debugObj;
    }
    catch (ex) {
        return {};
    }
}

function storeDebug(debugObj) {
    if (typeof debugObj !== 'object' || debugObj === null) {
        return;
    }
    sessionStorage.setItem('topee_debug', JSON.stringify(debugObj));
}

function publishDebug(debugObj) {
    if (arguments.length > 0) {
        if (typeof debugObj !== 'object' || debugObj === null) {
            return;
        }
        topeeDebug = debugObj;
    }

    if (topeeDebug.log) {
        window.topee_log = topeeDebug.log;
    }
    else {
        delete window.topee_log;
    }
}

module.exports = tabInfo;
