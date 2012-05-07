var crdt    = require('..')
var test    = require('tap').test
var es      = require('event-stream')
var assert  = require('assertions')
var help    = require('./helpers')

var randomUpdates   = help.randomUpdates
var clone           = help.clone
var validateUpdates = help.validateUpdates

/*function test (name, test) {
  exports[name] = test
}*/

test('random', function (t) {

  var a = new crdt.GSet('set')
  var b = new crdt.GSet('set')
  var as = crdt.createStream(a, 'a')
  var bs = crdt.createStream(b, 'b')
  bs.pipe(validateUpdates(t)).pipe(as)

  randomUpdates(b)

  bs.flush() //this would be called in next tick

  //use regular deep equal because tap
  //fails on key ordering.
  //which is probably going to be different
  //because messages may not be in order

  var A = a.get()
  var B = b.get()

  assert.deepEqual(b.get(), a.get())

  t.end()
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
  var a = new crdt.GSet('set')
  var b = new crdt.GSet('set')
  var as = crdt.createStream(a)
  var bs = crdt.createStream(b)

  //XXX difference between 'histroy' and 'random' is 
  //    the order of .pipe(..) or randomUpdates()

  randomUpdates(b)

  bs.flush() //act like the updates where made ages ago.
             //already sent, acient histroy.
             //however, they may still affect current state.

  bs.pipe(validateUpdates(assert)).pipe(as)
  
  bs.flush() //this would be called in next tick

  //what if there where random updates, then was flushed
  //then more changes then flush..

  assert.deepEqual(b.get(), a.get())

  t.end()
})


test ('histroy2', function (t) {
//here we update b before the pipe is connected.
//then connect the pipe. 
//the stream it expected to figure out that there is histroy to send
//and send it so that everyone is in sync.
  var a = new crdt.GSet('set')
  var b = new crdt.GSet('set')
  var as = crdt.createStream(a, 'a')
  var bs = crdt.createStream(b, 'b')

  //XXX difference between 'histroy' and 'random' is 
  //    the order of .pipe(..) or randomUpdates()

  randomUpdates(b)

  bs.flush() //act like the updates where made ages ago.
             //already sent, acient histroy.
             //however, they may still affect current state.

  randomUpdates(b)
  //not flushed yet
  bs.pipe(validateUpdates(assert)).pipe(as)
  
  bs.flush() //this would be called in next tick

  //what if there where random updates, then was flushed
  //then more changes then flush..

  assert.deepEqual(b.get(), a.get())

  t.end()
})


test ('histroy3', function (t) {
//here we update b before the pipe is connected.
//then connect the pipe. 
//the stream it expected to figure out that there is histroy to send
//and send it so that everyone is in sync.
  var a = new crdt.GSet('set')
  var b = new crdt.GSet('set')  
  var c = new crdt.GSet('set')
  var as = crdt.createStream(a, 'a')
  var bs = crdt.createStream(b, 'b')
  var bs2 = crdt.createStream(b, 'b2')
  var cs = crdt.createStream(c, 'c')

  //XXX difference between 'histroy' and 'random' is 
  //    the order of .pipe(..) or randomUpdates()

  bs2.pipe(validateUpdates(assert)).pipe(cs)

  randomUpdates(b)
  bs2.flush() 
  console.log('flushed!')

  randomUpdates(b)
  //not flushed yet
  bs.pipe(validateUpdates(assert)).pipe(as)
 
  bs.flush() //this would be called in next tick
  bs2.flush()
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

  assert.deepEqual(b.get(), a.get())

  assert.deepEqual(b.get(), c.get())

  t.end()
})

test ('client-server', function (t) {
  var a = new crdt.GSet('set')
  var b = new crdt.GSet('set')  
  var c = new crdt.GSet('set')

  var as = crdt.createStream(a, 'a')
  var bs = crdt.createStream(b, 'b')
  var bs2 = crdt.createStream(b, 'b2')
  var cs = crdt.createStream(c, 'c')

  //B is the Server, A and C are clients.
  //will apply updates to A, expect them to eventually propagate to C

  cs.pipe(bs2).pipe(validateUpdates(assert)).pipe(cs)

  as.pipe(bs).pipe(validateUpdates(assert)).pipe(as)

  randomUpdates(a)
  as.flush() 
  bs.flush()
  bs2.flush()
  console.log('flushed!')

  assert.deepEqual(b.get(), a.get())
  assert.deepEqual(b.get(), c.get())

  randomUpdates(c)

  cs.flush() 
  bs2.flush() 
  bs.flush()

  console.log(cs.queue, bs2.queue, bs.queue, as.queue)

  assert.deepEqual(b.get(), c.get())
//  assert.deepEqual(b.get(), a.get())

//  randomUpdates(b)
  
  //not flushed yet
 
  //bs.flush() //this would be called in next tick
  //bs2.flush()
  //console.log('flushed!')
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

  assert.deepEqual(b.get(), a.get())
  assert.deepEqual(b.get(), c.get())

  t.end()
})
