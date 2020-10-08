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

    // TODO: Implementation
    detectLanguage: function (text, callback) {
        callback({
            isReliable: true,
            languages: [
                {language: "en", percentage: 100}
            ]
        });
    },
};

// Update internal locale value
var sessionLocale = sessionStorage.getItem('topee_locale');
if (sessionLocale) {
    try {
        i18n._locale = JSON.parse(sessionLocale);
    }
    catch (ex) {
        console.error('Cannot parse locale', sessionLocale);
    }
}


module.exports = i18n;
