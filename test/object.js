
//var a = require('assertions')
var test = require('tap').test
var crdt = require('..')
var a    = require('assertions')

test('trivial', function (t) {
  var o = new crdt.Obj()
  t.type(o, 'object')
  t.end()
})

test('idempotent order', function (t) {
  var updates = [
    [[], {hello: 'world', name: null}, 0, 1]
  , [[], {name: 'jim'}, 1, 2]
  , [[], {hello: 'earth'}, 2, 3]
  ]

  function rand() {
    return 0.5 - Math.random()
  }

  var l = 10
  while (l--) {
    var o = new crdt.Obj()
    updates.sort(rand).forEach(function (update){
      o.update(update.slice())
    })
    t.deepEqual(o.state, {hello: 'earth', name: 'jim'})
  }
  t.end()
})


test('validate', function (t) {

  var target = {}

  var obj = 
  new crdt.Obj()
    .on('validate', function (change, self) {
      //these are validation asserts, not test asserts.
      a.has(change, {
        x: a.isNumber
      , y: a.isNumber
      }) 
    })
    .on('update', function (change, self) {
      target.x = change.x
      target.y = change.y
    })

  //this is valid
  obj.set({x: 2, y: 4})
  obj.flush()

  //this is invalid
  obj.set({x: 'HELLO', y: 'not_a_number'})
  obj.flush()
  
  t.deepEqual(obj.get(), {x: 2, y: 4})
  t.deepEqual(obj.get(), target)
  t.end()
})

