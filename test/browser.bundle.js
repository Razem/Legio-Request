(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./lib/ajax":2,"./lib/script":5,"./xhr":26,"legio":21,"legio-async/promise":8}],2:[function(require,module,exports){
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

},{"../xhr":26,"./create-get":4,"legio":21,"legio-async/promise":8}],3:[function(require,module,exports){
(function (global){
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
'use strict';
var
Legio = require("legio");

module.exports = function (file, get) {
  if (get) {
    file += "?" + (String.is(get) ? get : Object.toQueryString(get));
  }

  return file;
};

},{"legio":21}],5:[function(require,module,exports){
(function (global){
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
      delete global[callbackId];

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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./create-get":4,"legio":21,"legio-async/promise":8}],6:[function(require,module,exports){
(function (global, module) {

  var exports = module.exports;

  /**
   * Exports.
   */

  module.exports = expect;
  expect.Assertion = Assertion;

  /**
   * Exports version.
   */

  expect.version = '0.3.1';

  /**
   * Possible assertion flags.
   */

  var flags = {
      not: ['to', 'be', 'have', 'include', 'only']
    , to: ['be', 'have', 'include', 'only', 'not']
    , only: ['have']
    , have: ['own']
    , be: ['an']
  };

  function expect (obj) {
    return new Assertion(obj);
  }

  /**
   * Constructor
   *
   * @api private
   */

  function Assertion (obj, flag, parent) {
    this.obj = obj;
    this.flags = {};

    if (undefined != parent) {
      this.flags[flag] = true;

      for (var i in parent.flags) {
        if (parent.flags.hasOwnProperty(i)) {
          this.flags[i] = true;
        }
      }
    }

    var $flags = flag ? flags[flag] : keys(flags)
      , self = this;

    if ($flags) {
      for (var i = 0, l = $flags.length; i < l; i++) {
        // avoid recursion
        if (this.flags[$flags[i]]) continue;

        var name = $flags[i]
          , assertion = new Assertion(this.obj, name, this)

        if ('function' == typeof Assertion.prototype[name]) {
          // clone the function, make sure we dont touch the prot reference
          var old = this[name];
          this[name] = function () {
            return old.apply(self, arguments);
          };

          for (var fn in Assertion.prototype) {
            if (Assertion.prototype.hasOwnProperty(fn) && fn != name) {
              this[name][fn] = bind(assertion[fn], assertion);
            }
          }
        } else {
          this[name] = assertion;
        }
      }
    }
  }

  /**
   * Performs an assertion
   *
   * @api private
   */

  Assertion.prototype.assert = function (truth, msg, error, expected) {
    var msg = this.flags.not ? error : msg
      , ok = this.flags.not ? !truth : truth
      , err;

    if (!ok) {
      err = new Error(msg.call(this));
      if (arguments.length > 3) {
        err.actual = this.obj;
        err.expected = expected;
        err.showDiff = true;
      }
      throw err;
    }

    this.and = new Assertion(this.obj);
  };

  /**
   * Check if the value is truthy
   *
   * @api public
   */

  Assertion.prototype.ok = function () {
    this.assert(
        !!this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to be truthy' }
      , function(){ return 'expected ' + i(this.obj) + ' to be falsy' });
  };

  /**
   * Creates an anonymous function which calls fn with arguments.
   *
   * @api public
   */

  Assertion.prototype.withArgs = function() {
    expect(this.obj).to.be.a('function');
    var fn = this.obj;
    var args = Array.prototype.slice.call(arguments);
    return expect(function() { fn.apply(null, args); });
  };

  /**
   * Assert that the function throws.
   *
   * @param {Function|RegExp} callback, or regexp to match error string against
   * @api public
   */

  Assertion.prototype.throwError =
  Assertion.prototype.throwException = function (fn) {
    expect(this.obj).to.be.a('function');

    var thrown = false
      , not = this.flags.not;

    try {
      this.obj();
    } catch (e) {
      if (isRegExp(fn)) {
        var subject = 'string' == typeof e ? e : e.message;
        if (not) {
          expect(subject).to.not.match(fn);
        } else {
          expect(subject).to.match(fn);
        }
      } else if ('function' == typeof fn) {
        fn(e);
      }
      thrown = true;
    }

    if (isRegExp(fn) && not) {
      // in the presence of a matcher, ensure the `not` only applies to
      // the matching.
      this.flags.not = false;
    }

    var name = this.obj.name || 'fn';
    this.assert(
        thrown
      , function(){ return 'expected ' + name + ' to throw an exception' }
      , function(){ return 'expected ' + name + ' not to throw an exception' });
  };

  /**
   * Checks if the array is empty.
   *
   * @api public
   */

  Assertion.prototype.empty = function () {
    var expectation;

    if ('object' == typeof this.obj && null !== this.obj && !isArray(this.obj)) {
      if ('number' == typeof this.obj.length) {
        expectation = !this.obj.length;
      } else {
        expectation = !keys(this.obj).length;
      }
    } else {
      if ('string' != typeof this.obj) {
        expect(this.obj).to.be.an('object');
      }

      expect(this.obj).to.have.property('length');
      expectation = !this.obj.length;
    }

    this.assert(
        expectation
      , function(){ return 'expected ' + i(this.obj) + ' to be empty' }
      , function(){ return 'expected ' + i(this.obj) + ' to not be empty' });
    return this;
  };

  /**
   * Checks if the obj exactly equals another.
   *
   * @api public
   */

  Assertion.prototype.be =
  Assertion.prototype.equal = function (obj) {
    this.assert(
        obj === this.obj
      , function(){ return 'expected ' + i(this.obj) + ' to equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to not equal ' + i(obj) });
    return this;
  };

  /**
   * Checks if the obj sortof equals another.
   *
   * @api public
   */

  Assertion.prototype.eql = function (obj) {
    this.assert(
        expect.eql(this.obj, obj)
      , function(){ return 'expected ' + i(this.obj) + ' to sort of equal ' + i(obj) }
      , function(){ return 'expected ' + i(this.obj) + ' to sort of not equal ' + i(obj) }
      , obj);
    return this;
  };

  /**
   * Assert within start to finish (inclusive).
   *
   * @param {Number} start
   * @param {Number} finish
   * @api public
   */

  Assertion.prototype.within = function (start, finish) {
    var range = start + '..' + finish;
    this.assert(
        this.obj >= start && this.obj <= finish
      , function(){ return 'expected ' + i(this.obj) + ' to be within ' + range }
      , function(){ return 'expected ' + i(this.obj) + ' to not be within ' + range });
    return this;
  };

  /**
   * Assert typeof / instance of
   *
   * @api public
   */

  Assertion.prototype.a =
  Assertion.prototype.an = function (type) {
    if ('string' == typeof type) {
      // proper english in error msg
      var n = /^[aeiou]/.test(type) ? 'n' : '';

      // typeof with support for 'array'
      this.assert(
          'array' == type ? isArray(this.obj) :
            'regexp' == type ? isRegExp(this.obj) :
              'object' == type
                ? 'object' == typeof this.obj && null !== this.obj
                : type == typeof this.obj
        , function(){ return 'expected ' + i(this.obj) + ' to be a' + n + ' ' + type }
        , function(){ return 'expected ' + i(this.obj) + ' not to be a' + n + ' ' + type });
    } else {
      // instanceof
      var name = type.name || 'supplied constructor';
      this.assert(
          this.obj instanceof type
        , function(){ return 'expected ' + i(this.obj) + ' to be an instance of ' + name }
        , function(){ return 'expected ' + i(this.obj) + ' not to be an instance of ' + name });
    }

    return this;
  };

  /**
   * Assert numeric value above _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.greaterThan =
  Assertion.prototype.above = function (n) {
    this.assert(
        this.obj > n
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n });
    return this;
  };

  /**
   * Assert numeric value below _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.lessThan =
  Assertion.prototype.below = function (n) {
    this.assert(
        this.obj < n
      , function(){ return 'expected ' + i(this.obj) + ' to be below ' + n }
      , function(){ return 'expected ' + i(this.obj) + ' to be above ' + n });
    return this;
  };

  /**
   * Assert string value matches _regexp_.
   *
   * @param {RegExp} regexp
   * @api public
   */

  Assertion.prototype.match = function (regexp) {
    this.assert(
        regexp.exec(this.obj)
      , function(){ return 'expected ' + i(this.obj) + ' to match ' + regexp }
      , function(){ return 'expected ' + i(this.obj) + ' not to match ' + regexp });
    return this;
  };

  /**
   * Assert property "length" exists and has value of _n_.
   *
   * @param {Number} n
   * @api public
   */

  Assertion.prototype.length = function (n) {
    expect(this.obj).to.have.property('length');
    var len = this.obj.length;
    this.assert(
        n == len
      , function(){ return 'expected ' + i(this.obj) + ' to have a length of ' + n + ' but got ' + len }
      , function(){ return 'expected ' + i(this.obj) + ' to not have a length of ' + len });
    return this;
  };

  /**
   * Assert property _name_ exists, with optional _val_.
   *
   * @param {String} name
   * @param {Mixed} val
   * @api public
   */

  Assertion.prototype.property = function (name, val) {
    if (this.flags.own) {
      this.assert(
          Object.prototype.hasOwnProperty.call(this.obj, name)
        , function(){ return 'expected ' + i(this.obj) + ' to have own property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have own property ' + i(name) });
      return this;
    }

    if (this.flags.not && undefined !== val) {
      if (undefined === this.obj[name]) {
        throw new Error(i(this.obj) + ' has no property ' + i(name));
      }
    } else {
      var hasProp;
      try {
        hasProp = name in this.obj
      } catch (e) {
        hasProp = undefined !== this.obj[name]
      }

      this.assert(
          hasProp
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name) });
    }

    if (undefined !== val) {
      this.assert(
          val === this.obj[name]
        , function(){ return 'expected ' + i(this.obj) + ' to have a property ' + i(name)
          + ' of ' + i(val) + ', but got ' + i(this.obj[name]) }
        , function(){ return 'expected ' + i(this.obj) + ' to not have a property ' + i(name)
          + ' of ' + i(val) });
    }

    this.obj = this.obj[name];
    return this;
  };

  /**
   * Assert that the array contains _obj_ or string contains _obj_.
   *
   * @param {Mixed} obj|string
   * @api public
   */

  Assertion.prototype.string =
  Assertion.prototype.contain = function (obj) {
    if ('string' == typeof this.obj) {
      this.assert(
          ~this.obj.indexOf(obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    } else {
      this.assert(
          ~indexOf(this.obj, obj)
        , function(){ return 'expected ' + i(this.obj) + ' to contain ' + i(obj) }
        , function(){ return 'expected ' + i(this.obj) + ' to not contain ' + i(obj) });
    }
    return this;
  };

  /**
   * Assert exact keys or inclusion of keys by using
   * the `.own` modifier.
   *
   * @param {Array|String ...} keys
   * @api public
   */

  Assertion.prototype.key =
  Assertion.prototype.keys = function ($keys) {
    var str
      , ok = true;

    $keys = isArray($keys)
      ? $keys
      : Array.prototype.slice.call(arguments);

    if (!$keys.length) throw new Error('keys required');

    var actual = keys(this.obj)
      , len = $keys.length;

    // Inclusion
    ok = every($keys, function (key) {
      return ~indexOf(actual, key);
    });

    // Strict
    if (!this.flags.not && this.flags.only) {
      ok = ok && $keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      $keys = map($keys, function (key) {
        return i(key);
      });
      var last = $keys.pop();
      str = $keys.join(', ') + ', and ' + last;
    } else {
      str = i($keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (!this.flags.only ? 'include ' : 'only have ') + str;

    // Assertion
    this.assert(
        ok
      , function(){ return 'expected ' + i(this.obj) + ' to ' + str }
      , function(){ return 'expected ' + i(this.obj) + ' to not ' + str });

    return this;
  };

  /**
   * Assert a failure.
   *
   * @param {String ...} custom message
   * @api public
   */
  Assertion.prototype.fail = function (msg) {
    var error = function() { return msg || "explicit failure"; }
    this.assert(false, error, error);
    return this;
  };

  /**
   * Function bind implementation.
   */

  function bind (fn, scope) {
    return function () {
      return fn.apply(scope, arguments);
    }
  }

  /**
   * Array every compatibility
   *
   * @see bit.ly/5Fq1N2
   * @api public
   */

  function every (arr, fn, thisObj) {
    var scope = thisObj || global;
    for (var i = 0, j = arr.length; i < j; ++i) {
      if (!fn.call(scope, arr[i], i, arr)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  function indexOf (arr, o, i) {
    if (Array.prototype.indexOf) {
      return Array.prototype.indexOf.call(arr, o, i);
    }

    if (arr.length === undefined) {
      return -1;
    }

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0
        ; i < j && arr[i] !== o; i++);

    return j <= i ? -1 : i;
  }

  // https://gist.github.com/1044128/
  var getOuterHTML = function(element) {
    if ('outerHTML' in element) return element.outerHTML;
    var ns = "http://www.w3.org/1999/xhtml";
    var container = document.createElementNS(ns, '_');
    var xmlSerializer = new XMLSerializer();
    var html;
    if (document.xmlVersion) {
      return xmlSerializer.serializeToString(element);
    } else {
      container.appendChild(element.cloneNode(false));
      html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
      container.innerHTML = '';
      return html;
    }
  };

  // Returns true if object is a DOM element.
  var isDOMElement = function (object) {
    if (typeof HTMLElement === 'object') {
      return object instanceof HTMLElement;
    } else {
      return object &&
        typeof object === 'object' &&
        object.nodeType === 1 &&
        typeof object.nodeName === 'string';
    }
  };

  /**
   * Inspects an object.
   *
   * @see taken from node.js `util` module (copyright Joyent, MIT license)
   * @api private
   */

  function i (obj, showHidden, depth) {
    var seen = [];

    function stylize (str) {
      return str;
    }

    function format (value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (value && typeof value.inspect === 'function' &&
          // Filter out the util module, it's inspect function is special
          value !== exports &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        return value.inspect(recurseTimes);
      }

      // Primitive types cannot have properties
      switch (typeof value) {
        case 'undefined':
          return stylize('undefined', 'undefined');

        case 'string':
          var simple = '\'' + json.stringify(value).replace(/^"|"$/g, '')
                                                   .replace(/'/g, "\\'")
                                                   .replace(/\\"/g, '"') + '\'';
          return stylize(simple, 'string');

        case 'number':
          return stylize('' + value, 'number');

        case 'boolean':
          return stylize('' + value, 'boolean');
      }
      // For some reason typeof null is "object", so special case here.
      if (value === null) {
        return stylize('null', 'null');
      }

      if (isDOMElement(value)) {
        return getOuterHTML(value);
      }

      // Look up the keys of the object.
      var visible_keys = keys(value);
      var $keys = showHidden ? Object.getOwnPropertyNames(value) : visible_keys;

      // Functions without properties can be shortcutted.
      if (typeof value === 'function' && $keys.length === 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          var name = value.name ? ': ' + value.name : '';
          return stylize('[Function' + name + ']', 'special');
        }
      }

      // Dates without properties can be shortcutted
      if (isDate(value) && $keys.length === 0) {
        return stylize(value.toUTCString(), 'date');
      }
      
      // Error objects can be shortcutted
      if (value instanceof Error) {
        return stylize("["+value.toString()+"]", 'Error');
      }

      var base, type, braces;
      // Determine the object type
      if (isArray(value)) {
        type = 'Array';
        braces = ['[', ']'];
      } else {
        type = 'Object';
        braces = ['{', '}'];
      }

      // Make functions say that they are functions
      if (typeof value === 'function') {
        var n = value.name ? ': ' + value.name : '';
        base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
      } else {
        base = '';
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + value.toUTCString();
      }

      if ($keys.length === 0) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return stylize('' + value, 'regexp');
        } else {
          return stylize('[Object]', 'special');
        }
      }

      seen.push(value);

      var output = map($keys, function (key) {
        var name, str;
        if (value.__lookupGetter__) {
          if (value.__lookupGetter__(key)) {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Getter/Setter]', 'special');
            } else {
              str = stylize('[Getter]', 'special');
            }
          } else {
            if (value.__lookupSetter__(key)) {
              str = stylize('[Setter]', 'special');
            }
          }
        }
        if (indexOf(visible_keys, key) < 0) {
          name = '[' + key + ']';
        }
        if (!str) {
          if (indexOf(seen, value[key]) < 0) {
            if (recurseTimes === null) {
              str = format(value[key]);
            } else {
              str = format(value[key], recurseTimes - 1);
            }
            if (str.indexOf('\n') > -1) {
              if (isArray(value)) {
                str = map(str.split('\n'), function (line) {
                  return '  ' + line;
                }).join('\n').substr(2);
              } else {
                str = '\n' + map(str.split('\n'), function (line) {
                  return '   ' + line;
                }).join('\n');
              }
            }
          } else {
            str = stylize('[Circular]', 'special');
          }
        }
        if (typeof name === 'undefined') {
          if (type === 'Array' && key.match(/^\d+$/)) {
            return str;
          }
          name = json.stringify('' + key);
          if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
            name = name.substr(1, name.length - 2);
            name = stylize(name, 'name');
          } else {
            name = name.replace(/'/g, "\\'")
                       .replace(/\\"/g, '"')
                       .replace(/(^"|"$)/g, "'");
            name = stylize(name, 'string');
          }
        }

        return name + ': ' + str;
      });

      seen.pop();

      var numLinesEst = 0;
      var length = reduce(output, function (prev, cur) {
        numLinesEst++;
        if (indexOf(cur, '\n') >= 0) numLinesEst++;
        return prev + cur.length + 1;
      }, 0);

      if (length > 50) {
        output = braces[0] +
                 (base === '' ? '' : base + '\n ') +
                 ' ' +
                 output.join(',\n  ') +
                 ' ' +
                 braces[1];

      } else {
        output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
      }

      return output;
    }
    return format(obj, (typeof depth === 'undefined' ? 2 : depth));
  }

  expect.stringify = i;

  function isArray (ar) {
    return Object.prototype.toString.call(ar) === '[object Array]';
  }

  function isRegExp(re) {
    var s;
    try {
      s = '' + re;
    } catch (e) {
      return false;
    }

    return re instanceof RegExp || // easy case
           // duck-type for context-switching evalcx case
           typeof(re) === 'function' &&
           re.constructor.name === 'RegExp' &&
           re.compile &&
           re.test &&
           re.exec &&
           s.match(/^\/.*\/[gim]{0,3}$/);
  }

  function isDate(d) {
    return d instanceof Date;
  }

  function keys (obj) {
    if (Object.keys) {
      return Object.keys(obj);
    }

    var keys = [];

    for (var i in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, i)) {
        keys.push(i);
      }
    }

    return keys;
  }

  function map (arr, mapper, that) {
    if (Array.prototype.map) {
      return Array.prototype.map.call(arr, mapper, that);
    }

    var other= new Array(arr.length);

    for (var i= 0, n = arr.length; i<n; i++)
      if (i in arr)
        other[i] = mapper.call(that, arr[i], i, arr);

    return other;
  }

  function reduce (arr, fun) {
    if (Array.prototype.reduce) {
      return Array.prototype.reduce.apply(
          arr
        , Array.prototype.slice.call(arguments, 1)
      );
    }

    var len = +this.length;

    if (typeof fun !== "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len === 0 && arguments.length === 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2) {
      var rv = arguments[1];
    } else {
      do {
        if (i in this) {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      } while (true);
    }

    for (; i < len; i++) {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  }

  /**
   * Asserts deep equality
   *
   * @see taken from node.js `assert` module (copyright Joyent, MIT license)
   * @api private
   */

  expect.eql = function eql(actual, expected) {
    // 7.1. All identical values are equivalent, as determined by ===.
    if (actual === expected) {
      return true;
    } else if ('undefined' != typeof Buffer
      && Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
      if (actual.length != expected.length) return false;

      for (var i = 0; i < actual.length; i++) {
        if (actual[i] !== expected[i]) return false;
      }

      return true;

      // 7.2. If the expected value is a Date object, the actual value is
      // equivalent if it is also a Date object that refers to the same time.
    } else if (actual instanceof Date && expected instanceof Date) {
      return actual.getTime() === expected.getTime();

      // 7.3. Other pairs that do not both pass typeof value == "object",
      // equivalence is determined by ==.
    } else if (typeof actual != 'object' && typeof expected != 'object') {
      return actual == expected;
    // If both are regular expression use the special `regExpEquiv` method
    // to determine equivalence.
    } else if (isRegExp(actual) && isRegExp(expected)) {
      return regExpEquiv(actual, expected);
    // 7.4. For all other Object pairs, including Array objects, equivalence is
    // determined by having the same number of owned properties (as verified
    // with Object.prototype.hasOwnProperty.call), the same set of keys
    // (although not necessarily the same order), equivalent values for every
    // corresponding key, and an identical "prototype" property. Note: this
    // accounts for both named and indexed properties on Arrays.
    } else {
      return objEquiv(actual, expected);
    }
  };

  function isUndefinedOrNull (value) {
    return value === null || value === undefined;
  }

  function isArguments (object) {
    return Object.prototype.toString.call(object) == '[object Arguments]';
  }

  function regExpEquiv (a, b) {
    return a.source === b.source && a.global === b.global &&
           a.ignoreCase === b.ignoreCase && a.multiline === b.multiline;
  }

  function objEquiv (a, b) {
    if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
      return false;
    // an identical "prototype" property.
    if (a.prototype !== b.prototype) return false;
    //~~~I've managed to break Object.keys through screwy arguments passing.
    //   Converting to array solves the problem.
    if (isArguments(a)) {
      if (!isArguments(b)) {
        return false;
      }
      a = pSlice.call(a);
      b = pSlice.call(b);
      return expect.eql(a, b);
    }
    try{
      var ka = keys(a),
        kb = keys(b),
        key, i;
    } catch (e) {//happens when one is a string literal and the other isn't
      return false;
    }
    // having the same number of owned properties (keys incorporates hasOwnProperty)
    if (ka.length != kb.length)
      return false;
    //the same set of keys (although not necessarily the same order),
    ka.sort();
    kb.sort();
    //~~~cheap key test
    for (i = ka.length - 1; i >= 0; i--) {
      if (ka[i] != kb[i])
        return false;
    }
    //equivalent values for every corresponding key, and
    //~~~possibly expensive deep test
    for (i = ka.length - 1; i >= 0; i--) {
      key = ka[i];
      if (!expect.eql(a[key], b[key]))
         return false;
    }
    return true;
  }

  var json = (function () {
    "use strict";

    if ('object' == typeof JSON && JSON.parse && JSON.stringify) {
      return {
          parse: nativeJSON.parse
        , stringify: nativeJSON.stringify
      }
    }

    var JSON = {};

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    function date(d, key) {
      return isFinite(d.valueOf()) ?
          d.getUTCFullYear()     + '-' +
          f(d.getUTCMonth() + 1) + '-' +
          f(d.getUTCDate())      + 'T' +
          f(d.getUTCHours())     + ':' +
          f(d.getUTCMinutes())   + ':' +
          f(d.getUTCSeconds())   + 'Z' : null;
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

  // If the string contains no control characters, no quote characters, and no
  // backslash characters, then we can safely slap some quotes around it.
  // Otherwise we must also replace the offending characters with safe escape
  // sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
            var c = meta[a];
            return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }


    function str(key, holder) {

  // Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

  // If the value has a toJSON method, call it to obtain a replacement value.

        if (value instanceof Date) {
            value = date(key);
        }

  // If we were called with a replacer function, then call the replacer to
  // obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

  // What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

  // JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

  // If the value is a boolean or null, convert it to a string. Note:
  // typeof null does not produce 'null'. The case is included here in
  // the remote chance that this gets fixed someday.

            return String(value);

  // If the type is 'object', we might be dealing with an object or an array or
  // null.

        case 'object':

  // Due to a specification blunder in ECMAScript, typeof null is 'object',
  // so watch out for that case.

            if (!value) {
                return 'null';
            }

  // Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

  // Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

  // The value is an array. Stringify every element. Use null as a placeholder
  // for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

  // Join all of the elements together, separated with commas, and wrap them in
  // brackets.

                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

  // If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

  // Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

  // Join all of the member texts together, separated with commas,
  // and wrap them in braces.

            v = partial.length === 0 ? '{}' : gap ?
                '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

  // If the JSON object does not yet have a stringify method, give it one.

    JSON.stringify = function (value, replacer, space) {

  // The stringify method takes a value and an optional replacer, and an optional
  // space parameter, and returns a JSON text. The replacer can be a function
  // that can replace values, or an array of strings that will select the keys.
  // A default replacer method can be provided. Use of the space parameter can
  // produce text that is more easily readable.

        var i;
        gap = '';
        indent = '';

  // If the space parameter is a number, make an indent string containing that
  // many spaces.

        if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
                indent += ' ';
            }

  // If the space parameter is a string, it will be used as the indent string.

        } else if (typeof space === 'string') {
            indent = space;
        }

  // If there is a replacer, it must be a function or an array.
  // Otherwise, throw an error.

        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
        }

  // Make a fake root object containing our value under the key of ''.
  // Return the result of stringifying the value.

        return str('', {'': value});
    };

  // If the JSON object does not yet have a parse method, give it one.

    JSON.parse = function (text, reviver) {
    // The parse method takes a text and an optional reviver function, and returns
    // a JavaScript value if the text is a valid JSON text.

        var j;

        function walk(holder, key) {

    // The walk method is used to recursively walk the resulting structure so
    // that modifications can be made.

            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (v !== undefined) {
                            value[k] = v;
                        } else {
                            delete value[k];
                        }
                    }
                }
            }
            return reviver.call(holder, key, value);
        }


    // Parsing happens in four stages. In the first stage, we replace certain
    // Unicode characters with escape sequences. JavaScript handles many characters
    // incorrectly, either silently deleting them, or treating them as line endings.

        text = String(text);
        cx.lastIndex = 0;
        if (cx.test(text)) {
            text = text.replace(cx, function (a) {
                return '\\u' +
                    ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }

    // In the second stage, we run the text against regular expressions that look
    // for non-JSON patterns. We are especially concerned with '()' and 'new'
    // because they can cause invocation, and '=' because it can cause mutation.
    // But just to be safe, we want to reject all unexpected forms.

    // We split the second stage into 4 regexp operations in order to work around
    // crippling inefficiencies in IE's and Safari's regexp engines. First we
    // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
    // replace all simple value tokens with ']' characters. Third, we delete all
    // open brackets that follow a colon or comma or that begin the text. Finally,
    // we look to see that the remaining characters are only whitespace or ']' or
    // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

        if (/^[\],:{}\s]*$/
                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                    .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                    .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

    // In the third stage we use the eval function to compile the text into a
    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
    // in JavaScript: it can begin a block or an object literal. We wrap the text
    // in parens to eliminate the ambiguity.

            j = eval('(' + text + ')');

    // In the optional fourth stage, we recursively walk the new structure, passing
    // each name/value pair to a reviver function for possible transformation.

            return typeof reviver === 'function' ?
                walk({'': j}, '') : j;
        }

    // If the text is not JSON parseable, then a SyntaxError is thrown.

        throw new SyntaxError('JSON.parse');
    };

    return JSON;
  })();

  if ('undefined' != typeof window) {
    window.expect = module.exports;
  }

})(
    this
  , 'undefined' != typeof module ? module : {exports: {}}
);

},{}],7:[function(require,module,exports){
(function (process){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var setImmediate;

    function addFromSetImmediateArguments(args) {
        tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
        return nextHandle++;
    }

    // This function accepts the same arguments as setImmediate, but
    // returns a function that requires no arguments.
    function partiallyApplied(handler) {
        var args = [].slice.call(arguments, 1);
        return function() {
            if (typeof handler === "function") {
                handler.apply(undefined, args);
            } else {
                (new Function("" + handler))();
            }
        };
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    task();
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function installNextTickImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            process.nextTick(partiallyApplied(runIfPresent, handle));
            return handle;
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            global.postMessage(messagePrefix + handle, "*");
            return handle;
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            channel.port2.postMessage(handle);
            return handle;
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
            return handle;
        };
    }

    function installSetTimeoutImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
            return handle;
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(new Function("return this")()));

}).call(this,require("dIgUzB"))
},{"dIgUzB":27}],8:[function(require,module,exports){
'use strict';
var
Legio = require("legio"),
construct = require("legio/construct"),
Task = require("./task");

/** @module legio-async/promise */

/**
 * @constructor
 * @alias module:legio-async/promise
 */
var Promise = construct({
  init: function () {
    this.onFulfilledHandlers = [];
    this.onRejectedHandlers = [];
    this.onNotifiedHandlers = [];

    this.changes = [];

    this.promises = [];
  },

  /** @lends module:legio-async/promise.prototype */
  proto: {
    /** @type {Boolean} */
    pending: true,
    /** @type {Thenable} */
    awaiting: null,
    /** @type {Boolean} */
    fulfilled: false,
    /** @type {Boolean} */
    rejected: false,

    /**
     * @param {Function} [onFulfilled]
     * @param {Function} [onRejected]
     * @returns {Promise}
     */
    then: function (onFulfilled, onRejected) {
      var prom = new Promise();

      // On fulfilled
      if (!Function.is(onFulfilled)) {
        onFulfilled = function (val) {
          prom.fulfill(val);
        };
      }
      if (this.pending) {
        this.onFulfilledHandlers.push(onFulfilled);
      }
      else if (this.fulfilled) {
        Task.run(this.runHandler.bind(this, onFulfilled, prom, this.value));
      }

      // On rejected
      if (!Function.is(onRejected)) {
        onRejected = function (val) {
          prom.reject(val);
        };
      }
      if (this.pending) {
        this.onRejectedHandlers.push(onRejected);
      }
      else if (this.rejected) {
        Task.run(this.runHandler.bind(this, onRejected, prom, this.value));
      }

      if (this.pending) {
        this.promises.push(prom);
      }

      return prom;
    },

    /**
     * @param {Function} onRejected
     * @returns {Promise}
     */
    failed: function (handler) {
      return this.then(null, handler);
    },

    /**
     * @param {Function} onSettled
     * @returns {Promise}
     */
    settled: function (handler) {
      return this.then(handler, handler);
    },

    /**
     * @param {Function} onNotified
     * @returns {this}
     */
    notified: function (onNotified) {
      if (Function.is(onNotified) && this.pending) {
        this.onNotifiedHandlers.push(onNotified);
      }

      return this;
    },

    /**
     * Runs the given function after the fulfillment with the value as a parameter
     * and stores the result as a new value.
     * @param {Function} fn
     * @returns {this}
     */
    run: function (fn) {
      if (Function.is(fn)) {
        if (this.pending) {
          this.changes.push(fn);
        }
        else if (this.fulfilled) {
          this.value = fn(this.value);
        }
      }

      return this;
    },

    /**
     * @param {*} value
     * @returns {Boolean} A boolean indicating whether the promise was fulfilled.
     */
    fulfill: function (val) {
      if (this.pending && !this.awaiting) {
        this.pending = false;
        this.fulfilled = true;

        for (var i = 0; i < this.changes.length; ++i) {
          var fn = this.changes[i];

          val = fn(val);
        }

        this.value = val;

        this.emitEvent(this.onFulfilledHandlers, val);
        this.clear();

        return true;
      }
      return false;
    },

    /**
     * @param {*} reason
     * @returns {Boolean} A boolean indicating whether the promise was rejected.
     */
    reject: function (val) {
      if (this.pending && !this.awaiting) {
        this.pending = false;
        this.rejected = true;
        this.value = val;

        this.emitEvent(this.onRejectedHandlers, val);
        this.clear();

        return true;
      }
      return false;
    },

    adoptState: function (thenable, then, isPromise) {
      var
      self = this,
      resolve = isPromise ? this.fulfill : this.resolve;

      this.awaiting = thenable;

      then.call(
        thenable,
        function (val) {
          if (self.awaiting === thenable) {
            self.awaiting = null;
            resolve.call(self, val);
          }
        },
        function (val) {
          if (self.awaiting === thenable) {
            self.awaiting = null;
            self.reject(val);
          }
        }
      );
    },

    /**
     * @param {*} x
     */
    resolve: function (val) {
      if (this.awaiting) {
        return;
      }

      if (this === val) {
        this.reject(new TypeError("Can't resolve a promise with the same promise!"));
        return;
      }

      if (val) {
        if (val instanceof Promise) {
          this.adoptState(val, val.then, true);
          return;
        }

        if ((Object.isAny(val) || Function.is(val))) {
          try {
            var then = val.then;
            if (Function.is(then)) {
              this.adoptState(val, then);
              return;
            }
          }
          catch (ex) {
            if (this.awaiting === val) {
              this.awaiting = null;
            }
            this.reject(ex);
            return;
          }
        }
      }

      this.fulfill(val);
    },

    /**
     * @param {*} value
     * @returns {Boolean} A boolean indicating whether the promise was notified.
     */
    notify: function (val) {
      if (this.pending) {
        this.emitEvent(this.onNotifiedHandlers, val, true);

        return true;
      }
      return false;
    },

    /**
     * @returns {Function}
     */
    bindFulfill: function () {
      return this.fulfill.bindList(this, arguments);
    },

    /**
     * @returns {Function}
     */
    bindReject: function () {
      return this.reject.bindList(this, arguments);
    },

    /**
     * @returns {Function}
     */
    bindResolve: function () {
      return this.resolve.bindList(this, arguments);
    },

    /**
     * @returns {Function}
     */
    bindNotify: function () {
      return this.notify.bindList(this, arguments);
    },

    emitEvent: function (handlers, val, notification) {
      var self = this, promises = this.promises;
      Task.run(function () {
        for (var i = 0, j = handlers.length; i < j; ++i) {
          self.runHandler(handlers[i], notification ? self : promises[i], val, notification);
        }
      });
    },
    runHandler: function (handler, promise, val, notification) {
      var hasPromise = promise instanceof Promise;

      try {
        var res = handler(val);

        if (!notification && hasPromise) {
          promise.resolve(res);
        }
      }
      catch (ex) {
        if (hasPromise) {
          promise.reject(ex);
        }
      }
    },

    clear: function () {
      delete this.onFulfilledHandlers;
      delete this.onRejectedHandlers;
      delete this.onNotifiedHandlers;

      delete this.changes;

      delete this.promises;
    },

    /**
     * @param {Function} fn A function in the node-async-style form (err, res)
     * @returns {Promise}
     */
    nodeifyThen: function (fn) {
      return this.then(
        function (val) {
          fn(null, val);
        },
        function (err) {
          fn(err);
        }
      );
    },

    /**
     * Returns a function in the node-async-style form which when called resolves the promise
     * @returns {Function}
     */
    nodeifyResolve: function () {
      var self = this;
      return function (err, res) {
        if (err) {
          self.reject(err);
          return;
        }

        self.fulfill(res);
      };
    }
  },

  /** @lends module:legio-async/promise */
  own: {
    /**
     * @param {Promise[]} list
     * @returns {Promise}
     */
    all: function (list, awaitResolution) {
      var
      wrapper = new Promise(),

      len, count, res,

      rejected = false, reason,

      resolve = function () {
        if (wrapper.pending && --count === 0) {
          if (rejected) {
            wrapper.reject(reason);
          }
          else {
            wrapper.fulfill(res);
          }
        }
      },
      tryFulfill = function (key, val) {
        res[key] = val;

        resolve();
      },
      reject = awaitResolution ? function (err) {
        rejected = true;
        reason = err;

        resolve();
      } : wrapper.bindReject();

      if (Array.is(list)) {
        count = len = list.length;
        res = [];

        for (var i = 0; i < len; ++i) {
          list[i].then(tryFulfill.bind(null, i), reject);
        }
      }
      else {
        var keys = Object.keys(list);

        count = len = keys.length;
        res = {};

        for (var i = 0; i < len; ++i) {
          var key = keys[i];

          list[key].then(tryFulfill.bind(null, key), reject);
        }
      }

      return wrapper;
    },

    /**
     * @param {Promise[]} list
     * @returns {Promise}
     */
    allSettled: function (list) {
      return Promise.all(list, true);
    },

    /**
     * @param {Thenable} thenable
     * @returns {Promise}
     */
    when: function (thenable) {
      var prom = new Promise();

      prom.resolve(thenable);

      return prom;
    }
  }
});

var PromiseProto = Promise.prototype;

/**
 * Alias for {@link module:legio-async/promise#then}
 * @alias module:legio-async/promise#done
 * @function
 */
PromiseProto.done = PromiseProto.then;

/**
 * Alias for {@link module:legio-async/promise#failed}
 * @alias module:legio-async/promise#catch
 * @function
 */
PromiseProto["catch"] = PromiseProto.failed;

/**
 * Alias for {@link module:legio-async/promise#settled}
 * @alias module:legio-async/promise#finally
 * @function
 */
PromiseProto["finally"] = PromiseProto.settled;

module.exports = Promise;

},{"./task":9,"legio":21,"legio/construct":10}],9:[function(require,module,exports){
(function (global){
'use strict';
var
Legio = require("legio");
require("setimmediate");

/** @module legio-async/task */

/** @alias module:legio-async/task */
var Task = {
  /**
   * Runs the given function asynchronously.
   * @param {Function} fn
   */
  run: function (fn) {
    global.setImmediate(fn);
  }
};

module.exports = Task;

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"legio":21,"setimmediate":7}],10:[function(require,module,exports){
'use strict';
var
Legio = require("./std");

/** @module legio/construct */

/**
 * @typedef config
 * @property {Function} init The constructor function
 * @property {Object} [proto] The prototype of the constructor
 * @property {constructor} [inherit] An inherited constructor
 * @property {Object} [own] An object of static properties
 * @property {Object[]} [mixin] An array of mixins
 */

/**
 * @callback superCall
 * @param {String} methodName
 * @param {Array} [args]
 */

/**
 * @typedef construct
 * @type {Function}
 * @property {Function} [Super] The inherited constructor
 * @property {Function} [superInit] A method which calls the inherited constructor with given arguments.
 * @property {superCall} [superCall] A method which calls an inherited method.
 */

/**
 * A function which generates a special constructor using the data argument.
 * @alias module:legio/construct
 * @param {config}
 * @returns {construct}
 *
 * @example
    var A = construct({
      init: function (a) {
        this.a = a;
      },

      proto: {
        toString: function () {
          return "a: " + this.a;
        }
      }
    });

    var Show = {
      show: function () {
        alert(this.a + ", " + this.b);
      }
    };

    var B = construct({
      inherit: A,

      init: function (a, b) {
        this.superInit(a);

        this.b = b;
      },

      proto: {
        toString: function () {
          return this.superCall("toString") + ", b: " + this.b;
        }
      },

      mixin: [Show],

      own: {
        create: function (a, b) {
          return new B(a, b);
        }
      }
    });
 */
function construct(data) {
  var
  Con = data.init,
  Super = data.inherit,
  own = data.own,
  mixins = data.mixin,
  proto = data.proto;

  if (Super) {
    inherits(Con, Super);
    Con.assign(Super);
  }
  // else if (Parent === null) {
    // Fn.prototype = Object.create(null);
    // Parent = true;
  // }

  if (mixins) {
    for (var i = 0, j = mixins.length; i < j; ++i) {
      Con.mixin(mixins[i]);
    }
  }

  if (proto) {
    if (Super || mixins) {
      Con.mixin(proto);
    }
    else {
      Con.prototype = proto;
    }
  }

  if (own) {
    Con.assign(own);
  }

  Con.prototype.constructor = Con;

  return Con;
}

// This function is used to call the super constructor (in inherited constructs)
function superInit() {
  var
  sup = this.Super,
  proto = sup.prototype;

  this.Super = proto.Super;
  sup.apply(this, arguments);
  this.Super = sup;
}

// This method calls a method of the super construct
function superCall(name, args) {
  var
  sup = this.Super,
  proto = sup.prototype;

  this.Super = proto.Super;
  var res = proto[name].apply(this, args);
  this.Super = sup;

  return res;
}

// This method is used for the inheritance using the Object.create for the prototype
function inherits(Con, Super) {
  var proto = Con.prototype = Object.create(Super.prototype);

  proto.Super = Super;
  proto.superInit = superInit;
  proto.superCall = superCall;
}

module.exports = construct;

},{"./std":21}],11:[function(require,module,exports){
'use strict';

/** @class Array */

var
ObjectProto = Object.prototype,
objToStr = ObjectProto.toString,
ArrayProto = Array.prototype,
arraySlice = ArrayProto.slice,
arrayPush = ArrayProto.push,
arraySplice = ArrayProto.splice;

if (!Array.isArray || Object.DEBUG) {
  /**
   * Alias for {@link Array.is}
   * @param {*} value
   * @returns {Boolean}
   */
  Array.isArray = function (array) { return objToStr.call(array) === "[object Array]"; };
}
/**
 * Determines whether the given value is an array.
 * @function
 * @param {*} value
 * @returns {Boolean}
 */
Array.is = Array.isArray;

if (!Array.from || Object.DEBUG) {
//  Array.from = function (obj, from, to) {
//    from === undefined && (from = 0);
//
//    if (obj) {
//      to === undefined && (to = obj.length);
//
//      try {
//        return arraySlice.call(obj, from, to);
//      }
//      catch (ex) {
//        var array = [];
//        for (var i = from; i < to; ++i) {
//          array.push(obj[i]);
//        }
//        return array;
//      }
//    }
//
//    return [];
//  };

  /**
   * @param {Object} object Array-like object
   * @param {Function} [mapFunction] (this = that, value, key)
   * @param {*} [that]
   * @returns {Array}
   */
  Array.from = function (obj, mapFn, that) {
    if (obj === null || obj === undefined) {
      throw TypeError("Array.from requires an object.");
    }

    var
    isMapFn = mapFn !== undefined,
    len = Number.parse(obj.length).trunc() || 0,
    array = new Array(len);

    for (var i = 0; i < len; ++i) {
      array[i] = isMapFn ? mapFn.call(that, obj[i], i) : obj[i];
    }

    return array;
  };
}

/**
 * Adds items to the array.
 * @alias Array#add
 * @param {Array}
 * @returns {this}
 */
ArrayProto.add = function (items) {
  arrayPush.apply(this, items);

  return this;
};

/**
 * Similar to {@link Array#add}, but accepts items as arguments.
 * @alias Array#tack
 * @param {...*} items
 * @returns {this}
 */
ArrayProto.tack = function () {
  arrayPush.apply(this, arguments);

  return this;
};

/**
 * Removes the item (if it is in the array) from the array.
 * @alias Array#remove
 * @param {*}
 * @returns {this}
 */
ArrayProto.remove = function (item) {
  var ind = this.indexOf(item);
  if (ind !== -1) {
    this.splice(ind, 1);
  }

  return this;
};

/**
 * Removes an item at the given index from the array.
 * @alias Array#removeAt
 * @param {Number} [index=0]
 * @param {Number} [amount=1]
 * @returns {this}
 */
ArrayProto.removeAt = function (ind, amount) {
  amount === undefined && (amount = 1);

  this.splice(ind, amount);

  return this;
};

/**
 * Inserts the given items in the array at the given index.
 * @alias Array#insert
 * @param {Number}
 * @param {Array}
 * @returns {this}
 */
ArrayProto.insert = function (index, items) {
  arraySplice.apply(this, [index, 0].add(items));

  return this;
};

/**
 * @alias Array#first
 * @returns {*}
 */
ArrayProto.first = function () {
  return this[0];
};

/**
 * @alias Array#last
 * @returns {*}
 */
ArrayProto.last = function () {
  return this[this.length - 1];
};

/**
 * Executes the given function for every item in the array.
 * @alias Array#each
 * @param {Function} callback (this = this, value, index, array = this)
 * @param {Number} [fromIndex] inclusive
 * @param {Number} [toIndex] exclusive
 * @returns {this}
 */
ArrayProto.each = function (func, from, to) {
  from === undefined && (from = 0);
  to === undefined && (to = this.length);

  for (var i = from; i < to; ++i) {
    if (func.call(this, this[i], i, this) === false) {
      break;
    }
  }

  return this;
};

if (!ArrayProto.indexOf || Object.DEBUG) {
  /**
   * @alias Array#indexOf
   * @param {*}
   * @param {Number=}
   * @returns {Number}
   */
  ArrayProto.indexOf = function (value, from) {
    from === undefined && (from = 0);

    for (var i = from, j = this.length; i < j; ++i) {
      if (this[i] === value) {
        return i;
      }
    }

    return -1;
  };
}
if (!ArrayProto.lastIndexOf || Object.DEBUG) {
  /**
   * @alias Array#lastIndexOf
   * @param {*}
   * @param {Number=}
   * @returns {Number}
   */
  ArrayProto.lastIndexOf = function (value, from) {
    from === undefined && (from = this.length - 1);

    for (var i = from; i >= 0; i--) {
      if (this[i] === value) {
        return i;
      }
    }

    return -1;
  };
}

/**
 * @callback Array.Callback
 * @this that
 * @param {*} value
 * @param {Number} index
 * @param {Array} array
 * @returns {undefined|Boolean|*}
 */
/**
 * @callback Array.ReduceCallback
 * @param {*} current
 * @param {*} value
 * @param {Number} index
 * @param {Array} array
 * @returns {*} Passed as the next `current`.
 */

if (!ArrayProto.forEach || Object.DEBUG) {
  /**
   * @alias Array#forEach
   * @param {Array.Callback} callback
   * @param {*} [that]
   */
  ArrayProto.forEach = function (func, that) {
    for (var i = 0; i < this.length; ++i) if (i in this) {
      func.call(that, this[i], i, this);
    }
  };
}
if (!ArrayProto.filter || Object.DEBUG) {
  /**
   * @alias Array#filter
   * @param {Array.Callback} callback
   * @param {*} [that]
   * @returns {Array}
   */
  ArrayProto.filter = function (func, that) {
    var result = [];
    for (var i = 0; i < this.length; ++i) if (i in this) {
      if (func.call(that, this[i], i, this)) {
        result.push(this[i]);
      }
    }
    return result;
  };
}
if (!ArrayProto.every || Object.DEBUG) {
  /**
   * @alias Array#every
   * @param {Array.Callback} callback
   * @param {*} [that]
   * @returns {Boolean}
   */
  ArrayProto.every = function (func, that) {
    for (var i = 0; i < this.length; ++i) if (i in this) {
      if (!func.call(that, this[i], i, this)) {
        return false;
      }
    }
    return true;
  };
}
if (!ArrayProto.some || Object.DEBUG) {
  /**
   * @alias Array#some
   * @param {Array.Callback} callback
   * @param {*} [that]
   * @returns {Boolean}
   */
  ArrayProto.some = function (func, that) {
    for (var i = 0; i < this.length; ++i) if (i in this) {
      if (func.call(that, this[i], i, this)) {
        return true;
      }
    }
    return false;
  };
}
if (!ArrayProto.map || Object.DEBUG) {
  /**
   * @alias Array#map
   * @param {Array.Callback} callback
   * @param {*} [that]
   * @returns {Array}
   */
  ArrayProto.map = function (func, that) {
    var result = [];
    for (var i = 0; i < this.length; ++i) if (i in this) {
      result.push(func.call(that, this[i], i, this));
    }
    return result;
  };
}
if (!ArrayProto.reduce || Object.DEBUG) {
  /**
   * @alias Array#reduce
   * @param {Array.ReduceCallback} callback
   * @param {*} [current=this.first()]
   * @returns {Array}
   */
  ArrayProto.reduce = function (func, current) {
    var i = 0;
    current === undefined && (current = this[i++]);

    for (; i < this.length; ++i) if (i in this) {
      current = func(current, this[i], i, this);
    }
    return current;
  };
}
if (!ArrayProto.reduceRight || Object.DEBUG) {
  /**
   * @alias Array#reduceRight
   * @param {Array.ReduceCallback} callback
   * @param {*} [current=this.last()]
   * @returns {Array}
   */
  ArrayProto.reduceRight = function (func, current) {
    var i = this.length - 1;
    current === undefined && (current = this[i--]);

    for (; i >= 0; --i) if (i in this) {
      current = func(current, this[i], i, this);
    }
    return current;
  };
}

if (!ArrayProto.find || Object.DEBUG) {
  /**
   * @alias Array#find
   * @param {Array.Callback} callback
   * @param {*} [that]
   * @returns {*}
   */
  ArrayProto.find = function (func, that) {
    for (var i = 0; i < this.length; ++i) if (i in this) {
      var item = this[i];

      if (func.call(that, item, i, this)) {
        return item;
      }
    }
  };
}
if (!ArrayProto.findIndex || Object.DEBUG) {
  /**
   * @alias Array#findIndex
   * @param {Array.Callback} callback
   * @param {*} [that]
   * @returns {Number}
   */
  ArrayProto.findIndex = function (func, that) {
    for (var i = 0; i < this.length; ++i) if (i in this) {
      var item = this[i];

      if (func.call(that, item, i, this)) {
        return i;
      }
    }

    return -1;
  };
}

},{}],12:[function(require,module,exports){
'use strict';

/** @class Boolean */

/**
 * Determines whether the given value is a boolean.
 * @param {*} value
 * @returns {Boolean}
 */
Boolean.is = function (obj) { return typeof obj === "boolean"; };

},{}],13:[function(require,module,exports){
'use strict';

/** @class Date */

var
DateProto = Date.prototype;

if (!Date.now || Object.DEBUG) {
  /**
   * Gives the current UNIX timestamp in milliseconds.
   * @returns {Number}
   */
  Date.now = function () { return +(new Date()); };
}

/**
 * Returns the number of the day in ISO format (Monday = 1, Sunday = 7).
 * @alias Date#getISODay
 * @returns {Number}
 */
DateProto.getISODay = function () { return this.getDay() || 7; }

/**
 * @alias Date#getWeek
 * @returns {Number}
 */
DateProto.getWeek = function () {
  var d = new Date(+this);
  d.setHours(0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 8.64e7) + 1) / 7);
};

/**
 * @alias Date#getYearOfWeek
 * @returns {Number}
 */
DateProto.getYearOfWeek = function () {
  var d  = new Date(+this);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));

  return d.getFullYear();
};

},{}],14:[function(require,module,exports){
'use strict';

/** @class Function */

var
FunctionProto = Function.prototype;

/**
 * Determines whether the given value is a function.
 * @param {*} value
 * @returns {Boolean}
 */
Function.is = function (obj) { return typeof obj === "function"; };

if (!FunctionProto.bind || Object.DEBUG) {
  /**
   * @alias Function#bind
   * @param {Object} that
   * @param {...*} args
   * @returns {Function}
   * @throws {TypeError}
   */
  FunctionProto.bind = function (that) {
    if (!Function.is(this)) {
      throw new TypeError("Can't bind anything except funcitons!");
    }

    var
    func = this,
    Empty = function () {};

    Empty.prototype = func.prototype;

    if (arguments.length <= 1) {
      return function () { return func.apply(this instanceof Empty && that ? this : that, arguments); };
    }

    var args = Array.from(arguments).removeAt(0);
    return function () { return func.apply(this instanceof Empty && that ? this : that, args.concat(Array.from(arguments))); }
  };
}

/**
 * @alias Function#bindList
 * @param {Object} that
 * @param {Array} args
 * @returns {Function}
 * @throws {TypeError}
 */
FunctionProto.bindList = function (that, args) {
  return this.bind.apply(this, [that].add(args));
};

/**
 * @alias Function#mixin
 * @desc Assigns properties of the given object into the function's prototype.
 * @param {Object} object
 * @returns {this}
 */
FunctionProto.mixin = function (obj) {
  var proto = this.prototype;
  Object.assign(proto, obj);
  proto.constructor = this;
  return this;
};

/**
 * @alias Function#assign
 * @desc Assigns properties of the given object directly into the function as static properties.
 * @param {Object} object
 * @returns {this}
 */
FunctionProto.assign = function (obj) {
  var proto = this.prototype;
  Object.assign(this, obj);
  this.prototype = proto;
  return this;
};

},{}],15:[function(require,module,exports){
'use strict';

/** @namespace Math */

/**
 * Returns a random number within the limit (inclusive).
 * @param {Number}
 * @param {Number}
 * @returns {Number}
 */
Math.rand = function (from, to) { return from + Math.floor(Math.random() * (to - from + 1)); };

if (!Math.sign || Object.DEBUG) {
  /**
   * @param {Number} number
   * @returns {Number} (-1 | 0 | 1)
   */
  Math.sign = function (num) { return num === 0 ? 0 : (num > 0 ? 1 : -1); };
}

if (!Math.trunc || Object.DEBUG) {
  /**
   * Returns the integer part of the given number.
   * @param {Number} number
   * @returns {Number}
   */
  Math.trunc = function (num) { return Math[num < 0 ? "ceil" : "floor"](num); };
}

},{}],16:[function(require,module,exports){
'use strict';

/** @class Number */

var
NumberProto = Number.prototype,
pInt = parseInt,
pFloat = parseFloat,
isFin = isFinite;

/**
 * Determines whether the given value is a number.
 * @param {*} value
 * @returns {Boolean}
 */
Number.is = function (obj) { return typeof obj === "number"; };

/**
 * @function
 * @param {*} value
 * @param {Number} [radix]
 * @returns {Number}
 */
Number.parseInt = pInt;

/**
 * @function parseFloat
 * @memberof Number
 * @param {*} value
 * @returns {Number}
 */
/**
 * @function
 * @desc Alias for {@link Number.parseFloat}
 * @param {*} value
 * @returns {Number}
 */
Number.parse = Number.parseFloat = pFloat;

/**
 * @type {Number}
 */
Number.Infinity = Infinity;

/**
 * Global functions working with numbers.
 * Compared to own Number's methods, these convert the value to a number first.
 * @property {Function} isNaN
 * @property {Function} isFinite
 */
Number.global = {
  isNaN: isNaN,
  isFinite: isFin
};

if (!Number.isNaN || Object.DEBUG) {
  /**
   * @param {*} value
   * @returns {Boolean}
   */
  Number.isNaN = function (val) { return val !== val; };
}
if (!Number.isFinite || Object.DEBUG) {
  /**
   * @param {*} value
   * @returns {Boolean}
   */
  Number.isFinite = function (val) {
    return Number.is(val) && isFin(val);
  };
}
if (!Number.isInteger || Object.DEBUG) {
  /**
   * @param {*} value
   * @returns {Boolean}
   */
  Number.isInteger = function (num) {
    return Number.isFinite(num) && num.trunc() === num;
  };
}

/**
 * @param {*} value
 * @returns {Boolean}
 */
Number.isNumeric = function (num) {
  if (Number.is(num)) {
    return isFin(num);
  }
  else if (String.is(num) && num !== "") {
    return Number.isFinite(Number.parse(num));
  }
  return false;
};

/**
 * @alias Number#limitBottom
 * @param {Number}
 * @returns {Number}
 */
NumberProto.limitBottom = function (from) { return Math.max(from, this); }

/**
 * @alias Number#limitTop
 * @param {Number}
 * @returns {Number}
 */
NumberProto.limitTop = function (to) { return Math.min(this, to); }

/**
 * @alias Number#limit
 * @param {Number}
 * @param {Number}
 * @returns {Number}
 */
NumberProto.limit = function (from, to) { return this.limitBottom(from).limitTop(to); };

/**
 * @function Number#trunc
 * @returns {Number}
 */
/**
 * @function
 * @alias Number#toInt
 * @desc Alias for {@link Number#trunc}
 * @returns {Number}
 */
NumberProto.toInt = NumberProto.trunc = function () { return Math.trunc(this); };

/**
 * @alias Number#toFloat
 * @returns {Number}
 */
NumberProto.toFloat = function () { return this; };

/**
 * Default thousands separator used in the format function.
 * @type {String}
 */
Number.FORMAT_THOUSANDS_SEPARATOR = ",";

/**
 * Default decimal mark used in the format function.
 * @type {String}
 */
Number.FORMAT_DECIMAL_MARK = ".";

/**
 * @alias Number#format
 * @param {Number} [decimals=0]
 * @param {String} [thousandsSeparator=","]
 * @param {String} [decimalMark="."]
 * @returns {String}
 */
NumberProto.format = function (dec, thousandsSep, decMark) {
  thousandsSep === undefined && (thousandsSep = Number.FORMAT_THOUSANDS_SEPARATOR);
  decMark === undefined && (decMark = Number.FORMAT_DECIMAL_MARK);

  var
  parts = this.toFixed(dec).split("."),
  intPart = parts[0],
  fracPart = parts[1],
  intLen = intPart.length;

  intPart = intPart.reverse().replace(/(\d{3})/g, "$1" + thousandsSep).reverse();
  if (intLen % 3 === 0) {
    intPart = intPart.slice(1);
  }

  return intPart + (fracPart ? decMark + fracPart : "");
};

// Math functions added to the Number's prototype

/**
 * @alias Number#mod
 * @param {Number}
 * @returns {Number}
 */
NumberProto.mod = function (n) { return ((this % n) + n) % n; };

/**
 * @alias Number#abs
 * @returns {Number}
 */
NumberProto.abs = function () { return Math.abs(this); };

/**
 * @alias Number#round
 * @param {Number} [decimals=0]
 * @returns {Number}
 */
NumberProto.round = function (dec) {
  if (dec) {
    dec = Math.pow(10, dec);
    return Math.round(this * dec) / dec;
  }
  return Math.round(this);
};

/**
 * @alias Number#floor
 * @param {Number} [decimals=0]
 * @returns {Number}
 */
NumberProto.floor = function (dec) {
  if (dec) {
    dec = Math.pow(10, dec);
    return Math.floor(this * dec) / dec;
  }
  return Math.floor(this);
};

/**
 * @alias Number#ceil
 * @param {Number} [decimals=0]
 * @returns {Number}
 */
NumberProto.ceil = function (dec) {
  if (dec) {
    dec = Math.pow(10, dec);
    return Math.ceil(this * dec) / dec;
  }
  return Math.ceil(this);
};

/**
 * @alias Number#pow
 * @param {Number} [exponent=2]
 * @returns {Number}
 */
NumberProto.pow = function (exp) {
  exp === undefined && (exp = 2);

  return Math.pow(this, exp);
};

/**
 * @alias Number#sqrt
 * @returns {Number}
 */
NumberProto.sqrt = function () { return Math.sqrt(this); };

/**
 * @alias Number#log
 * @param {Number} [base=Math.E]
 * @returns {Number}
 */
NumberProto.log = function (base) { return base ? Math.log(this) / Math.log(base) : Math.log(this); };

/**
 * @alias Number#sign
 * @returns {Number} (-1 | 0 | 1)
 */
NumberProto.sign = function () { return Math.sign(this); }

/**
 * Converts degrees to radians.
 * @alias Number#toRad
 * @returns {Number}
 */
NumberProto.toRad = function () { return this * Math.PI / 180; };

/**
 * Converts radians to degrees.
 * @alias Number#toDeg
 * @returns {Number}
 */
NumberProto.toDeg = function () { return this * 180 / Math.PI; };

},{}],17:[function(require,module,exports){
(function (global){
'use strict';

/** @class Object */

var
ObjectProto = Object.prototype,
hasOwn = ObjectProto.hasOwnProperty,
objToStr = ObjectProto.toString;

/**
 * Determines whether the given value is an object.
 * @param {*} value
 * @returns {Boolean}
 */
Object.isAny = function (obj) {
  return typeof obj === "object" && obj !== null;
};

/**
 * Determines whether the given value is a plain (not special) object.
 * @param {*} value
 * @returns {Boolean}
 */
Object.isPlain = function (obj) {
  return Object.isAny(obj) && objToStr.call(obj) === "[object Object]";
};


/**
 * Determines whether the object owns the given property.
 * @param {Object} object
 * @param {String} property
 * @returns {Boolean}
 */
Object.owns = function (obj, prop) { return hasOwn.call(obj, prop); };

if (!Object.is || Object.DEBUG) {
  /**
   * Strict equality with support for NaN and +0/-0 values.
   * @param {*} a
   * @param {*} b
   * @returns {Boolean}
   */
  Object.is = function (a, b) {
    if (a === 0 && b === 0) {
      return 1 / a === 1 / b;
    }
    if (a !== a) {
      return b !== b;
    }
    return a === b;
  };
}
if (!Object.create || Object.DEBUG) {
  /**
   * Returns a new object inheriting form the given object.
   * @param {Object} object
   * @returns {Object}
   */
  Object.create = function (obj) {
    var Empty = function () {};
    Empty.prototype = obj;
    return new Empty();
  };
}
if (!Object.keys || Object.DEBUG) {
  /**
   * Returns an array of all enumerable properties.
   * @param {Object} object
   * @returns {String[]}
   */
  Object.keys = function (obj) {
    var result = [];
    for (var i in obj) if (Object.owns(obj, i)) {
      result.push(i);
    }
    return result;
  };
}

/**
 * Determines whether the object doesn't have any own properties (so it's empty) or is an empty value
 * (null, undefined, 0, NaN, "").
 * @param {*} value
 * @returns {Boolean}
 */
Object.empty = function (obj) {
  if (Object.isAny(obj)) {
    if (Array.is(obj)) {
      return obj.length > 0;
    }

    for (var prop in obj) if (Object.owns(obj, prop)) {
      return false;
    }

    return true;
  }

  return !(Boolean.is(obj) || Function.is(obj) || obj);
};

/**
 * Clones the given object and returns the clone.
 * @param {Object|Array}
 * @param {Boolean} [deep=true]
 * @returns {Object|Array}
 */
Object.clone = function clone(source, deep) {
  deep === undefined && (deep = true);

  if (Array.is(source)) {
    var arr = [];
    for (var i = 0; i < source.length; ++i) {
      arr[i] = deep ? clone(source[i]) : source[i];
    }
    return arr;
  }
  else if (Object.isAny(source) && source !== global) { // && !source.nodeType
    var obj = {};
    for (var i in source) if (Object.owns(source, i)) {
      obj[i] = deep ? clone(source[i]) : source[i];
    }
    return obj;
  }

  return source;
};

if (!Object.assign || Object.DEBUG) {
  /**
   * Extends the object with properties from other objects.
   * @param {Object} object
   * @param {...Object} extensions
   * @returns {Object} The given object
   */
  Object.assign = function assign(obj, extension) {
    if (arguments.length > 2) {
      for (var i = 1; i < arguments.length; ++i) {
        assign(obj, arguments[i]);
      }
    }
    else {
      for (var i in extension) if (Object.owns(extension, i)) {
        obj[i] = extension[i];
      }
    }
    return obj;
  };
}

/**
 * Merges given objects to a single one and returns it.
 * @param {...Object} objects
 * @returns {Object}
 */
Object.merge = function () {
  var out = {};
  for (var i = 0; i < arguments.length; ++i) {
    Object.assign(out, arguments[i]);
  }
  return out;
};

/**
 * Simulates the foreach loop.
 * @param {Object|Array} collection
 * @param {Function} callback
 * @param {Boolean} [arrayLike=false] forces the loop to iterate the object the same way as an array
 * @returns {Object|Array} The given collection
 */
Object.each = function (obj, func, arrayLike) {
  if (Array.is(obj) || arrayLike) {
    for (var i = 0; i < obj.length; ++i) {
      if (func.call(obj, obj[i], i, obj) === false) {
        break;
      }
    }

    return obj;
  }

  for (var i in obj) if (hasOwn.call(obj, i)) {
    if (func.call(obj, obj[i], i, obj) === false) {
      break;
    }
  }

  return obj;
};

/**
 * Convert the given object to a query string.
 * @param {Object|Array} object
 * @param {String} [namespace]
 * @returns {String}
 */
Object.toQueryString = function toQueryString(obj, ns) {
  var res = [];

  Object.each(obj, function (item, i) {
    if (item === undefined) { return; }

    var key = ns ? ns + "[" + i + "]" : i;

    if (Object.isAny(item)) {
      res.push(toQueryString(item, key));
    }
    else {
      res.push(key.encodeURI() + (item === null ? "" : "=" + String(item).encodeURI()));
    }
  });

  return res.join("&");
};

var
beforeQuery = /^(.*?)\?/,
isInt = /^\d*$/,
allSubkeys = /^(.+?)\[(.*)\]$/;

/**
 * Convert the given query string to an object.
 * @param {String} queryString
 * @param {Boolean} [convertBools=false]
 * @returns {Object}
 */
Object.fromQueryString = function (str, convertBools) {
  var
  res = {},
  items = str.replace(beforeQuery, "").split("&");

  for (var i = 0; i < items.length; ++i) {
    var item = items[i].split("=");

    var
    obj = res,
    key = item[0].decodeURI(),
    val = item.length >= 2 ? item[1].decodeURI() : null,
    subkeys = allSubkeys.exec(key);

    if (subkeys) {
      key = subkeys[1];
      subkeys = subkeys[2].split("][");

      for (var j = 0; j < subkeys.length; ++j) {
        var subkey = subkeys[j];

        if (!Object.owns(obj, key)) {
          obj[key] = isInt.test(subkey) ? [] : {};
        }
        if (!subkey) {
          subkey = obj[key].length;
        }

        obj = obj[key];
        key = subkey;
      }
    }

    if (convertBools) {
      if (val === "true") { val = true; }
      else if (val === "false") { val = false; }
    }

    obj[key] = val;
  }

  return res;
};

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],18:[function(require,module,exports){
'use strict';

/** @class RegExp */

var
RegExpProto = RegExp.prototype;

var specials = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
/**
 * Escapes the given string so it can be used inside of a regular expression.
 * @param {String} string
 * @returns {String}
 */
RegExp.escape = function (str) { return str.replace(specials, "\\$1"); };

/**
 * Returns a string representing RegExp's flags (g, i, m).
 * @alias RegExp#flags
 * @returns {String}
 */
RegExpProto.flags = function () {
  return "g".substr(0, +this.global) + "i".substr(0, +this.ignoreCase) + "m".substr(0, +this.multiline);
};

},{}],19:[function(require,module,exports){
'use strict';

var
map = {},
all = {
  A: "\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F",
  AA: "\uA732",
  AE: "\u00C6\u01FC\u01E2",
  AO: "\uA734",
  AU: "\uA736",
  AV: "\uA738\uA73A",
  AY: "\uA73C",
  B: "\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181",
  C: "\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E",
  D: "\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779",
  DZ: "\u01F1\u01C4",
  Dz: "\u01F2\u01C5",
  E: "\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E",
  F: "\u0046\u24BB\uFF26\u1E1E\u0191\uA77B",
  G: "\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E",
  H: "\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D",
  I: "\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197",
  J: "\u004A\u24BF\uFF2A\u0134\u0248",
  K: "\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2",
  L: "\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780",
  LJ: "\u01C7",
  Lj: "\u01C8",
  M: "\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C",
  N: "\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4",
  NJ: "\u01CA",
  Nj: "\u01CB",
  O: "\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C",
  OI: "\u01A2",
  OO: "\uA74E",
  OU: "\u0222",
  OE: "\u008C\u0152",
  oe: "\u009C\u0153",
  P: "\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754",
  Q: "\u0051\u24C6\uFF31\uA756\uA758\u024A",
  R: "\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782",
  S: "\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784",
  T: "\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786",
  TZ: "\uA728",
  U: "\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244",
  V: "\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245",
  VY: "\uA760",
  W: "\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72",
  X: "\u0058\u24CD\uFF38\u1E8A\u1E8C",
  Y: "\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE",
  Z: "\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762",
  a: "\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250",
  aa: "\uA733",
  ae: "\u00E6\u01FD\u01E3",
  ao: "\uA735",
  au: "\uA737",
  av: "\uA739\uA73B",
  ay: "\uA73D",
  b: "\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253",
  c: "\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184",
  d: "\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A",
  dz: "\u01F3\u01C6",
  e: "\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD",
  f: "\u0066\u24D5\uFF46\u1E1F\u0192\uA77C",
  g: "\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F",
  h: "\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265",
  hv: "\u0195",
  i: "\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131",
  j: "\u006A\u24D9\uFF4A\u0135\u01F0\u0249",
  k: "\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3",
  l: "\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747",
  lj: "\u01C9",
  m: "\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F",
  n: "\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5",
  nj: "\u01CC",
  o: "\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275",
  oi: "\u01A3",
  ou: "\u0223",
  oo: "\uA74F",
  p: "\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755",
  q: "\u0071\u24E0\uFF51\u024B\uA757\uA759",
  r: "\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783",
  s: "\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B",
  t: "\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787",
  tz: "\uA729",
  u:  "\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289",
  v: "\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C",
  vy: "\uA761",
  w: "\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73",
  x: "\u0078\u24E7\uFF58\u1E8B\u1E8D",
  y: "\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF",
  z: "\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763"
};

for (var i in all) if (Object.owns(all, i)) {
  var list = all[i].chars();

  for (var j = 0; j < list.length; ++j) {
    map[list[j]] = i;
  }
}

module.exports = {
  all: all,
  map: map
};

},{}],20:[function(require,module,exports){
'use strict';

/** @class String */

var
StringProto = String.prototype,
pInt = parseInt, pFloat = parseFloat,
encURI = encodeURI, decURI = decodeURI, encURIParam = encodeURIComponent, decURIParam = decodeURIComponent;

/**
 * Determines whether the given value is a string.
 * @param {*} value
 * @returns {Boolean}
 */
String.is = function (obj) { return typeof obj === "string"; };

/**
 * @alias String#replaceAll
 * @param {String} substr
 * @param {String} newSubstr
 * @returns {String}
 */
StringProto.replaceAll = function (from, to) { return this.split(from).join(to); };

/**
 * @alias String#toInt
 * @param {Number} [radix=10]
 * @returns {Number}
 */
StringProto.toInt = function (radix) { return pInt(this, radix || 10); };

/**
 * @alias String#toFloat
 * @returns {Number}
 */
StringProto.toFloat = function () { return pFloat(this); };

/**
 * @alias String#encodeURI
 * @param {Boolean} [partial]
 * @returns {String} URI-encoded value
 */
StringProto.encodeURI = function (partial) { return partial ? encURI(this) : encURIParam(this); };

/**
 * @alias String#decodeURI
 * @param {Boolean} [partial]
 * @returns {String} URI-decoded value
 */
StringProto.decodeURI = function (partial) { return partial ? decURI(this) : decURIParam(this); };

/**
 * @alias String#encodeHTML
 * @returns {String} HTML-encoded value
 */
StringProto.encodeHTML = function () {
  return this.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\//g, "&#47;");
};

/**
 * @alias String#decodeHTML
 * @returns {String} HTML-decoded value
 */
StringProto.decodeHTML = function () {
  return this.replace(/&#(x)?([\w\d]{0,5});/g, function (match, hexa, code) {
    return String.fromCharCode(code.toInt(hexa ? 16 : 10));
  })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
};

/**
 * Default value used in pad functions.
 * @type {String}
 */
String.PADDING = " ";

/**
 * @alias String#padLeft
 * @param {Number} length
 * @param {String} [padString=" "]
 * @returns {String}
 */
StringProto.padLeft = function (n, str) {
  str === undefined && (str = String.PADDING);

  n -= this.length;

  if (n > 0) {
    return str.repeatUntil(n) + this;
  }

  return this;
};

/**
 * @alias String#padRight
 * @param {Number} length
 * @param {String} [padString=" "]
 * @returns {String}
 */
StringProto.padRight = function (n, str) {
  str === undefined && (str = String.PADDING);

  n -= this.length;

  if (n > 0) {
    return this + str.repeatUntil(n);
  }

  return this;
};

/**
 * @alias String#pad
 * @param {Number} length
 * @param {String} [padString=" "]
 * @returns {String}
 */
StringProto.pad = function (n, str) {
  return this.padLeft(this.length + ((n - this.length) / 2).floor(), str).padRight(n, str);
};

/**
 * @alias String#chars
 * @returns {String[]} An array of chars
 */
StringProto.chars = function () { return this.split(""); }

/**
 * @alias String#reverse
 * @returns {String}
 */
StringProto.reverse = function () {
  return this.split("").reverse().join("");
};

/**
 * @alias String#assign
 * @desc Assigns values from the object into variables in curly braces.
 * @param {Object} object
 * @returns {String}
 * @example
    "{test} {noSuchProperty}".assign({ test: "test value" });
    // this results in "test value {noSuchProperty}"
 */
StringProto.assign = function (obj) {
  return this.replace(/\{(\w+)\}/g, function (m, p1) {
    return p1 in obj ? obj[p1] : m;
  });
};

/**
 * @alias String#normalizeLines
 * @desc Replaces both \r\n & \r by just \n.
 * @returns {String}
 */
StringProto.normalizeLines = function () {
  return this.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
};

if (!StringProto.trim || Object.DEBUG) {
  var trimRgx = /^\s+|\s+$/g;

  /**
   * @alias String#trim
   * @memberof String
   * @instance
   * @returns {String}
   */
  StringProto.trim = function () { return this.replace(trimRgx, ""); };
}
if (!StringProto.trimLeft || Object.DEBUG) {
  var trimLeftRgx = /^\s+/g;

  /**
   * @alias String#trimLeft
   * @memberof String
   * @instance
   * @returns {String}
   */
  StringProto.trimLeft = function () { return this.replace(trimLeftRgx, ""); };
}
if (!StringProto.trimRight || Object.DEBUG) {
  var trimRightRgx = /\s+$/g;

  /**
   * @alias String#trimRight
   * @memberof String
   * @instance
   * @returns {String}
   */
  StringProto.trimRight = function () { return this.replace(trimRightRgx, ""); };
}

if (!StringProto.contains || Object.DEBUG) {
  /**
   * @alias String#trim
   * @memberof String
   * @instance
   * @param {String} substr
   * @param {Number} [index=0]
   * @returns {String}
   */
  StringProto.contains = function (str, index) { return this.indexOf(str, index) !== -1; };
}
if (!StringProto.startsWith || Object.DEBUG) {
  /**
   * @alias String#startsWith
   * @memberof String
   * @instance
   * @param {String} substr
   * @param {Number} [index=0]
   * @returns {String}
   */
  StringProto.startsWith = function (str, index) {
    index === undefined && (index = 0);

    return this.substr(index, str.length) === str;
  };
}
if (!StringProto.endsWith || Object.DEBUG) {
  /**
   * @alias String#endsWith
   * @memberof String
   * @instance
   * @param {String} substr
   * @param {Number} [index=this.length]
   * @returns {String}
   */
  StringProto.endsWith = function (str, index) {
    index === undefined && (index = this.length);

    index -= str.length;

    return this.substr(index, str.length) === str;
  };
}

if (!StringProto.repeat || Object.DEBUG) {
  /**
   * @alias String#repeat
   * @memberof String
   * @instance
   * @param {Number} times
   * @returns {String}
   * @throws {RangeError}
   */
  StringProto.repeat = function (times) {
    if (times < 0 || times === Number.Infinity) {
      throw new RangeError();
    }

    var res = "";
    for (var i = 0; i < times; ++i) {
      res += this;
    }
    return res;
  };
}

/**
 * @alias String#repeatUntil
 * @param {Number} length
 * @returns {String}
 * @throws {RangeError}
 */
StringProto.repeatUntil = function (length) {
  if (length < 0 || length === Number.Infinity) {
    throw new RangeError();
  }

  if (!this) {
    return this;
  }

  var res = "";
  while (res.length < length) {
    res += this;
  }

  if (res.length > length) {
    res = res.substr(0, length);
  }

  return res;
};

if ("ab".substr(-1) !== "b" || Object.DEBUG) {
  var originalSubstr = StringProto.substr;

  /**
   * @alias String#substr
   * @memberof String
   * @instance
   * @desc Supports negative index.
   * @param {Number} [index=0]
   * @param {Number} [length]
   * @returns {String}
   */
  StringProto.substr = function(start, length) {
    if (start < 0) {
      start = this.length + start;
    }

    return originalSubstr.call(this, start, length);
  };
}

// The strings formatting stuff

var diacriticsMap = require("./string-diacritics").map;
/**
 * @alias String#removeDiacritics
 * @returns {String}
 */
StringProto.removeDiacritics = function () {
  return this.replace(/[^\u0000-\u007E]/g, function (ch) {
    return diacriticsMap[ch] || ch;
  });
};

/**
 * @alias String#capitalize
 * @param {Boolean} [all=false]
 * @returns {String}
 */
StringProto.capitalize = function (all) {
  var rgx = all ? /(^|\s)([a-z])/g : /(^)([a-z])/;
  return this.trim().replace(rgx, function (m) {
    return m.toUpperCase();
  });
};

/**
 * @alias String#dasherize
 * @returns {String}
 */
StringProto.dasherize = function () {
  return this.replace(/(\s|_)/g, "-")
    .replace(/[A-Z]/g, function (m, ind, str) {
      var lowerM = m.toLowerCase();
      if (ind === 0 || str[ind - 1] === "-") {
        return lowerM;
      }
      return "-" + lowerM;
    });
};

/**
 * @alias String#underscore
 * @returns {String}
 */
StringProto.underscore = function () {
  return this.dasherize().replace(/\-/g, "_");
};

/**
 * @alias String#spacify
 * @returns {String}
 */
StringProto.spacify = function () {
  return this.dasherize().replace(/\-+/g, " ");
};

/**
 * @alias String#camelize
 * @param {Boolean} [first=true]
 * @returns {String}
 */
StringProto.camelize = function (first) {
  var words = this.dasherize().split("-");

  for (var i = 0; i < words.length; ++i) {
    var word = words[i];

    if (first === false && word !== "") {
      first = true;
      continue;
    }

    words[i] = word.capitalize();
  }

  return words.join("");
};

/**
 * @alias String#parametrize
 * @desc Creates an URI-safe identifier from the string.
 * @param {String} [separator="-"]
 * @returns {String}
 */
StringProto.parametrize = function (sep) {
  return this.removeDiacritics().replace(/[^a-z0-9\-]+/gi, " ")
    .trim().replace(/ +/g, sep || "-").toLowerCase().encodeURI();
};

},{"./string-diacritics":19}],21:[function(require,module,exports){
'use strict';

/** @module legio */

// Extensions of the base library
require("./ext/object");
require("./ext/array");
require("./ext/function");
require("./ext/regexp");
require("./ext/string");
require("./ext/math");
require("./ext/number");
require("./ext/boolean");
require("./ext/date");

/**
 * @alias module:legio
 * @ignore
 */
function Legio() { return Legio; }

/**
 * @param {*} value
 * @returns {Boolean} A boolean determining whether the value is null or undefined
 */
Legio.empty = function (obj) { return obj === undefined || obj === null; };

/**
 * @param {*} value1
 * @param {*} value2
 * @returns {*} The first of values which is both not null and not undefined. Otherwise the second value.
 */
Legio.choose = function (val1, val2) { return Legio.empty(val1) ? val2 : val1; };

module.exports = Legio;

},{"./ext/array":11,"./ext/boolean":12,"./ext/date":13,"./ext/function":14,"./ext/math":15,"./ext/number":16,"./ext/object":17,"./ext/regexp":18,"./ext/string":20}],22:[function(require,module,exports){
'use strict';
var
expect = require("expect.js"),
Request = require("../index"),
urls = require("./urls");

describe("AJAX", function () {
  describe(".loadText()", function () {
    it("loads the content of a web page in a form of plain text", function (done) {
      Request.loadText(urls.text)
        .then(function (val) {
          expect(val).to.be("test");

          done();
        });
    });

    it("also provides GET and POST functionality", function (done) {
      Request.loadText(urls.gp, { a: 1, b: 2 }, { a: 3, b: 4 })
        .then(function (val) {
          expect(val).to.be("GET:a3b4|POST:a1b2");

          done();
        });
    });

    it("rejects the promise if the HTTP status isn't 200", function (done) {
      Request.loadText(urls.error)
        .failed(function (err) {
          expect(err.status).not.to.be(200);

          done();
        });
    });
  });

  describe(".loadTextSync()", function () {
    it("loads the content of a web page synchronously", function () {
      expect(Request.loadTextSync(urls.text)).to.be("test");
    });

    it("also provides GET and POST functionality", function () {
      expect(Request.loadTextSync(urls.gp, { a: 1, b: 2 }, { a: 3, b: 4 })).to.be("GET:a3b4|POST:a1b2");
    });

    it("throws an error if the HTTP status isn't 200", function () {
      expect(function () {
        Request.loadTextSync(urls.error)
      }).to.throwError();
    });
  });

  describe(".loadJSON() & .loadJSONSync()", function () {
    it("loads JSON data", function (done) {
      Request.loadJSON(urls.json)
        .then(function (data) {
          expect(data).to.eql({ test: 42 });

          done();
        });
    });

    it("loads JSON data synchronously", function () {
      expect(Request.loadJSONSync(urls.json)).to.eql({ test: 42 });
    });
  });
});

},{"../index":1,"./urls":25,"expect.js":6}],23:[function(require,module,exports){
'use strict';

mocha.setup("bdd");

require("./ajax");
require("./script");

mocha.run();

},{"./ajax":22,"./script":24}],24:[function(require,module,exports){
(function (global){
'use strict';
var
expect = require("expect.js"),
Request = require("../index"),
urls = require("./urls");

describe("Script", function () {
  describe(".loadScript()", function () {
    it("loads the script into a web page", function (done) {
      var value;
      global.processScript = function (data) {
        value = data;
      };

      Request.loadScript(urls.jsonp, { callback: "processScript" })
        .then(function (val) {
          expect(value).to.eql({ test: 42 });

          done();
        });
    });
  });

  describe(".loadJSONP()", function () {
    it("automatically creates a callback and loads the script", function (done) {
      Request.loadJSONP(urls.jsonp + "?callback=?")
        .then(function (val) {
          expect(val).to.eql({ test: 42 });

          done();
        });
    });

    it("also provides GET functionality", function (done) {
      Request.loadJSONP(urls.jsonp, { callback: "?" })
        .then(function (val) {
          expect(val).to.eql({ test: 42 });

          done();
        });
    });

    it("adds a default query parameter if none is given", function (done) {
      Request.loadJSONP(urls.jsonp)
        .then(function (val) {
          expect(val).to.eql({ test: 42 });

          done();
        });
    });
  });
});

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../index":1,"./urls":25,"expect.js":6}],25:[function(require,module,exports){
'use strict';

//var main = "http://legio.razem.cz/test/";
var main = "http://localhost/legio-request/test/files/";

module.exports = {
  main: main,

  text: main + "text.txt",
  json: main + "json.txt",

  jsonp: main + "jsonp.php",
  gp: main + "gp.php",

  error: main + "error"
};

},{}],26:[function(require,module,exports){
'use strict';

/**
 * Standard {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
 * @module legio-request/xhr
 */

/**
 * @alias module:legio-request/xhr
 * @constructor
 */
module.exports = require("xmlhttprequest").XMLHttpRequest;

},{"xmlhttprequest":3}],27:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[23])