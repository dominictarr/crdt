
//var a = require('assertions')
var test = require('tap').test
var crdt = require('..')


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

