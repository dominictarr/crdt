
var crdt = require('..')
var assert = require('assert')

exports.test = function (t) {
  var next = process.nextTick
  var doc = new (crdt.Doc)
  var set = doc.createSet('type', 'thing')
  var rowRemoveEmitted = false
  var docRemoveEmitted = 0

  var init = {id: 'taonihu', prop: 'key', type: 'thing'}

  var row = doc.add(init)

  row.on('removed', function () {
    rowRemoveEmitted = true
  })

  doc.on('remove', function (removed) {
    assert(removed.id === init.id || removed.id === 'bogus')
    docRemoveEmitted++
  })

  doc.rm(init.id)
  doc.rm(init.id)  // test a double row delete
  doc.rm('bogus')  // test for non-existent

  next(function () {
    assert(rowRemoveEmitted)
    assert(docRemoveEmitted === 3)
    assert(doc.rows[init.id] === undefined)
    assert(set.get(init.id) === undefined)

    t.end()
  })

}
