//index
var util = require('util')
var EventEmitter = require('events').EventEmitter
var Stream = require('stream')

util.inherits(Row, EventEmitter)
util.inherits(Doc, EventEmitter)
util.inherits(Set, EventEmitter)

exports = module.exports = Doc

exports.Doc = Doc
exports.Row = Row
exports.createStream = createStream
exports.sync = sync
exports.Set  = Set

//utils
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function merge(to, from) {
  for(var k in from)
    to[k] = from[k]
  return to
}
var _last = 0
var _count = 1
function timestamp () {
  var t = Date.now()
  var _t = t
  if(_last == t)
    _t += ((_count++)/10000) 
  else _count = 1 
  _last = t
  return _t
}


function strord (a, b) {
  return (
    a == b ?  0
  : a <  b ? -1
  :           1
  )
}

function order (a, b) {
  return strord(a[2], b[2]) || strord(a[3], b[3])
}

function concat(to, from) {
  while(from.length)
    to.push(from.shift())
  return to
}

//row
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

//doc
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
    var update = [r.id, changes, timestamp(), doc.id]
    doc.update(update, source)
  }

  r.on('preupdate', track)

  this.emit('add', r)
  return r
}

Doc.prototype.set = function (id, change) {
  var r = this._add(id, 'local')
  r.set(change)
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

  merge(row.state, changed)
  for(var k in changed)
    this.sets.emit(k, row, changed) 
  
  if(!emit) return

  row.emit('update', update)
  row.emit('changes', changes, 'local')

  this.emit('update', update, source) 
}


Doc.prototype.history = function (id) {
  if(!arguments.length) {
    var h = []
    for (var id in this.hist) {
      concat(h, this.history(id))
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

Doc.prototype.createSet = function (key, val) {
  var id = key + ':' + val
  if(this.sets[id]) return this.sets[id] 
  return this.sets[key + ':' + val] = new Set(this, key, val)
}

Doc.prototype.toJSON = function () {
  var j = {}
  for (var k in this.rows)
    j[k] = this.rows[k].state
  return j
}

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
    concat(queue, doc.history()) 
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

function sync(a, b) {
  var as = createStream(a)
  var bs = createStream(b)
  return as.pipe(bs).pipe(as)
}

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

function Set(doc, key, value) {
  var array = this._array = []
  var set = this

  //DO NOT CHANGE once you have created the set.
  this.key = key
  this.value = value

  doc.sets.on(key, function (row, changed) {
    if(changed[key] !== value) return 

    array.push(row)
    set.emit('add', row)

    function remove () {
      if(row.state[key] === value) return

      var i = array.indexOf(row)
      if(~i) array.splice(i, 1)
      set.emit('remove', row)
      row.removeListener('changes', remove)
    }

    row.on('changes', remove)
  })
}

Set.prototype.asArray = function () {
  return this._array
}

Set.prototype.toJSON = function () {
  return this._array.map(function (e) {
    return e.state
  }).sort(function (a, b) {
    return strord(a.id, b.id)
  })
}

Set.prototype.each = 
Set.prototype.forEach = function (iter) {
  return this._array.forEach(iter)
}
