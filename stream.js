
var Stream = require('stream').Stream
var crdt = require('./index')
module.exports = 
function create (set, name) {
  return createStream(set || new crdt.GSet('set'), name)
}


function createStream(set, name) {

  if(!set)
    throw new Error('expected a collection CRDT')
  var s = new Stream()
  var sequence = 1
  //s.set = set
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
    
    set.on('flush', function (updates) {
      updates.forEach(function (e) {
        queue.push(e)
      })
    })

   //got to defer writing the histroy,
    //because there may still be more downstream
    //pipes that are not connected yet!

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
      var update = queue.shift().slice()
      if(update) {
        update[0] = update[0].slice()
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

  s.write = function (update) {
    // [path, time, update]
    // hard code only one Set right now.

    update[0].shift()

    set.update(update)

    // now is when it's time to emit events?
    /*
      apply local update with set(key, value)
      or set(obj)
      queue changes, then call flush()
      which adds the update to histroy and returns it.

    */
    return true
  }

  //need to know if an event has come from inside
  //or outside...
  //should it be sent, or not? 
  //indeed, how to apply a local change?

  return s
}
