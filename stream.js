
var Stream = require('stream').Stream
var crdt = require('./index')
var utils = require('./utils')

var clone = utils.clone

module.exports = 
function create (set, name) {
  return createStream(set || new crdt.GSet('set'), name)
}

var _id = 0
function createStream(set, name) {

  if(!set)
    throw new Error('expected a collection CRDT')
  var s = new Stream()
  s._id = _id ++
  var sequence = 1
  //s.set = seex kt
  var queued = false
  var queue = []
  s.readable = s.writable = true
  s.pipe = function (stream) {

    var dest = Stream.prototype.pipe.call(this, stream)

    //and now write the histroy!
    var hist = set.history()
    hist.sort(function (a, b) { 
      return a[2] - b[2]
    })
    while(hist.length)
      queue.push(hist.shift())        

    console.log('ENQUEUED HISTORY', queue)    

    set.on('flush', function (updates) {
      console.log('-->FLUSHED')
      updates.forEach(function (e) {
        queue.push(e)
      }) 
      process.nextTick(s.flush)
    })

  //emit data that has 
  set.on('written', function (update, _id) {
    console.log('WRITTEN', update, _id, s._id)
    if(_id == s._id) return
    queue.push(update)
    process.nextTick(s.flush)
  })

   //got to defer writing the histroy,
    //because there may still be more downstream
    //pipes that are not connected yet!

    process.nextTick(s.flush)

    return dest
  }

  s.flush = function () {
    //if(!queue.length) 
    set.flush()//force a flush
    if(!queue.length)
      return

    while(queue.length) { 
      //this is breaking stuff in tests, because references are shared
      //with the test
      var update = clone(queue.shift())
      if(update) {
        update.push(sequence++) // append sequence numbers for this oregin
        console.log('>data>', name, update)
        s.emit('data', update)
      }
    }
    
    queued = false
  }

  set.on('queue', function () {
    console.log('QUEUE')
    if(queue.length) return
    process.nextTick(s.flush)
  })

/*
******************************
WRITES FROM OTHER NODES MUST BE WRITTEN TO ALL LISTENERS.


******************************
*/

  s.write = function (update) {
    // [path, time, update]
    // hard code only one Set right now.
    var _update = clone(update)
    update[0].shift()

    set.update(update)

    // now is when it's time to emit events?
    /*
      apply local update with set(key, value)
      or set(obj)
      queue changes, then call flush()
      which adds the update to histroy and returns it.

    */

    //emit this so that other connections from this CRDT
    //and emit.
    //man, am doing a lot of this copying...
    set.emit('written', _update, s._id)

    return true
  }

  //need to know if an event has come from inside
  //or outside...
  //should it be sent, or not? 
  //indeed, how to apply a local change?

  return s
}
