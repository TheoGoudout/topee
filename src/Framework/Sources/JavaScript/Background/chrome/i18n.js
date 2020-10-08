'use strict';

var getSubstitutionsMessage = require('../../Common/i18n-getmessage.js');

// https://developer.chrome.com/extensions/i18n
var i18n = {
    // Internals
    _locale: {},
    
    // Methods
    getUILanguage: function () {
        return navigator.language;
    },

    getMessage: function (messageName, substitutions) {
        return getSubstitutionsMessage(i18n._locale, messageName, substitutions);
    },

    detectLanguage: function (text, callback) {
        // TODO: Implementation
        callback({
            isReliable: true,
            languages: [
                {language: "en", percentage: 100}
            ]
        });
    },
};

module.exports = i18n;
