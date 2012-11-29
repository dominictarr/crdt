
var crdt = require('..')
var assert = require('assert')

exports.test = function (t) {
  var doc = new (crdt.Doc)

  var init = {id: 'taonihu', prop: 'key'}

  doc.on('create', function (row) {
    assert.deepEqual(row.toJSON(), init)
  })

  doc.add(init)

  t.end()
}
