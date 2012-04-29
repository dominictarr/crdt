var crdt = require('..')
var test = require('tap').test
var es   = require('event-stream')
var assert = require('assert')
/*
  here I will figure out some CRDT communication.
*/

test('random', function (t) {

  var a = crdt.createStream()
  var b = crdt.createStream()
  var lastTime
  var lastSeq
  var updates = []
  b.pipe(es.mapSync(function (update) {
    t.ok(Array.isArray(update[0]))
    console.log(update)
    t.type(update[1], 'object')
    t.type(update[2], 'number')
    t.type(update[3], 'number')
    if(lastTime)
      t.ok(update[2] >= lastTime)
    if(lastSeq)
      t.equal(update[3], lastSeq + 1)
    lastTime = update[2]
    lastSeq  = update[3]
    updates.push(update)
    return update
  })).pipe(a)

  var sets = ['a', 'b', 'c']
  var keys = ['x', 'y', 'z']

  function rand(of) {
    var i = Math.floor(Math.random() * (of.length || of))
    return of[i] || i
  }

  var l = 100

  while (l--) {
    b.add(rand(sets), rand(keys), rand(10))
  }
 
  b._flush() //this would be called in next tick

   console.log('B:', b.get())
  console.log('A:', a.get())

 console.log('B:', b.get())
  console.log('A:', a.get())


  //use regular deep equal because tap
  //fails on key ordering.
  //which is probably going to be different
  //because messages may not be in order

  console.log(updates)
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



