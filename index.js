'use strict';
var
Legio = require("legio"),
Promise = require("legio-async/promise"),
XMLHttpRequest = require("./xhr");

var
createRequest = function (file, async, post) {
  var xhr = new XMLHttpRequest();

  if (post) {
    xhr.open("POST", file, async);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.setRequestHeader("Content-Length", post.length);
    xhr.setRequestHeader("Connection", "close");
  }
  else {
    xhr.open("GET", file, async);
  }

  return xhr;
},
onRequestIsDone = function () {
  if (this.readyState === 4) {
    if (this.status === 200) {
      this._promise.fulfill(this.responseText);
    }
    else {
      this._promise.reject(this.status);
    }
  }
};

var Request = {
  file: function (file, cfg) {
    cfg === undefined && (cfg = {});

    if (cfg.get) {
      file += "?" + cfg.get;
    }

    var
    async = cfg.async !== false,
    xhr = createRequest(file, async, cfg.post),
    promise;

    if (async) {
      promise = new Promise();
      xhr._promise = promise;
      xhr.onreadystatechange = onRequestIsDone;
    }

    xhr.send(cfg.post);

    return promise || xhr.responseText;
  }
};

// A script loading for a browser environment
if (global.window && window.document) {
  var
  document = window.document,
  head = document.getElementsByTagName("head")[0],

  onScriptIsLoaded = function () {
    var rs = this.readyState;
    if (rs === "complete" || rs === "loaded") {
      this.onreadystatechange = null;

      onScriptIsDone.call(this);
    }
  },
  onScriptIsDone = function () {
    head.removeChild(this);

    this._promise.fulfill(this);
  };

  Request.script = function (file) {
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
  };
}

module.exports = Request;
