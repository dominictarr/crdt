var es   = require('event-stream')
var net  = require('net')
var crdt = require('..')
var assert = require('assert')


/*
  this tests CRDTs over an async connection.

  it relys on the CRDT deciding to emit stream on next tick.
  and emptying the queue.

  (those are the two bugs I discovered writing this)
*/


var a = new crdt.Set('set')
var as = crdt.createStream(a)
var b = new crdt.Set('set')
var bs = crdt.createStream(b)

function rand(of) {
  var i = Math.floor(Math.random() * (of.length || of))
  return of[i] || i
}

function toJSON (stream, name) {
  return stream.pipe(es.log(name)).pipe(es.stringify())
}

function fromJSON(stream, name) {
  var split = es.split()
  split.pipe(es.log(name)).pipe(es.parse()).pipe(stream)
  return split
}

// callback when a condition is met.
// return a function that must be polled.
// suitable for use as an event listener.

function eventually(test, cb) {
  return function () {
    if(test())
      cb()
  }
}

var allChanges = 10

//connect thourgh tcp
var server = net.createServer(function (sock) {
  toJSON(as, 'A>').pipe(sock).pipe(fromJSON(as, 'A<'))

// **************************************************
// DISCOVERY
// creating a stream from an CRDT needs to replay the histroy
// as well as new events!
// multiple streams may be attached at different times.
// **************************************************

  a.set('a', {hello: true})
  var i = 0
  var timer = setInterval(function () {
    var key , val;
    a.set(rand('abc'), key = rand('xyz'), val = rand('jkl'))
    //a will flush on nextTick
    if(0 >= allChanges-- )
      clearInterval(timer)
    console.log('update', key, val)
  }, 33)

  //  a.pipe(b).pipe(a)
}).listen(6464, function () {
toJSON(bs, 'B>').pipe(net.connect(6464)).pipe(fromJSON(bs, 'B<'))

  b.on('update', eventually(function () {
    try { 
      assert.deepEqual(a.get(), b.get()) 
      return allChanges <= 0
    } catch (e) {
      console.log(e.message)
      return false
    }
  }, function () {
    console.log('EVENTUALLY; CONSISTANT!')
    
    process.exit(0) 
  }))

})

/*
net.createServer(function (sock) {
  sock.write('hello')
}).listen(4242, function () {
  net.connect(4242).pipe(process.stdout, {end: false})
})
*/
