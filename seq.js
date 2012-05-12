
var Set      = require('./set')
var Row      = require('./row')
var inherits = require('util').inherits
var u        = require('./utils')

module.exports = Seq

/*
  inherit from gset because seq will need a different
  `remove` implementation to set.
*/

//return a string key that is after a, and before b.

function sort (array) {
  return array.sort(function (a, b) {
    return u.strord(a.get('_sort'), b.get('_sort'))
  })
}

inherits(Seq, Set)

function Seq (doc, key, val) {

  Set.call(this, doc, key, val)
  var seq = this
  this.on('changes', function (row, changes) {
    if(!changes._sort) return
    sort(seq._array)
    seq.emit('move', row)
  })
  this.insert = function (obj, before, after) {
    before = toKey(before)
    after  = toKey(after)

    if(before == after)
      throw new Error('equal before/after')
    /*
      there could be a arbitary number of equal items.
      find the last one, and nudge it across.

      it's way easier if insert was passed the objects,
      because then you have identity.

      if it is just passed strings, it's best if the strings are
      ids, not sort keys.

      it will be except in push or unshift.
      but a row should never have a _sort == ! || ~

    */
    var _sort = 
       u.between(toKey(before) || '!', toKey(after) || '~') 
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

Seq.prototype.get = function () {
  return this.array
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
  var max = ary[0], _max = 0
  if(ary.length < 1)
    return
  for (var i = 1; i < ary.length; i++)
    if(test(max, ary[i])) { max = ary[i]; _max = i }
  return wantIndex ? _max : max
}

Seq.prototype.prev = function (key) {
  key = toKey(key)
  //find the greatest item that is less than `key`.
  //since the list is kept in order,
  //a binary search is used.
  //think about that later
  return max(this.array, function (M, m) {
    if(toKey(m) < key)
      return toKey(m) > toKey(M)
  })
}

Seq.prototype.next = function (key) {
  key = toKey(key)
  //find the greatest item that is less than `key`.
  //since the list is kept in order,
  //a binary search is used.
  //think about that later
  return max(this.array, function (M, m) {
    if(toKey(m) > key)
      return toKey(m) < toKey(M)
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
  return this._array.indexOf(obj)
}

Seq.prototype.unshift = function (obj) {
  return this.insert(obj, '!', this.first() || '~')
}

Seq.prototype.push = function (obj) {
  return this.insert(obj,  this.last() || '!', '~') 
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

/*
  how will I sync this to a array in UI?
  will need to emit something that the ui style can handle
  or maybe slice events?

  hooking onto an update event,
  it will be necessary to calc the change in index.
  
  another way, just update the value, and resort the 
  array. that may not be right for UI elements.

  ah, well, you can see the index it has,
  and the index it should have, and then move it.
*/
