'use strict';
var
Legio = require("legio"),
Promise = require("legio-async/promise"),
createGet = require("./create-get");

// A script loading for a browser environment
var window = global.window;
if (window && window.document) {
  var
  document = window.document,
  head = document.getElementsByTagName("head")[0],

  onScriptIsLoaded = function () {
    var state = this.readyState;
    if (state === "complete" || state === "loaded") {
      this.onreadystatechange = null;

      onScriptIsDone.call(this);
    }
  },
  onScriptIsDone = function () {
    head.removeChild(this);

    this._promise.fulfill(this);
  },

  /**
   * @alias module:legio-request.loadScript
   * @param {String} file
   * @param {String|Object} [get]
   * @returns {Promise}
   */
  loadScript = function (file, get) {
    file = createGet(file, get);

    var script = document.createElement("script"), promise = new Promise();

    script._promise = promise;

    if (script.readyState) {
      script.onreadystatechange = onScriptIsLoaded;
    }
    else {
      script.onload = onScriptIsDone;
    }

    script.src = file;
    head.appendChild(script);

    return promise;
  },

  jsonpCount = 0,

  /**
   * @alias module:legio-request.loadJSONP
   * @param {String} file
   * @param {String|Object} [get]
   * @returns {Promise}
   * @example
   *  Request.loadJSONP("http://example.com/?cb=?");
   *  Request.loadJSONP("http://example.com/?cb=%3F");
   *  Request.loadJSONP("http://example.com/", { cb: "?" });
   *  Request.loadJSONP("http://example.com/"); // automatically adds `?callback=?`
   */
  loadJSONP = function (file, get) {
    file = createGet(file, get);

    var
    callbackId = "__LEGIO_JSONP_" + (++jsonpCount),
    promise = new Promise();

    global[callbackId] = function (data) {
      try {
        delete global[callbackId];
      }
      catch (err) {
        global[callbackId] = undefined;
      }

      promise.fulfill(data);
    };

    var fileWithCb = file.replace(/(=)(\?|%3F)($|&)/, "$1" + callbackId + "$3");
    if (fileWithCb === file) {
      fileWithCb = file + (file.indexOf("?") !== -1 ? "&" : "?") + "callback=" + callbackId;
    }

    loadScript(fileWithCb);

    return promise;
  };

  module.exports = {
    loadScript: loadScript,
    loadJSONP: loadJSONP
  };
}
