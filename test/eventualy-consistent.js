var crdt   = require('..')
var assert = require('assertions')
var test   = require('tap').test
var help   = require('./helpers')
var es     = require('event-stream')

/*
  AN INTEGRATION TEST.

  create a number of configurations of nodes, and have them connect to each other.
  assert that thier data is eventually deepEqual.

*/

function sync (a, b) {
  var _a = crdt.createStream(a)
  var _b = crdt.createStream(b)
  _a.pipe(es.asyncThrough()).pipe(_b).pipe(es.asyncThrough()).pipe(_a)
}

function randomChanges(crdt, opts, cb) {
  console.log('setInterval')
  opts = opts || {}
  var n = 0, N = opts.N || 10
  var timer = setInterval(function () {
    help.randomUpdates(crdt, opts)
    if(n++ > N) {
      console.log('clearInterval')
      clearInterval(timer)
      cb && cb()
    }
      
  }, opts.i || 10)
  
}

function countdown (N, cb) {

  function count() {
    ;(!N --) && cb && cb()
  }
  count.check = function () {
    return N <= 0
  }
  return count
}

//this test will apply 10 random changes
//to two crdts, and then assert they are eventually consistant

test('simple', function (t) {

  var A = new crdt.Set('set')
  var B = new crdt.Set('set')

  sync(A, B)
  var counter = countdown(2)

  randomChanges(A, {}, counter)
  randomChanges(B, {i: 15}, counter)

  help.eventuallyConsistent(A, B, counter.check, function () {
    t.ok(true, 'eventually consistent')
    t.end()
  })

})

//update clients, but propagate changes through server

function randDelay(fun, ms) {
  return function () {
    var args = [].slice.call(arguments)
    setTimeout(function () {
      fun.apply(null, args)
    }, Math.random() * (ms || 10))
  }
}

test('clients - server', function (t) {

  var A = new crdt.Set('set')
  var B = new crdt.Set('set')
  var C = new crdt.Set('set')

  randDelay(sync,  5) (A, C)
  randDelay(sync, 10) (B, C)

  var counter = countdown(2)

  randomChanges(A, {}, counter)
  randomChanges(B, {i: 15}, counter)

  help.eventuallyConsistent(A, B, counter.check, function () {
    t.ok(true, 'eventually consistent')
    t.end()
  })

})

/*
  this test passes, but the process does not exit.
  currently streams don't know to not send something that the other
  stream already has.
  
  so they just keep on sending stuff that they have received from the 
  other node.

  hmm. adding the id of the source may be enough to make this correct.
  it would still send (Nodes * Messages) to every node.

  but at least it would stop.

  to get more correct than that, merkle trees?

  or is there a simpler way?

*/

test('peer2peer', {skip: true}, function (t) {

  var A = new crdt.Set('set')
  var B = new crdt.Set('set')
  var C = new crdt.Set('set')

  randDelay(sync,  5) (A, C)
  randDelay(sync, 10) (B, C)
  randDelay(sync,  7) (A, B)

  var counter = countdown(3)

  randomChanges(A, {},      counter)
  randomChanges(B, {i: 15}, counter)
  randomChanges(C, {i:  5}, counter)

  help.eventuallyConsistent(A, B, counter.check, function () {
    t.ok(true, 'eventually consistent')
    t.end()
  })

})



