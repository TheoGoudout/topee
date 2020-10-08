module.exports = {
	extension: require('./extension.js'),
    i18n: require('../../Background/chrome/i18n.js'),
    runtime: require('./runtime.js'),
	storage: require('./storage.js'),
    tabs: require('./tabs.js'),
    windows: require('./windows.js')
};
