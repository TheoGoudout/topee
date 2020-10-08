'use strict';

// https://developer.chrome.com/extensions/commands
var commands = {
    // Events
    onCommand: {
        addListener: function () {
            console.warn('commands.onCommand.addListener is not implemented.');
        },
        removeListener: function() {
            console.warn('commands.onCommand.removeListener is not implemented.');
        },
    },
};

module.exports = commands;
