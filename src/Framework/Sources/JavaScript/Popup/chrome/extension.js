'use strict';

// https://developer.chrome.com/extensions/extension
var extension = {
    // Methods
    getURL: function (path) {
        return chrome.runtime.getURL(path);
    },

    // TODO: Implementation
    getViews: function (/* fetchProperties */) {
        return [];
    },
};

module.exports = extension;
