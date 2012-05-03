
var es      = require('event-stream')
var assert  = require('assertions')

exports.validateUpdates = function (t) {
  var lastTime
  var lastSeq

  return es.mapSync(function (update) {
    assert.equal(update.length, 4, 'length of update')
    t.ok(Array.isArray(update[0]))
    t.type(update[1], 'object')
    t.type(update[2], 'number')
    t.type(update[3], 'number')
    if(lastTime)
      t.ok(update[2] >= lastTime)
    if(lastSeq)
      t.equal(update[3], lastSeq + 1)
    lastTime = update[2]
    lastSeq  = update[3]
    return update
  })
}
/*
  here I will figure out some CRDT communication.
*/

exports.randomUpdates = function (crdt, opts) {
  opts = opts || {}
  var sets = opts.sets || 'abcdefghijk'.split('')
  keys = opts.keys || 'xyz'
  values = opts.values || 10

  function rand(of) {
    var i = Math.floor(Math.random() * (of.length || of))
    return of[i] || i
  }

  var l = opts.total || 7

  while (l--) {
    crdt.set(rand(sets), rand(keys), rand(values))
  }
}

exports.clone = 
function (stream) {
  return es.mapSync(function (e) {
    return JSON.parse(JSON.stringify(e))
  })
}



//listen on update events on a, and b, cb when both are consistant.
//test is a optional check, 
//used for example, to wait until all updates have completed.

exports.eventuallyConsistent = function (a, b, test, cb) {
  if(!cb) cb = test, test = null
  function done () {

    a.removeListener('update', check)
    b.removeListener('update', check)

    cb()
  }

  function check () {
    try {
      if(!test()) return
      assert.deepEqual(a.get(), b.get())
     done()
    } catch (e) {
      if(!/deepEqual/.test(e.message))
        throw e
    }
  }
  a.on('update', check)
  b.on('update', check)
} 
