'use strict';
var
Legio = require("legio"),
Promise = require("legio-async/promise"),
XMLHttpRequest = require("./xhr");

/** @module legio-request */

/** @alias module:legio-request */
var Request = {};

Object.assign(Request, require("./lib/ajax"));
Object.assign(Request, require("./lib/script"));

module.exports = Request;
