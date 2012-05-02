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

/*
  this should apply to any 
*/

GSet.prototype.set =
GSet.prototype.add = function (key, oKey, val) {

  var self = this
  function enqueue (obj) {
    if(~self.queue.indexOf(obj)) return
    self.queue.push(obj)
    self.emit('queue')
  }
  var f = this._factory
  function create (key) {
    return f.call(self.state, key)
  }
 
  if(!this.objects[key]) {   //REPEATING THIS CODE.
    var obj = this.objects[key] = create(key)
    //I think I want to control state like I do for obj.
    //HMMM. think that the factory should be responsible for creating 
    //state
    
//    this.state[key] = obj.get()
    obj.on('queue', function () { enqueue (obj) })
  }

  this.objects[key].set(oKey, val) 
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

GSet.prototype.update = function (update) {
  update = clone(update)
  var key = update[0].shift()
  var array = this.array
  var self = this

  var f = this._factory
  function create () {
    return f.call(self.state, key)
  }

  if(!this.objects[key]) {
    this.objects[key] = create()
  }
  var obj = this.objects[key]
  //does this need histroy at this level?
  //all that can happen is creation.
  obj.update(update)
  this.emit('update', key, obj.get())

/*
// DELETES. move this to Set.
//
//

  if(obj.get('__destroy')) { 
    var i = array.indexOf(obj)
    if(~i)    
      array.splice(i, 1)  //emit splice?
  } else if(obj.__destroy === false || obj.__destroy === null) {
    if(!~array.indexOf(obj))
      array.push(obj)     //emit splice?
  }
*/

}

GSet.prototype.toArray =
GSet.prototype.get = function (path) {
  if(!arguments.length)
    return this.state
  //if path is defined, pass to members...
}


