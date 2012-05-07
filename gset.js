module.exports = GSet

var EventEmitter = require('events').EventEmitter
var Obj = require('./obj')
var clone = require('./utils').clone

/*
  GSet -- grow only set.

  base class for other collection types.

*/

function GSet(id) {
  this.id = id
  this.state = {}
  this.objects = {}
  this.queue = []
}

GSet.prototype = new EventEmitter()

function createMember (state, id) {

  var set = (Array.isArray(id) && id.length > 1)

  var obj = set ? new GSet(id = id[0]) : new Obj('' + id)
  //change that?
  state[id] = obj.get()

  return obj
}

function getMember (self, key) {
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

    obj = createMember(self.state, path)

    try {
      self.emit('validate', obj, self)
    } catch (e) {
      console.error('validation:', e.message)
      //someone will have to throw away all the changes for this...
      return
    }

    obj = self.objects[key] = obj
    obj.on('queue', enqueue)
    obj.on('update', function (state, obj) {
      //this is not consistent... ugly.
      self.emit('update', obj.id, state)
    })
    obj.on('written', function (update, id) {
      var u = clone(update)
      u[0].unshift(self.id)
      self.emit('written', u, id)
    })
    self.emit('new', obj, self)
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

GSet.prototype.update = function (update, id) {
  update = clone(update)
  var path = update[0]
  var obj = getMember(this, path)
  var key = path.shift()
  if(obj) { // if was not valid, this is null.
    obj.update(update, id)
    //update events behave different on Set to on Obj.
    //it updates when any member updates.
    //this.emit('update', key, obj.get())
    //emit update when obj emits update
  }
}

/*
  this can probably be used as the flush implementation for any
  collection Obj
*/

GSet.prototype.flush = function (obj) {
  return
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
