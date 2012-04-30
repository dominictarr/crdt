var crdt = require('..')
var test = require('tap').test
var es   = require('event-stream')
//var assert = require('assert')
var assert = require('assertions')

var validateUpdates = function (t) {
  var lastTime
  var lastSeq

 return es.mapSync(function (update) {
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

function randomUpdates(crdt, opts) {
  opts = opts || {}
  var sets = opts.sets || ['a', 'b', 'c']
  keys = opts.keys || ['x', 'y', 'z']
  values = opts.values || 10

  function rand(of) {
    var i = Math.floor(Math.random() * (of.length || of))
    return of[i] || i
  }

  var l = opts.total || 100

  while (l--) {
    crdt.set(rand(sets), rand(keys), rand(values))
  }
}
 
test('random', function (t) {

  var a = new crdt.GSet('set')
  var b = new crdt.GSet('set')
  var as = crdt.createStream(a)
  var bs = crdt.createStream(b)
  bs.pipe(validateUpdates(t)).pipe(as)

  randomUpdates(b)

  bs.flush() //this would be called in next tick

  console.log('B:', b.get())
  console.log('A:', a.get())

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

  bs.pipe(validateUpdates(t)).pipe(as)
  
  bs.flush() //this would be called in next tick

  var A = a.get()
  var B = b.get()

  assert.deepEqual(b.get(), a.get())

  t.end()
})
