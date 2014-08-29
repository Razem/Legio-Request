'use strict';
var
Legio = require("legio"),
Promise = require("legio-async/promise"),
XMLHttpRequest = require("../xhr"),
createGet = require("./create-get");

var
createPost = function (post) {
  if (post && !String.is(post)) {
    return Object.toQueryString(post);
  }

  return post;
},

createRequest = function (file, async, post, get) {
  file = createGet(file, get);

  var xhr = new XMLHttpRequest();

  if (post) {
    xhr.open("POST", file, async);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
//    xhr.setRequestHeader("Content-Length", post.length);
//    xhr.setRequestHeader("Connection", "close");
  }
  else {
    xhr.open("GET", file, async);
  }

  return xhr;
},

onRequestIsDone = function () {
  if (this.readyState === 4) {
    if (+this.status === 200) {
      this._promise.fulfill(this.responseText);
    }
    else {
      this._promise.reject(this.status);
    }
  }
},

/**
 * @alias module:legio-request.loadText
 * @param {String} file
 * @param {String|Object} [post]
 * @param {String|Object} [get]
 * @returns {Promise}
 */
loadText = function (file, post, get) {
  post = createPost(post);

  var
  xhr = createRequest(file, true, post, get),
  promise = new Promise();

  xhr._promise = promise;
  xhr.onreadystatechange = onRequestIsDone;

  xhr.send(post);

  return promise;
},

/**
 * @alias module:legio-request.loadTextSync
 * @param {String} file
 * @param {String|Object} [post]
 * @param {String|Object} [get]
 * @returns {String}
 */
loadTextSync = function (file, post, get) {
  post = createPost(post);

  var xhr = createRequest(file, false, post, get);
  xhr.send(post);

  if (+xhr.status !== 200) {
    throw xhr;
  }

  return xhr.responseText;
},

/**
 * @alias module:legio-request.loadJSON
 * @param {String} file
 * @param {String|Object} [post]
 * @param {String|Object} [get]
 * @returns {Promise}
 */
loadJSON = function (file, post, get) {
  return loadText(file, post, get).run(JSON.parse);
},

/**
 * @alias module:legio-request.loadJSONSync
 * @param {String} file
 * @param {String|Object} [post]
 * @param {String|Object} [get]
 * @returns {*}
 */
loadJSONSync = function (file, post, get) {
  return JSON.parse(loadTextSync(file, post, get));
};

module.exports = {
  loadText: loadText,
  loadTextSync: loadTextSync,

  loadJSON: loadJSON,
  loadJSONSync: loadJSONSync
};
