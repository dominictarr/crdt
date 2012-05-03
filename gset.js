module.exports = GSet

var EventEmitter = require('events').EventEmitter
var Obj = require('./obj')
var clone = require('./utils').clone

/*
  GSet -- grow only set.

  base class for other collection types.
*/

function defFactory (id) {
  var obj = new Obj(id)
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

  if(!self.objects[key]) {   //REPEATING THIS CODE.

    function enqueue () {
      if(~self.queue.indexOf(obj)) return
      self.queue.push(obj)
      self.emit('queue')
    }

    function create (key) {
      return f.call(self.state, key)
    }
   
    obj = self.objects[key] = create(key)
    obj.on('queue', enqueue)
  }

  return self.objects[key]
}

GSet.prototype.set =
GSet.prototype.add = function (key, oKey, val) {
  getMember(this, key).set(oKey, val) 
}

GSet.prototype.update = function (update) {
  update = clone(update)
  var key = update[0].shift()
  var obj = getMember(this, key)
  obj.update(update)
  this.emit('update', key, obj.get())
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
    var update = obj.flush()

    this.emit('update', obj.id, obj.get())

    if(!update) return
    update = clone(update)
    update[0].unshift(id)
    updates.push(update)

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
