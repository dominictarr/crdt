var crdt    = require('..')
var es      = require('event-stream')
var assert  = require('assertions')
var help    = require('./helpers')

var randomUpdates   = help.randomUpdates
var clone           = help.clone
var validateUpdates = help.validateUpdates

/*function test (name, test) {
  exports[name] = test
}*/

var next = process.nextTick

function test(n,t) {
  exports[n] = t
}

test('random', function (t) {

  var a = new crdt.Doc()
  var b = new crdt.Doc()
  a.sync = b.sync = true
  var as = crdt.createStream(a, {wrapper: 'raw'})
  var bs = crdt.createStream(b, {wrapper: 'raw'})

  bs.pipe(as).pipe(bs)

  randomUpdates(b)

  next(function () {

    //use regular deep equal because tap
    //fails on key ordering.
    //which is probably going to be different
    //because messages may not be in order

    assert.deepEqual(b.toJSON(), a.toJSON())

    t.end()

  })
})

/*
OBSERVATIONS.

collection do not maintain any histroy.
they only hold buckets of objects.

set properties like order
are maintained by properties of the objects.

each level emits when it has changed.
and the next level is responsible for deciding when to
flush the changes.

OBJECT
  set       //set a value
  get       //retrive a value, or the cur state
  flush     //apply queued local changes
  update    //apply an remote update

  'queue'   //when a local change has happened
  'update'  //when changes have been applied. (local or remote)

SET
  set/add   //set a inner object.
  get       //retrive a inner object/or state
  flush     //apply queued local changes. 
  update    //apply an update

  'queue'   //when a local change has been made.
  'update'  //when changes are applied. (local or remote)

each type implements these methods...
.. but differently.

*/


test ('histroy', function (t) {
//here we update b before the pipe is connected.
//then connect the pipe. 
//the stream it expected to figure out that there is histroy to send
//and send it so that everyone is in sync.
  var a = new crdt.Doc()
  var b = new crdt.Doc()
  a.sync = b.sync = true
  var as = crdt.createStream(a, {wrapper: 'raw'})
  var bs = crdt.createStream(b, {wrapper: 'raw'})

  //XXX difference between 'histroy' and 'random' is 
  //    the order of .pipe(..) or randomUpdates()

  randomUpdates(b)

  bs.pipe(as).pipe(bs)
  
  next(function () {
    //what if there where random updates, then was flushed
    //then more changes then flush..
    assert.deepEqual(b.toJSON(), a.toJSON())
    t.end()
  })
})


test ('histroy2', function (t) {
//here we update b before the pipe is connected.
//then connect the pipe. 
//the stream it expected to figure out that there is histroy to send
//and send it so that everyone is in sync.
  var a = new crdt.Doc()
  var b = new crdt.Doc()
  a.sync = b.sync = true
  var as = crdt.createStream(a, {wrapper: 'raw'})
  var bs = crdt.createStream(b, {wrapper: 'raw'})

  //XXX difference between 'histroy' and 'random' is 
  //    the order of .pipe(..) or randomUpdates()

  randomUpdates(b)
  //not flushed yet
  bs.pipe(validateUpdates(assert)).pipe(as).pipe(bs)
  
  next(function () {

    //what if there where random updates, then was flushed
    //then more changes then flush..

    assert.deepEqual(b.toJSON(), a.toJSON())
    t.end()
  })
})


test ('histroy3', function (t) {
//here we update b before the pipe is connected.
//then connect the pipe. 
//the stream it expected to figure out that there is histroy to send
//and send it so that everyone is in sync.
  var a = new crdt.Doc()
  var b = new crdt.Doc()  
  var c = new crdt.Doc()
  a.sync = b.sync = c.sync = true
  var as = crdt.createStream(a, {wrapper: 'raw'})
  var bs = crdt.createStream(b, {wrapper: 'raw'})
  var bs2 = crdt.createStream(b, {wrapper: 'raw'})
  var cs = crdt.createStream(c, {wrapper: 'raw'})

  //XXX difference between 'histroy' and 'random' is 
  //    the order of .pipe(..) or randomUpdates()

  bs2.pipe(cs).pipe(bs2)

  randomUpdates(b)
  console.log('flushed!')

  randomUpdates(b)
  //not flushed yet
  bs.pipe(as).pipe(bs)
 
  next(function () {
    console.log('flushed!')
    // THIS IS A PROBLEM.
    // since updates are cleared when flush it called
    // it won't work if they are written by more than one stream!
    // need to send updates to both streams.
    // so... emit them rather than return them...

    // IDEA. maybe emit changes when they first occur
    // then continue to change them until it's flushed.
    // (which clears the changes)

    // AHA! the CRDT decides when to flush changes.
    // not the stream.

    // the crdt will emit 'flush'.

    assert.deepEqual(b.toJSON(), a.toJSON())

    assert.deepEqual(b.toJSON(), c.toJSON())

    t.end()

  })
})


test ('client-server', function (t) {
  var a = new crdt.Doc()
  var b = new crdt.Doc()  
  var c = new crdt.Doc()
  a.sync = b.sync = c.sync = true

  var as = crdt.createStream(a, {wrapper: 'raw'})
  var bs = crdt.createStream(b, {wrapper: 'raw'})
  var bs2 = crdt.createStream(b, {wrapper: 'raw'})
  var cs = crdt.createStream(c, {wrapper: 'raw'})

  //B is the Server, A and C are clients.
  //will apply updates to A, expect them to eventually propagate to C

  cs.pipe(bs2).pipe(validateUpdates(t)).pipe(cs)

  as.pipe(bs).pipe(validateUpdates(t)).pipe(as)

  randomUpdates(a)

  next(function () {
    console.log('flushed!')

    assert.deepEqual(b.toJSON(), a.toJSON())
    assert.deepEqual(b.toJSON(), c.toJSON())

    randomUpdates(c)

    next(function () {
  
      console.log(cs.queue, bs2.queue, bs.queue, as.queue)

      assert.deepEqual(b.toJSON(), c.toJSON())

      // the crdt will emit 'flush'.

      assert.deepEqual(b.toJSON(), a.toJSON())
      assert.deepEqual(b.toJSON(), c.toJSON())

    t.end()
    })
  })
})

test('row remove', function (t) {

  var a = new crdt.Doc()
  var b = new crdt.Doc()
  a.sync = b.sync = true
  var as = crdt.createStream(a, {wrapper: 'raw'})
  var bs = crdt.createStream(b, {wrapper: 'raw'})

  bs.pipe(as).pipe(bs)

  var row = {id: 'short-timer', prop: 'key'}
  b.add(row)

  next(function () {

    assert.deepEqual(b.toJSON(), a.toJSON())
    a.rm(row.id)

    next(function () {
      assert.deepEqual(b.toJSON(), a.toJSON())
      t.end()
    })
  })
})

