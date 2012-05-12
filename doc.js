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


