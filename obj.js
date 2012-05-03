
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
    console.log('validation error', update[0])
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
