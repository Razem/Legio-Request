'use strict';
var
Legio = require("legio");

module.exports = function (file, get) {
  if (get) {
    file += "?" + (String.is(get) ? get : Object.toQueryString(get));
  }

  return file;
};
