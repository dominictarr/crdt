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
exports.Set = 
exports.GSet = require('./gset')
exports.Obj = require('./obj')
exports.createStream = require('./stream')

});

require.define("/node_modules/crdt/gset.js", function (require, module, exports, __dirname, __filename) {
module.exports = GSet

var EventEmitter = require('events').EventEmitter
var Obj = require('./obj')
var clone = require('./utils').clone

/*
  GSet -- grow only set.

  base class for other collection types.
*/

/*
  since I want the user to inject the factory function,
  this is too complicated.

  my brain is doing a strang thing.
  it's thinking it would be a good idea to implement a 
  little peer to peer relational db.

IDEAS -- use events instead.

If a relational database was peer to peer, what would that mean?


1. no incremental primary keys.
2. updates only. to delete, set a delete column to true.


one most important thing to achive, after actually having being p2p, is a easy way to attach to UI stuff.

on the one hand, the relational store seems like a natural fit. it just feels insane.

it's resql -- replicated sql.

there arn't any templating languages that support arbitary json, 
so maybe there should be a fairly structured data model.

new Set(id).init({
  users: crdt.Obj().on('change', function (key, value) {
    //register a event listeners for update here...
    //throw if the it does not update.
    //no, because might throw by accident.
    //veto callback? that allows async validation.

    //update the model...

    veto(false) //allow this change
    veto(true, reason)  //this was invalid
    // ... veto basicially means to change back to an old value.
    // also, to remove the change from histroy?
    // this is really a security feature...
    // will have to experiment .

    this example could be currently logged in users.
    if value, add new user.
    var userel = $(userList).find('.'+key)
    if !value, remove user from list...

  }).on('validate', function (change, obj) {
    // throw if not valid. -- this is better.
    say, allow username : boolean
    
  }),  
  //async validation is possible too. it would just be handled like a message that arrived late.
  messages: new Set().on('new', function (obj, veto) {
     //object has id. so don't need to pass key.
     obj
  }).on('validate', function (change, obj, usr_ctx) {
    merge change and obj.get()
    MUST have user: name, (which must be a valid user)
    and text: message.
    MAY NOT update a user context that does not own this username.
  })
  .set('0', {text: 'hello'})
})


*/

function defFactory (id) {

  var set = (Array.isArray(id) && id.length > 1)

  var obj = set ? new GSet(id = id[0]) : new Obj('' + id)
  this[id] = obj.get()

  return obj
}

function GSet(id, state, factory) {
  this.id = id
  this.state = state || {}
  this.objects = {}
  this.queue = []
  this._factory = factory || defFactory
}

GSet.prototype = new EventEmitter()

function getMember (self, key) {
  var f = self._factory
  var obj
  var path = key

  if(Array.isArray(path)) {
    key = path[0]
    if(!path.length)
      throw new Error('path erros')
  }

  if(!self.objects[key]) {

    function enqueue () {
      if(~self.queue.indexOf(obj)) return
      self.queue.push(obj)
      self.emit('queue')
    }

    obj = f.call(self.state, path)
    console.log(obj)

    try {
      self.emit('new', obj, self)
    } catch (e) {
      console.error('validation:', e.message)
      //someone will have to throw away all the changes for this...
      return
    }

    obj = self.objects[key] = obj
    obj.on('queue', enqueue)
  }

  return self.objects[key]
}

GSet.prototype.set =
GSet.prototype.add = function (key, changes, val) {

  if('string' == typeof changes) {
    var _key = changes
    changes = {}
    changes[_key] = val
  }  
  
  if(Array.isArray(key) && key.length == 1)
    key = key[0]
 
  //error if cannot apply this set.

  if ('object' != typeof changes ) {
    throw new Error('cannot do that' +  JSON.stringify(changes))
  }

 //THIS is ugly. maybe just remove the abitily to call set(key, value)
  if(Array.isArray(key)) { 
    var set = getMember(this, key)
    key.shift()
    set.set.call(set, key, changes) 
  } else {
    var obj = getMember(this, key)
    obj && obj.set.call(obj, changes)
  }
  return this
}

GSet.prototype.update = function (update) {
  update = clone(update)
  var path = update[0]
  var obj = getMember(this, path)
  var key = path.shift()
  console.log('upade>>', update)
  if(obj) { // if was not valid, this is null.
    obj.update(update)
    //update events behave different on Set to on Obj.
    //it updates when any member updates.
    this.emit('update', key, obj.get())
  }
}

/*
  this can probably be used as the flush implementation for any
  collection Obj
*/

GSet.prototype.flush = function (obj) {
  var id = this.id
  var updates = []
  var queue = this.queue
  if(!queue.length)
    return
  while(queue.length) {
    //note: an object MAY NOT be a member of more than one set.
    var obj = queue.shift()
    //if obj is a set, it will return an array of updates.
    //
    var flushed = obj instanceof GSet ? obj.flush() : [obj.flush()]

    this.emit('update', obj.id, obj.get())

    while(flushed.length) {
      var update = flushed.shift()
      console.log('>>', update)
      update = clone(update)
      update[0].unshift(id)
      console.log('<<', update)
      updates.push(update)
    }

  }
  
  this.emit('flush', updates)
  return updates
}

GSet.prototype.history = function () {
  var hist = []
  var objects = this.objects
  var id = this.id
  for(var k in objects)
    objects[k].history().forEach(function (e) {
      e = clone(e)
      e[0].unshift(id)
        
      hist.push(e)
    })
  return hist
}

GSet.prototype.toArray =
GSet.prototype.get = function (path) {
  if(!arguments.length)
    return this.state
  //if path is defined, pass to members...
}

GSet.prototype.init = function (schema) {
  var self = this
  for (var id in schema) {
    (function () {
      var obj = self.objects[id] = schema[id]
      self.state[id] = obj.get()
      obj.id = id
      obj.on('queue', 
        function () {
        if(~self.queue.indexOf(obj)) return
        self.queue.push(obj)
        self.emit('queue')
      })
    })()
  }
  return this
}

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

require.define("/node_modules/crdt/obj.js", function (require, module, exports, __dirname, __filename) {

module.exports = Obj

var EventEmitter = require('events').EventEmitter
var clone = require('./utils').clone

//this will be injectable,
//to support different types of models.
//i.e. using backbone or knockout.


function merge(to, from, set) {
  for(var k in from)
    set.call(to, k, from[k])
  return to
}

var defFactory = function (key, val) {
    /*
      or use 
        self.set(key, val)
      or
        self[key] = self[key] ? self[key](val) : ko.observable(val)
    */
    this[key] = val
  }

function Obj (id, state, factory) {
  this.id      = id
  this.state   = state || {}
  this.hist    = []
  this.changes = null
  this._set    = factory || defFactory
}

Obj.prototype = new EventEmitter()

Obj.prototype.history = function () {
  var id = this.id
  return this.hist.map(function (e) {
    e = clone(e)
    e.unshift([id])
    return e
  })
}

Obj.prototype.update = function (update) {
  update    = clone(update)
  console.log(update)
  var path  = update.shift()
  var hist  = this.hist
  var last  = hist[hist.length - 1]
  var state = this.state
  var _set  = this._set

  if(path.length)
    throw new Error('should not have path here:' + path)

  /*
    make this smarter?

    figure out what has actually changed by applying the update?
    or, should each update be validated itself?
  */

  try {
    this.emit('validate', update[0], this /*, user_ctx*/)
  } catch (e) {
    //a change has been vetoed.
    //send a message back to the source that undoes the change?
    //certainly, don't send this message on.
    //this will be considered an insignificant change. 
    console.error('validation error', update[0])
    return
  }
  //if update is -e newer than any previous update. 
  if(!last || update[1] > last[1]) { //also use sequence number
      merge(state, update[0], this._set) //this will be injectable
      hist.push(update)
  //if the update has arrived out of order.  
  } else {
    hist.push(update)
    hist.sort(function (a, b) {
      return (a[1] - b[1]) || (a[2] - b[2])
    })
    hist.forEach(function (up) {
      merge(state, up[0], _set)
    })
  }
  this.emit('update', state, this, update[0])
}

Obj.prototype.set = function (key, value) {
  this.changes = this.changes || {}
  var changed = false
  if('string' === typeof key) {
    if(this.changes[key] != value) {
      changed = true
      this.changes[key] = value
    } 
  } else {
    for (var k in key) {
      if(this.changes[k] != key[k]) {
        changed = true
        this.changes[k] = key[k]
      }
    }
  }
  if(changed)
    this.emit('queue')
}

Obj.prototype.get = function () {
  return this.state
}

Obj.prototype.flush = function () {
  if(!this.changes) return 
  var changes = this.changes
  this.changes = null
  /*
    timestamping with milliseconds is not precise enough to generate a
    unique timestamp every time.
    adding a random number 0 < r < 1 will enable a total order
    (assuming that the random number does not collide at the same time 
    as the timestamp. very unlikely)
    another approach would be to get sort by source id. 
    (but that isn't implemented yet)

  */
  var update = [[], changes, Date.now() + Math.random()]
  this.update(update)
  update[0].unshift(this.id)
  this.emit('flush', update)
  return update
}

});

require.define("/node_modules/crdt/utils.js", function (require, module, exports, __dirname, __filename) {
exports.clone = 
function (ary) {
  return ary.map(function (e) {
    return Array.isArray(e) ? exports.clone(e) : e
  })
}



});

require.define("/node_modules/crdt/stream.js", function (require, module, exports, __dirname, __filename) {

var Stream = require('stream').Stream
var crdt = require('./index')
var utils = require('./utils')

var clone = utils.clone

module.exports = 
function create (set, name) {
  return createStream(set || new crdt.GSet('set'), name)
}

var _id = 0
function createStream(set, name) {

  if(!set)
    throw new Error('expected a collection CRDT')
  var s = new Stream()
  s._id = _id ++
  var sequence = 1
  //s.set = seex kt
  var queued = false
  var queue = []
  s.queue = queue
  s.readable = s.writable = true
  s.pipe = function (stream) {

    var dest = Stream.prototype.pipe.call(this, stream)

    //and now write the histroy!
    var hist = set.history()
    hist.sort(function (a, b) { 
      return a[2] - b[2]
    })
    while(hist.length)
      queue.push(hist.shift()) 

    set.on('flush', function (updates) {
      updates.forEach(function (e) {
        queue.push(e)
      }) 
      process.nextTick(s.flush)
    })

  //emit data that has 
  set.on('written', function (update, _id) {
    if(_id == s._id) return
    queue.push(update)
    process.nextTick(s.flush)
  })

   //got to defer writing the histroy,
    //because there may still be more downstream
    //pipes that are not connected yet!

    process.nextTick(s.flush)

    return dest
  }

  s.flush = function () {
    //if(!queue.length) 
    set.flush()//force a flush, will emit and append to queue
    if(!queue.length)
      return

    //make sure the timestamps are in order
    queue.sort(function (a, b) {
      return a[2] - b[2]
    })

    while(queue.length) { 
      //this is breaking stuff in tests, because references are shared
      //with the test
      var update = clone(queue.shift())
      if(update) {
        update[3] = sequence++ // append sequence numbers for this oregin
        s.emit('data', update)
      }
    }
    
    queued = false
  }

  set.on('queue', function () {
    if(queue.length) return
    process.nextTick(s.flush)
  })

/*
******************************
WRITES FROM OTHER NODES MUST BE WRITTEN TO ALL LISTENERS.


******************************
*/

  s.write = function (update) {
    // [path, time, update]
    // hard code only one Set right now.
    var _update = clone(update)
    update[0].shift()
    set.update(update)

    // now is when it's time to emit events?
    /*
      apply local update with set(key, value)
      or set(obj)
      queue changes, then call flush()
      which adds the update to histroy and returns it.

    */

    //emit this so that other connections from this CRDT
    //and emit.
    //man, am doing a lot of this copying...
    set.emit('written', _update, s._id)

    return true
  }

  //need to know if an event has come from inside
  //or outside...
  //should it be sent, or not? 
  //indeed, how to apply a local change?

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

require.define("/client.js", function (require, module, exports, __dirname, __filename) {
    
var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))

CONTENT = document.createElement('div')
CONTENT.id = 'chat'

messages = null
var set = SET =
new crdt.GSet('set').init({
  messages: messages = new crdt.GSet()
  .on('new', function (obj) {

    var div = document.createElement('div')
    var p = document.createElement('span')
    var a = document.createElement('a')

    a.href = '#'
    a.innerHTML = 'x'

    a.onclick = function () {
      obj.set({__delete: true})
    }

    div.appendChild(p)
    div.appendChild(a)
    obj.on('update', function () {
      if(obj.get().__delete) {
        CONTENT.removeChild(div)
        obj.removeAllListeners('update')
      }
      p.innerText = JSON.stringify(obj.get())
    })
    setTimeout(function () {
    //scroll to bottom
      CONTENT.scrollTop = 9999999
    }, 10)
    CONTENT.appendChild(div)
  })
  ,
  users: new crdt.Obj()
  //track this too 
})


//or should I decouple this and just use events?
//and paths?

var stream = crdt.createStream(set)

stream.pipe(BS = bs.createStream('test')).pipe(stream)

window.onload = function () {
  var input = document.getElementById('input')
  input.onchange = function () {
    //enter chat message
    var m = /s\/([^\\]+)\/(.*)/.exec(this.value)
    if(m) {
      var search = m[1]
      var replace = m[2]
      //search & replace
      console.log('REPLACE:', search, 'WITH', replace)
      var set = messages.objects
      for(var k in set) {
        //oh... I threw away the state. hmm. need to do that differently.
        var item = set[k].get(), text = item.text
        if(text && ~text.indexOf(search) && !item.__delete) {
          set[k].set('text', text.split(search).join(replace))
          console.log('TEXT TO UPDATE', text)
          //set doesn't seem to work when the value was set remotely
        }
      }
      set.flush()
    } else 
      messages.set(['_'+Date.now()], {text: this.value})
    this.value = ''
  } 
  document.body.insertBefore(CONTENT, input)
}

});
require("/client.js");
