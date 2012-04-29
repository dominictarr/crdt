var test = require('tap').test
var crdt = require('..')


test('GSet', function (t) {

  var s = new crdt.Set()

  s.update([['key'], {initial: true}, 0, 1])

  var ary = s.get()

  t.deepEqual(
    ary,
    {key: {initial: true}}
  )
  t.end()
})

test('GSet - 2', function (t) {

  var s = new crdt.GSet()

  s.update([['A'], {initial: true} , 0, 1])
  s.update([['B'], {initial: false}, 0, 2])
  s.update([['C'], {initial: 6}    , 0, 3])

  s.update([['C'], {initial: 3} , 2, 5])
  s.update([['B'], {initial: 6}], 1, 4)

  var ary = s.get()

  t.deepEqual(
    ary,
    { A: {initial: true}
    , B: {initial: 6}
    , C: {initial: 3} }
  )
  t.end()

})
