
var crdt = require('..')
var assert = require('assert')

exports.test = function (t) {
  var doc = new (crdt.Doc)

  var obj = {id: 'abc', prop: 'key'}

  doc.on('create', function (row) {
    assert.deepEqual(row.toJSON(), { id: 'abc', prop: 'key' })
    assert.deepEqual(obj, {id: 'abc', prop: 'key'})
  })

  var id = doc.add(obj).id
  assert.equal(id, 'abc')

  t.end()
}
