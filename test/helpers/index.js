
var es      = require('event-stream')
var assert  = require('assertions')

exports.validateUpdates = function (t) {
//  var t = assert
  return es.mapSync(function (update) {
    if(Array.isArray(update)) {
      assert.equal(update.length, 4, 'length of update')
      t.equal(typeof update[0], 'string')
      t.equal(typeof update[1], 'object')
      t.equal(typeof update[2], 'number')
      t.equal(typeof update[3], 'string')
    } else {
      t.equal(typeof update.iam, 'string')
      t.equal(typeof update.iknow, 'object')
    }
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
  var changes = {}

  while (l--) {
    var s = rand(sets) 
    var ch = changes[s] = changes[s] || {}

    ch[rand(keys)] = rand(values)
  }

  for(var s in changes)
    crdt.set(s, changes[s])
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
  if(!cb) { cb = test; test = function () {return true} }
  function done () {
    a.removeListener('update', check)
    b.removeListener('update', check)
    cb()
  }

  function check () {
    try {
      if(!test()) return
      assert.deepEqual(a.history(), b.history())
      assert.deepEqual(a.toJSON(), b.toJSON())
      console.log('consistent')
      done()
    } catch (e) {
      if(!/deepEqual/.test(e.message))
        throw e
    }
  }
  a.on('update', check)
  b.on('update', check)
} 
