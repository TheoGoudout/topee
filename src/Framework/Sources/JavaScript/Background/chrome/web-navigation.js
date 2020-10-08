'use strict';

// https://developer.chrome.com/extensions/webNavigation
var webNavigation = {
    // Events
    onCommitted: {
        addListener: function () {
            console.warn('webNavigation.onCommitted.addListener is not implemented.');
        },
        removeListener: function() {
            console.warn('webNavigation.onCommitted.removeListener is not implemented.');
        }
    },
};

module.exports = webNavigation;
