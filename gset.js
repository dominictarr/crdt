module.exports = GSet

var EventEmitter = require('events').EventEmitter
var Obj = require('./obj')
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
/*
  this should apply to any 
*/
GSet.prototype.add = function (key, oKey, val) {
  if(!this.objects[key]) {
    var self = this
    var obj = this.objects[key] = new Obj(key)
    this.state[key] = obj.get()
    obj.on('queue', function () {
      //prepare to flush the changes to this object
      self.enqueue(obj)
    })
  }
  this.objects[key].set(oKey, val)

}

GSet.prototype.enqueue = function (obj) {
  if(!~this.queue.indexOf(obj))
    this.queue.push(obj)
  this.emit('queue')
}

/*
  this can probably be used as the flush implementation for any
  collection Obj
*/

GSet.prototype.flush = function (obj) {
  var id = this.id
  var updates = []
  this.queue.forEach(function (e) {
    var update = e.flush()
    if(!update) return
    update = update.slice()
    update[0].unshift(id)
    updates.push(update)
  })
  return updates
}

GSet.prototype.update = function (update) {
  console.log(':::::', update)
  var key = update[0].shift()
  var array = this.array
  if(!this.objects[key]) {
    this.state[key] = (this.objects[key] = new Obj(key)).state
  }
  var obj = this.objects[key]
  //does this need histroy at this level?
  //all that can happen is creation.
  obj.update(update)

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


