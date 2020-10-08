'use strict';

// https://developer.chrome.com/extensions/extension
var extension = {
    // Methods
    getURL: function (path) {
        return chrome.runtime.getURL(path);
    },

    getViews: function (/* fetchProperties */) {
        // TODO: Implementation
        return [];
    },
};

module.exports = extension;
