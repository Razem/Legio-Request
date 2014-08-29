'use strict';

var XHR;

if (global.XMLHttpRequest) {
  XHR = XMLHttpRequest;
}
else if (global.ActiveXObject) {
  XHR = function () {
    return new ActiveXObject("MSXML2.XMLHTTP"); // Microsoft.XMLHTTP
  };
  XHR.prototype = ActiveXObject.prototype;
}

exports.XMLHttpRequest = XHR;
