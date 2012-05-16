var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/node_modules/crdt/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {}
});

require.define("/node_modules/crdt/index.js", function (require, module, exports, __dirname, __filename) {
//index
var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter
var u            = require('./utils')

exports = module.exports = require('./doc')
exports.Row              = require('./row')
exports.createStream     = require('./stream')
exports.sync             = sync
exports.Set              = require('./set')
exports.Seq              = require('./seq')

exports.Doc = exports

function sync(a, b) {
  var as = exports.createStream(a)
  var bs = exports.createStream(b)
  return as.pipe(bs).pipe(as)
}


});

require.define("util", function (require, module, exports, __dirname, __filename) {
var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
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
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
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

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
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

    if (keys.length === 0) {
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

    var output = keys.map(function(key) {
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
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
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
        name = JSON.stringify('' + key);
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
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
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
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

});

require.define("events", function (require, module, exports, __dirname, __filename) {
if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("/node_modules/crdt/utils.js", function (require, module, exports, __dirname, __filename) {
var b = require('between')

exports.clone = 
function (ary) {
  return ary.map(function (e) {
    return Array.isArray(e) ? exports.clone(e) : e
  })
}

exports.randstr   = b.randstr
exports.between   = b.between
exports.strord    = b.strord
exports.merge     = merge
exports.concat    = concat
exports.timestamp = timestamp


function merge(to, from) {
  for(var k in from)
    to[k] = from[k]
  return to
}

var _last = 0
var _count = 1
var LAST
function timestamp () {
  var t = Date.now()
  var _t = t
  if(_last == t) {
//    while(_last == _t)
    _t += ((_count++)/1000) 
  } 
  else _count = 1 

  _last = t

  if(_t === LAST)
    throw new Error('LAST:' + LAST + ',' + _t)
  LAST = _t
  return _t
}

function concat(to, from) {
  while(from.length)
    to.push(from.shift())
  return to
}

});

require.define("/node_modules/crdt/node_modules/between/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {}
});

require.define("/node_modules/crdt/node_modules/between/index.js", function (require, module, exports, __dirname, __filename) {

exports = module.exports = function (chars, exports) {

  chars = chars ||
  '!0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~'

  chars = chars.split('').sort().join('')

  exports = exports || {} 

  exports.randstr   = randstr
  exports.between   = between
  exports.strord    = strord

  exports.lo        = chars[0]
  exports.hi        = chars[chars.length - 1]

  function randstr(l) {
    var str = ''
    while(l--) 
      str += chars[
        Math.floor(
          Math.random() * chars.length 
        )
      ]
    return str
  }

  /*
    SOME EXAMPLE STRINGS, IN ORDER
   
    0
    00001
    0001
    001
    001001
    00101
    0011
    0011001
    001100101
    00110011
    001101
    00111
    01  

    if you never make a string that ends in the lowest char,
    then it is always possible to make a string between two strings.
    this is like how decimals never end in 0. 

    example:

    between('A', 'AB') 

    ... 'AA' will sort between 'A' and 'AB' but then it is impossible
    to make a string inbetween 'A' and 'AA'.
    instead, return 'AAB', then there will be space.

  */

  function between (a, b) {

    var s = '', i = 0

    while (true) {

      var _a = chars.indexOf(a[i])
      var _b = chars.indexOf(b[i])
     
      if(_a == -1) _a = 0
      if(_b == -1) _b = chars.length - 1

      i++

      var c = chars[
          _a + 1 < _b 
        ? Math.round((_a+_b)/2) 
        : _a
      ]

      s += c

      if(a < s && s < b && c != exports.lo)
        return s;
    }
  }

  function strord (a, b) {
    return (
      a == b ?  0
    : a <  b ? -1
    :           1
    )
  }

  return exports
}

exports(null, module.exports)

});

require.define("/node_modules/crdt/doc.js", function (require, module, exports, __dirname, __filename) {
var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter
var Row          = require('./row')
var createStream = require('./stream')
var u            = require('./utils')
var Set          = require('./set')
var Seq          = require('./seq')

inherits(Doc, EventEmitter)

module.exports = Doc
//doc
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/*
  idea: instead of using a tombstone for deletes,
  use a anti-tombstone to show something is alive.
  breathing: count. -- updated by an authority.
  set breathing to 0 to kill something.
  
  if a node has rows that have been garbage collected on the server,
  it will be obvious from the value of breathing.

  node disconnects... makes changes...
  other nodes delete some things, which get garbage collected.

  node reconnects.
  server updates the node, but only increments _breathing for some rows.
  
  clearly, the nodes that do not have an upto date _breathing are either
  dead, or where created by the node while it was offline.

  would breathing need to be a vector clock?
  
  if the disconneded node is still updating the rows,
  maybe it shouldn't be deleted, that is, undeleted.

  may be on to something here... but this needs more thinking.

  will depend on how much churn something has...
*/

function order (a, b) {
  return u.strord(a[2], b[2]) || u.strord(a[3], b[3])
}

function Doc (id) {
  //the id of the doc refers to the instance.
  //that is, to the node.
  //it's used to identify a node 
  this.id = id || '#' + Math.round(Math.random()*1000)
  this.rows = {}
  this.hist = {}
  this.sets = new EventEmitter() //for tracking membership of sets.
}

Doc.prototype.add = function (initial) {

  if(!initial.id)
    throw new Error('id is required')
  var r = this._add(initial.id, 'local')
  r._set(initial, 'local')
  return r
}

Doc.prototype._add = function (id, source) {

  var doc = this

  if(this.rows[id])
    return this.rows[id]

  var r = new Row(id)
  this.rows[id] = r

  function track (changes, source) {
    var update = [r.id, changes, u.timestamp(), doc.id]
    doc.update(update, source)
  }

  r.on('preupdate', track)

  this.emit('add', r)
  return r
}

Doc.prototype.timeUpdated = function (row, key) {
  var h = this.hist[row.id] 
  if(!h) return
  return h[key][3]
}

Doc.prototype.set = function (id, change) {
  var r = this._add(id, 'local')
  return r.set(change)
}

/*
  histroy for each row is indexed by key.
  key -> update that set that key.

  so applying a change is as simple
  as iterating over the keys in the rows hist
  checking if the new update is more recent
  than the hist update
  if so, replace that keys hist.

*/

Doc.prototype.update = function (update, source) {

  //apply an update to a row.
  //take into account histroy.
  //and insert the change into the correct place.
 
  var id      = update[0]
  var changes = update[1]

  var changed = {}

  var row = this._add(id, source)
  var hist = this.hist[id] = this.hist[id] || {}
  var emit = false

  if(!row.validate(changes)) return
  
  for(var key in changes) {
    var value = changes[key]
    if(!hist[key] || order(hist[key], update) < 0) {
      hist[key] = update
      changed[key] = changes[key]
      emit = true 
    }
  }

/*
  probably, there may be mulitple sets that listen to the same key, 
  but activate on different values...

  hang on, in the mean time, I will probably only be managing n < 10 sets. 
  at once, 
*/

  u.merge(row.state, changed)
  for(var k in changed)
    this.sets.emit(k, row, changed) 
  
  if(!emit) return

  row.emit('update', update, changed)
  row.emit('changes', changes, changed)
  this.emit('update', update, source)
}


Doc.prototype.history = function (id) {
  if(!arguments.length) {
    var h = []
    for (var id in this.hist) {
      u.concat(h, this.history(id))
    }
    return h.sort(order)
  }

  var h = []
  var hist = this.hist[id]
  for (var k in hist) {
    if(!~h.indexOf(hist[k]))
      h.push(hist[k])
  }
  return h.sort(order)
}

function _set(self, key, val, type) {
   var id = key + ':' + val
  if(self.sets[id]) return self.sets[id] 
  return self.sets[key + ':' + val] = new type(self, key, val) 
}

Doc.prototype.createSet = function (key, val) {
  return _set(this, key, val, Set)
}

Doc.prototype.createSeq = function (key, val) {
  return _set(this, key, val, Seq)
}

Doc.prototype.toJSON = function () {
  var j = {}
  for (var k in this.rows)
    j[k] = this.rows[k].state
  return j
}



});

require.define("/node_modules/crdt/row.js", function (require, module, exports, __dirname, __filename) {
//row
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = Row

inherits(Row, EventEmitter)

function Row (id) {
  this.id = id
  this.state = {id: id}
}

Row.prototype.set = function (changes, v) {
  if(arguments.length == 2) {
    var k = changes 
    changes = {}
    changes[k] = v
  }

  if(changes.id && changes.id !== this.state.id)
    throw new Error('id cannot be changed')

  this._set(changes, 'local')  
  return this
}

Row.prototype.validate = function (changes) {
  try {
    this.emit('validate', changes)
    return true
  } catch (e) {
    console.error('validation', e.message)
    return false
  } 
}

Row.prototype._set = function (changes, source) {

  //the change is applied by the Doc!
  this.emit('preupdate', changes, source)
  return this
}

Row.prototype.get = function (key) {
  if(key)
    return this.state[key]
  return this.state
}

Row.prototype.toJSON = function () {
  return this.state
}


});

require.define("/node_modules/crdt/stream.js", function (require, module, exports, __dirname, __filename) {

var Stream       = require('stream')
var u            = require('./utils')

module.exports = createStream

//stream
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var streams = 1

function createStream (doc) {
  var id = streams++ //used locally so to prevent writing update back to their source
  var s = new Stream() 
  s.writable = s.readable = true
  var queue = []

  function enqueue() {
    process.nextTick(s.flush)
  }

  function onUpdate (update, source) {
    if(source === id) return
      queue.push(update)
    enqueue()
  }

  s.pipe = function (other) {
    //emitting histroy must be deferred because downstream
    //may not yet exist.  
    u.concat(queue, doc.history()) 
    enqueue()
    doc.on('update', onUpdate)

    return Stream.prototype.pipe.call(this, other)
  }
  
  s.flush = function () {
    while(queue.length)
      s.emit('data', queue.shift())
  }

  s.write = function (data) {
    doc.update(data, id)
    return true
  }

  s.end = function () {
    //stream is disconnecting.
    doc.removeListener('update', onUpdate)
    s.emit('end')
  }

  return s
}



});

require.define("stream", function (require, module, exports, __dirname, __filename) {
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

});

require.define("/node_modules/crdt/set.js", function (require, module, exports, __dirname, __filename) {
var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter
var u            = require('./utils')
var Row          = require('./row')

inherits(Set, EventEmitter)

module.exports = Set

//set
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/*
  a set is just a query.
  could expand this to enable replicating a subset of a document.
  that could enable massive documents that are too large to fit in memory.
  as long as they could be partitioned.

  heh, join queries? or rather, recursive queries,
  for when rows have sets.

  that is my vibe. don't make a database you have to 
  _map_ to your application. pre-map the database.

  could also specify sets like

  //set of all things
  {type: 'thing'}

  //set of things with thier parts
  { type: 'thing',
    parts: {
      parent_id: function (val) {return val == this.id}
    }
  }

  or use map-reduces. remember, if the the reduce is 
  monotonic you don't have to remember each input.
*/

//TODO check if any currently existing items should be in the set. currently, one must create the set before recieving anything.

function Set(doc, key, value) {
  var array = this._array = []
  var rows = this.rows =  {}
  var set = this

  //DO NOT CHANGE once you have created the set.
  this.key = key
  this.value = value

  doc.sets.on(key, function (row, changed) {
    if(changed[key] !== value) return 

    array.push(row)
    rows[row.id] = row
    set.emit('add', row)

    function remove (_, changed) {
      if(row.state[key] === value)
        return set.emit('changes', row, changed)
      var i = array.indexOf(row)
      if(~i) array.splice(i, 1)
      delete rows[row.id]
      set.emit('remove', row)
      row.removeListener('changes', remove)
    }

    row.on('changes', remove)
  })

  this.rm = this.remove = function (row) {
    if(!row) return
    row = this.get(row)
    row = row instanceof Row ? row : doc.rows[row.id]
    return row.set(key, null)
  }
}

Set.prototype.asArray = function () {
  return this._array
}

Set.prototype.toJSON = function () {
  return this._array.map(function (e) {
    return e.state
  }).sort(function (a, b) {
    return u.strord(a._sort || a.id, b._sort || b.id)
  })
}

Set.prototype.each = 
Set.prototype.forEach = function (iter) {
  return this._array.forEach(iter)
}


});

require.define("/node_modules/crdt/seq.js", function (require, module, exports, __dirname, __filename) {

var Set      = require('./set')
var Row      = require('./row')
var inherits = require('util').inherits
var u        = require('./utils')

module.exports = Seq

function sort (array) {
  return array.sort(function (a, b) {
    return u.strord(a.get('_sort'), b.get('_sort'))
  })
}

inherits(Seq, Set)

function find (obj, iter) {
  
  for(var k in obj) {
    var v = obj[k]
    if(iter(v, k, obj)) return v
  }
  return null
}

function Seq (doc, key, val) {

  Set.call(this, doc, key, val)
  var seq = this
  this.on('changes', function (row, changes) {
    if(!changes._sort) return
    sort(seq._array)
    //check if there is already an item with this sort key.
    var prev = 
    find(seq._array, function (other) {
      return other != row && other.get('_sort') == row.get('_sort')
    })

    //nudge it forward if it has the same key.    
    if(prev)
      seq.insert(row, prev, seq.next(row)) 
    else
      seq.emit('move', row)
  })
  this.insert = function (obj, before, after) {

    before = toKey(this.get(before) || '!')
    after  = toKey(this.get(after)  || '~')


    //must get id from the doc,
    //because may be moving this item into this set.
    if('string' === typeof obj)
      obj = doc.rows[obj]

    var _sort = 
       u.between(before, after ) 
     + u.randstr(3) //add a random tail so it's hard
                    //to concurrently add two items with the
                    //same sort.
 
    var r, changes
    if(obj instanceof Row) {
      r = obj
      changes = {_sort: _sort}
      if(r.get(key) != val)
        changes[key] = val
      r.set(changes)
    } else {
      obj._sort = _sort
      obj[key] = val
      r = doc.set(id(obj), obj)
    } 
    sort(this._array)
    return r
  }
}

Seq.prototype.get = function (id) {
  if(!arguments.length)
    return this.array
  return 'string' === typeof id ? this.rows[id] : id
}

function toKey (key) {

  return (
     'string' === typeof key ? key 
  :  key instanceof Row      ? key.get()._sort
  :  key                     ? key._sort
  : null
  )

}

/*
  items are relative to each other,
  more like a linked list.
  although it is possible to make an
  index based interface, before after,
  etc is more natural
*/

function max (ary, test, wantIndex) {
  var max = null, _max = -1
  if(!ary.length) return

  for (var i = 0; i < ary.length; i++)
    if(test(max, ary[i])) max = ary[_max = i]
  return wantIndex ? _max : max
}

Seq.prototype.prev = function (key) {
  key = toKey(this.get(key) || '~')
  //find the greatest item that is less than `key`.
  //since the list is kept in order,
  //a binary search is used.
  //think about that later
  return max(this._array, function (M, m) {
    if(toKey(m) < key)
      return M ? toKey(m) > toKey(M) : true
  })
}

Seq.prototype.next = function (key) {
  key = toKey(this.get(key) || '!')
  return max(this._array, function (M, m) {
    if(toKey(m) > key)
      return M ? toKey(m) < toKey(M) : true
  })
}

function id(obj) {
  return (obj.id 
  ||  obj._id 
  ||  '_' + Date.now() 
    + '_' + Math.round(Math.random()*1000)
  )
}

Seq.prototype.before = function (obj, before) {
  return this.insert(obj, this.prev(before), before)
}

Seq.prototype.after = function (obj, after) {
  return this.insert(obj, after, this.next(after))
}

Seq.prototype.first = function () {
  return this._array[0]
}

Seq.prototype.last = function () {
  return this._array[this._array.length - 1]
}

Seq.prototype.indexOf = function (obj) {
  return this._array.indexOf('string' == typeof obj ? this.rows[obj] : obj)
}

Seq.prototype.at = function (i) {
  return this._array[i]
}

Seq.prototype.unshift = function (obj) {
  return this.insert(obj, '!', this.first())
}

Seq.prototype.push = function (obj) {
  return this.insert(obj, this.last(), '~') 
}

Seq.prototype.length = function () {
  return this._array.length
}

Seq.prototype.pop = function () {
  return this.remove(this.last())
}

Seq.prototype.shift = function () {
  return this.remove(this.first())
}


});

require.define("/node_modules/browser-stream/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {}
});

require.define("/node_modules/browser-stream/index.js", function (require, module, exports, __dirname, __filename) {

var Stream = require('stream').Stream
var EventEmitter = require('events').EventEmitter

module.exports = function (sock) {
  var e = new EventEmitter ()

  //id use socket.io namespaces here, but they are really arwkward in this usecase.
  function _writeStream (s) {
      var DATA = s.name
      var END = 'END_'+s.name
       s.write = function (data) {
        console.log('DATA',DATA, data)
        sock.emit(DATA, data)
        return true
      }
      s.end = function (data) {
        if(data != null) this.write(data)
        sock.emit(END)
      }
      //sock.on('PAUSE_'+name, ...
      //sock.on('DRAIN_'+name, ... 
  }

  function _readStream (s) {
    var DATA = s.name
      , END = 'END_'+s.name
    s.readable = true
    function onData(data) {
      s.emit('data', data)
    }
    function onEnd () {
      s.emit('end')
      sock.removeListener(DATA, onData)
      sock.removeListener(END, onEnd)
    }
    sock.on(DATA, onData)
    sock.on(END, onEnd) 
  }

  function _createStream(opts) {
    var s = new Stream()
    //if either w or r is false, def will be false
    var def = !opts.writable && !opts.readable 
    s.readable = opts.readable || def
    s.writable = opts.writable || def
    console.log('CREATE_STREAM', opts, s)
    s.name = opts.name
    if(s.writable)
      _writeStream(s)
    if(s.readable)
      _readStream(s)
    return s
  }

  e.createWriteStream = function (name) {
    return this.createStream(name, {writable: true})
  }
 
  e.createReadStream = function (name) {
    return this.createStream(name, {readable: true})
  }

  e.createStream = function (name, opts) {
    if(!opts) opts = ('string' === typeof name ? {name: name} : name)
    name = opts.name
    var _opts = {name: name}
    var s = _createStream(opts) //defaults to readable and writable 
    if(s.readable)
      _opts.writable = true
    if(s.writable)
      _opts.readable = true
    console.log('OPTS', _opts)
    sock.emit('CREATE_STREAM', _opts, s)
    return s
  }
  
  sock.on('CREATE_STREAM', function (opts) {
    console.log('CREATE_STREAM', opts)
    var s = _createStream(opts)
    e.emit('connection', s)
    e.emit('open', s) //legacy interface
  })

  return e
} 

});

require.define("/chat.js", function (require, module, exports, __dirname, __filename) {
var crdt = require('crdt')

module.exports =

function createChat (el, doc) {
  var input, CONTENT
  var chat = $(el) //stick everything into the chat 
    .append(CONTENT = $('<div class=chat_text>'))
    .append(input   = $('<input type=text>'))

  messages = null

  var messages = doc.createSet('type', 'message')

  messages.on('add', function (obj) {
    var div, span, a
    div = 
    $('<div class=line>')
      .append(span = $('<span class=message>'))
      .append(a = $('<a href=# class=del>x</a>')
        .click(function () {
          obj.set({__delete: true})
        })
      )

    CONTENT.append(div)

    obj.on('update', function () {
      if(obj.get('__delete')) {
        div.remove()
        obj.removeAllListeners('update')
      }
      span.text(obj.get('text'))
    })

    setTimeout(function () {
    //scroll to bottom
      CONTENT[0].scrollTop = 9999999
    }, 10)

  })

  input.change(function () {
    //enter chat message
    var m = /s\/([^\\]+)\/(.*)/.exec(this.value)
    if(m) {
      var search = m[1]
      var replace = m[2]
      //search & replace
      messages.each(function (e) {
        var item = e.get(), text = item.text
        if(text && ~text.indexOf(search) && !item.__delete) {
          e.set('text', ntext.split(search).join(replace))
        }
      })
    } else 
      doc.set('_'+Date.now(), {text: this.value, type: 'message'})
    this.value = ''
  })
}

});

require.define("/mouses.js", function (require, module, exports, __dirname, __filename) {
/*
  show other mouses of other users.

  so that users don't feel lonely.
*/

var crdt = require('crdt')

module.exports =
function (doc) {

  var mice = doc.createSet('type', 'mouse') 

  var m = doc.add({id: 'user'+doc.id, type: 'mouse'})
  var last = 0
  window.addEventListener('mousemove', function (e) {
    if(last + 100 < Date.now()) {
      var ch = {x: e.x, y: e.y}
      if(!m.get('in')) ch.in = true
      m.set(ch)
      last = Date.now()
    }
  })

  window.addEventListener('mouseout', function (e) {
    if(m.get('in')) {
      m.set({in: false})
    }
  })

  mice.on('add', function (m) {
    console.log('ADD', m)
    var pointer = 
    $('<span class=pointer>' + m.id +'</span>')
      .css({position: 'absolute'})

    $('body').append(pointer)

    m.on('update', function () {
      console.log(m.get('id'), m.get('x'), m.get('y'), m.get('in'))
      pointer.css({
        left: m.get('x')
      , top: m.get('y')
      , display: m.get('in') ? 'block' : 'none'})
    })
  })
} 

});

require.define("/sets.js", function (require, module, exports, __dirname, __filename) {
var crdt = require('crdt')

/*
  add some sets, that items can be dragged and dropped between,
  a la trello.

  refactor this to decouple and to add support for crdt ordering.

  change css to make lists parellel.
  
  'add' link, inplace editing.
*/

function seqWidget( el, seq, template ) {
  el = $(el)
  var name = el.attr('id')
  
  function update (r) { 
    var li = $('#'+r.id)
    li = li.length ? li : $(template(r))

    var i = seq.indexOf(r) 
    if(el.children().index(li) == i) return //already in place

    var next = seq.next(r)
    if (next) li.insertBefore($('#'+next.id)) 
    else el.append(li) 
  }

  seq.on('move', update) //when a member of the set updates

  function change (_, ui) {
    var itemId = ui.item.attr('id')
    var i = $(this).children().index(ui.item)
    //update event is emitted when a item is removed from a set.
    //in that case i will be -1. 
    //changeSet will detect the correct index, though.
    //if item is not already in correct position, move
    if(~i && seq.indexOf(itemId) !== i)
      seq.before(itemId, ui.item.next().attr('id'))
  }

  el.sortable({
    connectWith: '.sortable',
    receive: change,
    update: change
  })

  return el
  
}

module.exports = 
function (div, doc) {
 
  var c = 0
  div = $(div)

  var a = doc.createSeq('set', 'a')
  var b = doc.createSeq('set', 'b')
  var c = doc.createSeq('set', 'c')

  function inplace (initial, cb) {
    var i = $('<input>')
    var done = false
    i.attr('value', initial)
    function edit (e) {
      if(done) return
      done = true
      cb.call(this, this.value)
      i.remove()
    }
    i.change(edit)
    i.blur(edit)
    setTimeout(function () {i.focus()}, 1)
    return i
  }

  function t (r) {
    var text, check
    var el = $('<li id='+r.id + '>')
      .append(text = $('<span>'+r.get('text')+'</span>'))
      .append(check = $('<input type=checkbox>'))

    r.on('update', function () {
      text.text(r.get('text'))
      check.attr('checked', r.get('checked'))
    }) 

    check.attr('checked', !! r.get('checked'))
    check.click(function () {
      r.set({checked: !! check.attr('checked')})
    })

    text.click(function () {
      text.hide()
      el.append(inplace(r.get('text'), function (val) {
        if(val) r.set({text: val})
        text.show()
      }))
    })
    return el
  }

  function st (q) {
    return $('<ul class=sortable id='+q.id+'>')
  }

  function addable (s, q) {
    var add
    var el = $('<div class=sortbox>')
      .append(s)
      .append(add = $('<a href=#>add</a>'))

    add.click(function () {
      add.hide()
      el.append(inplace('', function (val) {
        if(val) q.push({text: val})
        add.show()
      }))
    })
    return el 
  }

  div
    .append(addable(seqWidget(st(a), a, t), a))
    .append(addable(seqWidget(st(b), b, t), b))
    .append(addable(seqWidget(st(c), c, t), c))
 
  /*
    nest the div inside another set...
    so that it is concurrently sortable
    like trello.
  */
 
  div.sortable()

  a.on('move', function (r) {
    console.log('MOVE', r, a.indexOf(r))
  })

  setTimeout(function () {

/*  var n = Math.round(Math.random() * 100)
  a.push({id: 'item' + n, text: 'hello' + n})

  n = Math.round(Math.random() * 100)
  b.push({id: 'item' + n, text: 'hello' + n})

  n = Math.round(Math.random() * 100)
  c.push({id: 'item' + n, text: 'hello' + n})
*/
  }, 100)
}

});

require.define("/client.js", function (require, module, exports, __dirname, __filename) {
    

var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))

var createChat = require('./chat')
var createMice = require('./mouses')
var createSets = require('./sets')

var doc = new crdt.Doc()

$(function () {
  var stream = crdt.createStream(doc)
  stream.pipe(bs.createStream('test')).pipe(stream)
  createChat('#chat', doc)
  //createMice(doc)
  createSets('#sets', doc)
  //  SET = new crdt.Doc()
  //MESSAGES = SET.createSet'type', 'message')
  //var stream = crdt.createStream(SET)
  //stream.pipe(bs.createStream('test')).pipe(stream)
})


});
require("/client.js");
