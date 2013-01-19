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

exports['test - filters'] = function (t) {
  var doc = new crdt.Doc()
  console.log("# Filters")

  var set = doc.createSet(function (state) {
    return state.type === 'thing' && state.what <= 5
  })
  var set2 = doc.createSet(function (state) {
    return state.type === 'other' && state.what > 8
  })

  log(set)
  log(set2)

  console.log(set.toJSON())
  console.log(set2.toJSON())

  doc.add({id: 'a', type: 'thing', what: 3})
  doc.add({id: 'b', type: 'thing', what: 5})
  //overwrite the first 'a'
  doc.add({id: 'a', type: 'other', what: 7})
  doc.add({id: 'c', type: 'thing', what: 9})

  a.deepEqual(set.toJSON(), [
    { id: 'b', type: 'thing', what: 5 }
  ])

  a.deepEqual(set2.toJSON(), [])

  console.log("passed")
  t.end()
}

exports['set caching'] = function (t) {
  var doc = new crdt.Doc()

  var set1 = doc.createSet("foo", "bar")
  var set2 = doc.createSet("foo", "bar")

  a.equal(set1, set2)

  var set3 = doc.createSet(function () { })
  var set4 = doc.createSet(function () { })
  a.notEqual(set3, set4)

  t.end()
}

exports['test - create set later'] = function (t) {
  var doc = new crdt.Doc()

  console.log("LATER")

  doc.add({id: 'a', type: 'thing', what: 3})
  doc.add({id: 'b', type: 'thing', what: 5})
  doc.add({id: 'a', type: 'other', what: 7})
  doc.add({id: 'c', type: 'thing', what: 9})

  var set = doc.createSet("type", "thing")
  var states = []

  set.onEach(function (row, state) {
    console.log(state)
    states.push(row.state)
  })

  a.deepEqual(states, [
    { id: 'b', type: 'thing', what: 5 },
    { id: 'c', type: 'thing', what: 9 }
  ])

  t.end()
}

function log(set) {

  set.on('add', function (row) {
    console.log('add', set.value,'->', row.state)
  })
  set.on('remove', function (row) {
    console.log('rm', set.value,'->', row.state)
  })

}

