var GSet = require('./gset')
var Obj  = require('./obj')

module.exports = Seq

/*
  inherit from gset because seq will need a different
  `remove` implementation to set.
*/

//return a string key that is after a, and before b.

var chars =
'!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'

function randstr(l, ex) {
  var str = ''
  while(l--) 
    str += chars[
      Math.round(
        Math.random() * 
        (ex ? chars.length - 1 : chars.length)
      )
    ]
  return str
}

function between (a, b) {

  if(a === b)
    throw new Error('a === b')

  //force order
  if(a > b) {
    var t = b; b = a; a = t
  }

  var s = '', i = 0

  //match prefixes
  while(a[i] === b[i]) s += a[i++]

  var _a = chars.indexOf(a[i])
  var _b = chars.indexOf(b[i])
  
  //if the indexes are adjacent, must lengthen the
  //key. note: P is the middle most letter.
  if(_a + 1 === _b) 
    s += a[i] + 'P'
  //otherwise, append the letter that is halfway
  //between _a and _b.
  else
    s += chars[Math.round((_a+_b)/2)]

  return s
}

function sort (array) {
  array.sort(function (a, b) {
    console.log(a._sort, b._sort)
    return (
      a._sort == b._sort ? 0
    : a._sort <  b._sort ? -1
    : 1
    )
  })
}

function Seq (id) {
  GSet.call(this, id)
  var array = this.array = []
  this.on('new', function (obj) {
    console.log('new')
    array.push(obj.get())
    sort(array)
  })
  this.on('update', function () {
    console.log('update')
    sort(array) 
  })
}

Seq.prototype = new GSet()

Seq.prototype.get = function () {
  return this.array
}

function toKey (key) {

  return (
     'string' === typeof key ? key 
  :  key instanceof Obj      ? key.get()._sort
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

Seq.prototype.insert = function (obj, before, after) {
  obj._sort = 
    between(toKey(before) || '!', toKey(after) || '~') 
  + randstr(3) //add a random tail so it's hard
               //to concurrently add two items with the
               //same sort.
  if(obj.__delete)
      object.__delete = false

  return this.set(id(obj), obj)
 
}

Seq.prototype.before = function (obj, before) {
  return this.insert(obj, this.prev(before), before)
}

Seq.prototype.after = function (obj, after) {
  return this.insert(obj, after, this.next(after))
}

Seq.prototype.first = function () {
  return this.array[0]
}

Seq.prototype.last = function () {
  return this.array[this.array.length - 1]
}

Seq.prototype.indexOf = function (obj) {
  return this.array.indexOf(obj)
}

Seq.prototype.unshift = function (obj) {
  return this.insert(obj, '!', this.first())
}

Seq.prototype.push = function (obj) {
  return this.insert(obj,  this.last(), '~') 
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
