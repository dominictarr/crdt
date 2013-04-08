
var crdt = require('..')
var assert = require('assert')

exports.test = function (t) {
  var next = process.nextTick
  var doc = new (crdt.Doc)
  var set = doc.createSet('type', 'thing')

  var init = {id: 'taonihu', prop: 'key', type: 'thing'}


  // doc.on('create', function (row) {
  //   //assert.deepEqual(row.toJSON(), init)
  //   console.log(row);
  //   doc.rm(row.id);
  // })

  // doc.on('row_update', function (update) {
  //   console.log(doc)
  //   assert(doc.rows[init.id] === undefined)
  //   assert(set.get(init.id) === undefined)

  // })

  doc.add(init)
  doc.rm(init.id)

  next(function () {
    assert(doc.rows[init.id] === undefined)
    assert(set.get(init.id) === undefined)

    t.end()
  })

}
