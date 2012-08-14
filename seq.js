'use strict';
var Set      = require('./set')
var Row      = require('./row')
var inherits = require('util').inherits
var u        = require('./utils')

module.exports = Seq

function sort (array) {
  return array.sort(function (a, b) {
    return u.strord(a.get('_sort'), b.get('_sort'))
  })
}

inherits(Seq, Set)

function find (obj, iter) {
  
  for(var k in obj) {
    var v = obj[k]
    if(iter(v, k, obj)) return v
  }
  return null
}

function Seq (doc, key, val) {

  Set.call(this, doc, key, val)
  var seq = this
  this.on('changes', function (row, changes) {
    if(!changes._sort) return
    sort(seq._array)
    //check if there is already an item with this sort key.
    var prev = 
    find(seq._array, function (other) {
      return other != row && other.get('_sort') == row.get('_sort')
    })

    //nudge it forward if it has the same key.    
    if(prev)
      seq.insert(row, prev, seq.next(row)) 
    else
      seq.emit('move', row)
  })
  this.insert = function (obj, before, after) {

    before = toKey(this.get(before) || '!')
    after  = toKey(this.get(after)  || '~')


    //must get id from the doc,
    //because may be moving this item into this set.
    if('string' === typeof obj)
      obj = doc.rows[obj]

    var _sort = 
       u.between(before, after ) 
     + u.randstr(3) //add a random tail so it's hard
                    //to concurrently add two items with the
                    //same sort.
 
    var r, changes
    if(obj instanceof Row) {
      r = obj
      changes = {_sort: _sort}
      if(r.get(key) != val)
        changes[key] = val
      r.set(changes)
    } else {
      obj._sort = _sort
      obj[key] = val
      r = doc.set(id(obj), obj)
    } 
    sort(this._array)
    return r
  }
}

function toKey (key) {

  return (
     'string' === typeof key ? key 
  :  key instanceof Row      ? key.get()._sort
  :  key                     ? key._sort
  : null
  )

}

/*
  items are relative to each other,
  more like a linked list.
  although it is possible to make an
  index based interface, before after,
  etc is more natural
*/

function max (ary, test, wantIndex) {
  var max = null, _max = -1
  if(!ary.length) return

  for (var i = 0; i < ary.length; i++)
    if(test(max, ary[i])) max = ary[_max = i]
  return wantIndex ? _max : max
}

Seq.prototype.prev = function (key) {
  key = toKey(this.get(key) || '~')
  //find the greatest item that is less than `key`.
  //since the list is kept in order,
  //a binary search is used.
  //think about that later
  return max(this._array, function (M, m) {
    if(toKey(m) < key)
      return M ? toKey(m) > toKey(M) : true
  })
}

Seq.prototype.next = function (key) {
  key = toKey(this.get(key) || '!')
  return max(this._array, function (M, m) {
    if(toKey(m) > key)
      return M ? toKey(m) < toKey(M) : true
  })
}

function id(obj) {
  return (obj.id 
  ||  obj._id 
  ||  '_' + Date.now() 
    + '_' + Math.round(Math.random()*1000)
  )
}

Seq.prototype.before = function (obj, before) {
  return this.insert(obj, this.prev(before), before)
}

Seq.prototype.after = function (obj, after) {
  return this.insert(obj, after, this.next(after))
}

Seq.prototype.first = function () {
  return this._array[0]
}

Seq.prototype.last = function () {
  return this._array[this._array.length - 1]
}

Seq.prototype.indexOf = function (obj) {
  return this._array.indexOf('string' == typeof obj ? this.rows[obj] : obj)
}

Seq.prototype.at = function (i) {
  return this._array[i]
}

Seq.prototype.unshift = function (obj) {
  return this.insert(obj, '!', this.first())
}

Seq.prototype.push = function (obj) {
  return this.insert(obj, this.last(), '~') 
}

Seq.prototype.length = function () {
  return this._array.length
}

Seq.prototype.pop = function () {
  return this.remove(this.last())
}

Seq.prototype.shift = function () {
  return this.remove(this.first())
}

