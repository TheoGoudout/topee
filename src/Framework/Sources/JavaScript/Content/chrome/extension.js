'use strict';

var runtime = require('./runtime.js');

// https://developer.chrome.com/extensions/extension
var extension = {
    // Methods
    getURL: function (path) {
        return runtime.getURL(path);
    },
};

module.exports = extension;
