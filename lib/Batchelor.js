"use strict";

var utils = require("./util/Utils");
var transport = require("./Transport");
var Events = require("./Events");
var log = require("./util/Logger");
var config = require("./util/Config");
var persistent = require("./Persistent");

/**
 * Override defaults by providing configuration object
 * @param options = {
 *  log: {
 *      debug: functtion(){}
 *      info: functtion(){},
 *      error: functtion(){},
 *  },
 *  transport: {
 *      //implements transport
 *  },
 *  conf:{
 *      "maxConcurrentBatches": 10,
 *      "request": {
 *          "method": "GET",
 *          "timeout": 10000,
 *          "ip": "unknown",
 *          "headers": {},
 *          "strictSSL" : true,
 *      },
 *      "whiteList": ["*"]
 *  }
 * }
 */
function configure(options) {
    if (options) {
        log.overrideLogger(options.log);
        config.setConf(options.conf);
        transport.setTransport(options.transport);
    }
    log.debug("[batchelor] configure called with options: " + JSON.stringify(options));
}

/**
 * this is the entry point for the batchelor utility
 * @param requests - a object / array containing request/s to batch
 * @param callback - callback  method to be called once the request are performed
 * @returns String batchId
 */
function execute(requests, callback) {
    var batchId = utils.getUID("batch");

    log.debug("[batchelor] Processing Batch id: " + batchId);

    var persistentRequests = persistent.preparePersistentRequests(requests, callback);

    transport.issueCalls(requests, function (err, result) {
        utils.runCallBack(callback, err, result);
        persistent.persist(persistentRequests, result);
        Events.emit("complete", batchId);
    });

    Events.emit("processing", batchId);//This is a partial lie, we're already queueing this

    return batchId;
}

/**
 * method to stop running job, if exist
 * @param options = {
 *  ids: "1" || ["1", "2"]
 * }
 * @returns {boolean}
 */
function stop(options) {
    options = options || {};
    log.debug("[batchelor] close ids: " + JSON.stringify(options.ids));
    return persistent.stop(options.ids);
}

module.exports = {
    configure: configure,
    execute: execute,
    stop: stop
};
