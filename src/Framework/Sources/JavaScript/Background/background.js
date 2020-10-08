//
//  Copyright © 2018 Avast. All rights reserved.
//
require('../Common/polyfills');

var eventEmitter = require('./event-bus.js');
var logging = require('./logging');
logging.setup();

window.chrome = require('./chrome/index.js');

function manageRequest(payload) {
    console.log(payload);
    if (payload.eventName in eventEmitter.topeeEvents) {
        eventEmitter.emit(payload.eventName, payload);
    } else {
        console.error('Unknown event', payload.eventName, 'with payload', payload);
    }
}

window.topee = {
    manageRequest: manageRequest,
};
