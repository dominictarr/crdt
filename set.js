'use strict';
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

  function add(row) {
    array.push(row)
    rows[row.id] = row
    set.emit('add', row)

    function remove (_, changed) {
      if(row.state[key] === value)
        return set.emit('changes', row, changed)
      delete rows[row.id]
      var i = array.indexOf(row)
      if(~i) array.splice(i, 1)
      else return 
      set.emit('remove', row)
      row.removeListener('changes', remove)
    }

    row.on('changes', remove)
 
  }

  doc.sets.on(key, function (row, changed) {
    if(changed[key] !== value) return 
    add(row)
  })

  this.rm = this.remove = function (row) {
    row = this.get(row) 
    if(!row) return
    return row.set(key, null)
  }

  for(var id in doc.rows) {
    var row = doc.get(id)
    if(row.get(key) === value) add(row) 
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

Set.prototype.get = function (id) {
  if(!arguments.length)
    return this.array
  return (
      'string' === typeof id ? this.rows[id] 
    : 'number' === typeof id ? this.rows[id] 
    : id && id.id            ? this.rows[id.id]
    :                          id
  )
}
