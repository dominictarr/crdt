var crdt = require('..')
var a = require('assertions')
var Seq = require('../seq')

/*
  each function should accept the row, or the id.
*/
function id(e) {
  return Math.random() < 0.5 ? e : e && e.id
}

function validateNextPrev(seq) {

  seq.each(function (e, k) {
    a.equal(seq.next(id(e)), seq.at(seq.indexOf(id(e)) + 1))
    a.equal(seq.prev(id(e)), seq.at(seq.indexOf(id(e)) - 1))
    
    a.equal(seq.prev(id(seq.next(id(e)))), e)
    a.equal(seq.next(id(seq.prev(id(e)))), e)
  })
}

exports['simple'] = function (t) {

  function go () {
    var doc = new crdt.Doc()
    var seq = new Seq(doc, 'type', 'thing')

    /*seq.on('move', function (row) {
      console.log('MOVE', row.toJSON(), seq.indexOf(row))
    })*/

    var A = seq.push({id: 'a', type: 'thing', what: 3})
    var B = seq.push({id: 'b', type: 'thing', what: 4})
    var C = seq.unshift({id: 'c', type: 'thing', what: 2})

    a.equal(seq.first(), C)
    a.equal(seq.last(),  B)
    a.equal(seq.indexOf(id(A)), 1)

    seq.rm({id: 'c'})
    a.equal(seq.first(), A)

    console.log(seq.toJSON())
    seq.push(C)

    a.strictEqual(seq.last().id,  C.id)

    var _C = seq.pop()

    a.strictEqual(_C, C)
    try {
    a.equal(seq.length(), 2)
    } catch (e) {
      console.error(doc.history())
      throw e
    }
    var _A = seq.shift()

    a.strictEqual(_A, A)
    a.equal(seq.length(), 1)

    /*
      if two users insert a item into the same place concurrently
      it will get the same sort.
      in that case it should be sorted by the timestamp that the _sort
      was updated.

      if you try to insert an item between two items with equal
      _sort, it is necessary to nugde them apart... 
    */

  } 
  //was getting intermittent failures,
  //so run this test heaps, to catch it.
  var l = 122
  while (l--)
    go()
  t.end()
}
exports['push'] = function (t) {
   var doc = new crdt.Doc()
  var seq = new Seq(doc, 'type', 'thing')

  seq.on('move', function (row) {
    console.log('MOVE', row.toJSON(), seq.indexOf(row))
  })

  var A = seq.push({id: 'a', type: 'thing', what: 3})
  var B = seq.push({id: 'b', type: 'thing', what: 4})
  var C = seq.push({id: 'c', type: 'thing', what: 2})


  a.equal(seq.next(), A)
  a.equal(seq.next(id(A)), B)
  a.equal(seq.next(id(B)), C)

  a.equal(seq.prev(), C)
  a.equal(seq.prev(id(B)), A)
  a.equal(seq.prev(id(C)), B)

  validateNextPrev(seq)

  t.end()
}

exports['collision'] = function (t) {

  var doc = new crdt.Doc()
  var seq = new Seq(doc, 'type', 'thing')

  seq.on('move', function (row) {
    console.log('MOVE', row.toJSON(), seq.indexOf(row))
  })

  var A = seq.push({id: 'a', type: 'thing', what: 3})
  var B = seq.push({id: 'b', type: 'thing', what: 4})
  var C = seq.unshift({id: 'c', type: 'thing', what: 2})

  C.set({_sort: A.get('_sort')}) //this may be the easyest place to nudge the items apart.

  a.notEqual(A.get('_sort'), C.get('_sort'))

  var D = seq.insert({id: 'd', type: 'thing', what: 6}, A, C)

  t.end()
}

/*
  insert before.

*/

function sync(array, seq) {
  var r = {}
  'pop,push,shift,unshift'.split(',').forEach(function (n) {
    r[n] = function (i) {
      seq[n](/push|unshift/.test(n) ? i : id(i))
      array[n](i)
      console.log(i)
      if(i) {
        a.equal(array.indexOf(i), seq.indexOf(i.id))
      }
      a.deepEqual(seq.toJSON(), array)

    }
  })
  return r
}


exports.random = function (t) {

  var doc = new crdt.Doc()
  var seq = new Seq(doc, 'type', 'thing')
  var ary = []
  
  var s = sync(ary, seq)

  s.push({id: 'a', hello:3 })
  s.push({id: 'B', hello:3 })
  s.unshift({id: 'c', hello:'x'})

  console.log(ary)
  s.pop()
  var l = 92
  while(l --) {
    var op = ['push','pop', 'shift', 'unshift'][~~(Math.random()*4)]
    var obj = {id: '_'+Math.random(), r: Math.random()}
    console.log(op, obj, ary.length, l)
    try {
    s[op](obj)
    } catch (e) {
      console.log(ary)
      throw e
    }
  }
  t.end()
}
