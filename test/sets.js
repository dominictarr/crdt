var crdt = require('..')
var a = require('assertions')

exports['test'] = function (t) {

  var doc = new crdt.Doc()
  var set = doc.createSet('type', 'thing')
  var set2 = doc.createSet('type', 'other')

  function log(set) {

    set.on('add', function (row) {
      console.log('add', set.value,'->', row.state)
    })
    set.on('remove', function (row) {
      console.log('rm', set.value,'->', row.state)
    })

  }

  log(set)
  log(set2)

  doc.add({id: 'a', type: 'thing', what: 3})
  doc.add({id: 'b', type: 'thing', what: 5})
  doc.add({id: 'a', type: 'other', what: 7})
  doc.add({id: 'c', type: 'thing', what: 9})

  console.log(set.toJSON())
  console.log(set2.toJSON())

  a.deepEqual(set.toJSON(), [
    {id: 'b', type: 'thing', what: 5},
    {id: 'c', type: 'thing', what: 9},
  ])

  a.deepEqual(set2.toJSON(), [
    {id: 'a', type: 'other', what: 7}
  ])

  console.log('passed')
  t.end()
}

exports['test - post'] = function (t) {

  var doc = new crdt.Doc()

  doc.add({id: 'a', type: 'thing', what: 3})
  doc.add({id: 'b', type: 'thing', what: 5})
  doc.add({id: 'a', type: 'other', what: 7})
  doc.add({id: 'c', type: 'thing', what: 9})

  var set = doc.createSet('type', 'thing')
  var set2 = doc.createSet('type', 'other')

  function log(set) {

    set.on('add', function (row) {
      console.log('add', set.value,'->', row.state)
    })
    set.on('remove', function (row) {
      console.log('rm', set.value,'->', row.state)
    })

  }

  log(set)
  log(set2)

  console.log(set.toJSON())
  console.log(set2.toJSON())

  a.deepEqual(set.toJSON(), [
    {id: 'b', type: 'thing', what: 5},
    {id: 'c', type: 'thing', what: 9},
  ])

  a.deepEqual(set2.toJSON(), [
    {id: 'a', type: 'other', what: 7}
  ])

  console.log('passed')
  t.end()
}


