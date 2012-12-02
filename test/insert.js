
var crdt = require('..')
var assert = require('assert')

exports.test = function (t) {
  var doc = new (crdt.Doc)

  var obj = {prop: 'key'}

  doc.on('create', function (row) {
    assert.deepEqual(row.toJSON(), { id: id, prop: 'key' })
    assert.deepEqual(obj, {prop: 'key'})
  })

  var id = doc.insert(obj)

  t.end()
}
