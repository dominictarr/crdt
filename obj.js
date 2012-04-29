
module.exports = Obj

var EventEmitter = require('events').EventEmitter

//this will be injectable,
//to support different types of models.
//i.e. using backbone or knockout.

function set (obj, key, val) {
  obj[key] = val
}

function merge(to, from) {
  for(var k in from)
    set(to, k, from[k])
  return to
}

function Obj (id) {
  this.id = id
  this.state = {}
  this.history = []
  this.changes = null
}

Obj.prototype = new EventEmitter()

Obj.prototype.update = function (update) {
  update    = update.slice()
  var path  = update.shift()
  var hist  = this.history
  var last  = hist[hist.length - 1]
  var state = this.state

  if(path.length)
    throw new Error('should not have path here:' + path)

  //if update is newer than any previous update. 
  if(!last || update[1] > last[1]) { //also use sequence number
      merge(state, update[0]) //this will be injectable
      hist.push(update)
  //if the update has arrived out of order.  
  } else {
    hist.push(update)
    hist.sort(function (a, b) {
      if(a[1] == b[1])
        console.log(a, b)
      return (a[1] - b[1]) || (a[2] - b[2])
    })
    hist.forEach(function (up) {
      merge(state, up[0])
    })
  }
}

Obj.prototype.set = function (key, value) {
  this.changes = this.changes || {}
  var changed = false
  if('string' === typeof key) {
    if(this.changes[key] != value) {
      changed = true
      this.changes[key] = value
      set(this.state, key, value)
    } 
  } else {
    for (var k in key) {
      if(this.changes[k] != key[k]) {
        changed = true
        this.changes[k] = key[k]
        //set(this.state, k, key[k])
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
  var update = [[], changes, Date.now()]
  this.update(update)
  update[0].unshift(this.id)
  this.emit('update', changes)
  return update
}
