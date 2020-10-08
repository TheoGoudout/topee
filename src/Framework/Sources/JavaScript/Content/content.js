(function () {

if (!{
        'http:': true,
        'https:': true,
        'about:': true,
        'safari-extension:': true
    }[window.location.protocol])
{
    return;
}

require('../Common/polyfills');

var tabInfo = require('./tabInfo.js');

if (typeof window.chrome === 'object') {
    window.topee_log && console.log(`chrome api already loaded into ${window === window.top ? "top window" : "some frame"}`);

    if (window === window.top) {
        // in case this is injected multiple times (https://bugreport.apple.com/web/?problemID=43086339), the first injects don't received these events
        window.isTabRegistered = true; // Let's be sure that we send bye in this weird multi-inject state
        window.addEventListener('pagehide', tabInfo.onTabUnload);
        window.addEventListener('beforeunload', tabInfo.onTabUnload);
    }

    return;
}

var URL_POLL_VISIBLE = 500;
var URL_POLL_HIDDEN = 5000;

window.chrome = require('./chrome/index.js');
tabInfo.init();

// the non-existence of window.chrome on the top makes sure that this listener is installed only once
var iframesParent = require('./iframes.js');
iframesParent.install();

if (window === window.top) {
    tabInfo.onTabLoad();

    // When user navigates back Safari ressurects page so we need to trigger hello also in
    // this case (because was dereferenced using beforeunload)
    window.addEventListener('pageshow', tabInfo.onTabLoad);
}

var lastUrl = window.location.href;

if (window === window.top) {
    // Say bye when page is unloaded. This is kind of tricky due to Safari not
    // supporting unload event correctly. For regular page navigation, pagehide
    // works best, but it's not triggered when tab is closed.
    //
    // Page reload events:
    //   - beforeunload
    //   - pagehide
    //   - unload
    //
    // Page navigation events:
    //   - beforeunload
    //   - pagehide (only triggered if user or script didn't cancel unload)
    //
    // Tab close events:
    //   - beforeunload

    var unloadHelloTimer = undefined;
    window.addEventListener('beforeunload', () => {
        tabInfo.onTabUnload();
        unloadHelloTimer = setTimeout(() => tabInfo.onTabLoad(), 500);
    });
    window.addEventListener('pagehide', () => {
        clearTimeout(unloadHelloTimer);
        tabInfo.onTabUnload();
    });

    var documentComplete = false;
    once(document, 'readystatechange', function () {
        if (document.readyState === 'complete') {
            documentComplete = true;
        }
    });

    tabInfo.tabId.then(() => {
        setInterval(tabInfo.onTabAlive, 5000);

        if (documentComplete) {
            tabInfo.onTabAlive();
        }

        document.addEventListener("DOMContentLoaded", tabInfo.onTabAlive);
        window.addEventListener("load", tabInfo.onTabAlive);
        document.addEventListener("visibilitychange", tabInfo.onTabAlive);
    });

    // history API has no change notification, so we have to use polling
    var scheduleMs = document.visibilityState === 'visible' ? URL_POLL_VISIBLE : URL_POLL_HIDDEN;
    var visibilityPoll = setInterval(visibilityHello, scheduleMs);
    document.addEventListener('visibilitychange', function () {
        clearInterval(visibilityPoll);
        if (document.visibilityState === 'visible') {
            visibilityHello();
            scheduleMs =  URL_POLL_VISIBLE;
        }
        else {
            scheduleMs = URL_POLL_HIDDEN;
        }
        visibilityPoll = setInterval(visibilityHello, scheduleMs);
    });
}

function once(obj, event, callback) {
    return new Promise(function (resolve) {
        function onEvent() {
            resolve(callback.apply(this, arguments));
            obj.removeEventListener(event, onEvent);
        }
        obj.addEventListener(event, onEvent);
    });
}

function visibilityHello() {
    if (document.visibilityState !== 'prerender' && window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        tabInfo.onTabLoad();
    }
}

})();
