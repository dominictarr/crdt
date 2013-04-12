
var crdt = require('..')
var assert = require('assert')

exports.test = function (t) {
  var next = process.nextTick
  var doc = new (crdt.Doc)
  var set = doc.createSet('type', 'thing')

  var init = {id: 'taonihu', prop: 'key', type: 'thing'}

  doc.add(init)
  doc.rm(init.id)
  doc.rm(init.id)  // test a double row delete
  doc.rm('bogus')  // test for non-existent

  next(function () {
    assert(doc.rows[init.id] === undefined)
    assert(set.get(init.id) === undefined)

    t.end()
  })

}
