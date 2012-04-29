
var Stream = require('stream').Stream
var crdt = require('./index')
module.exports = 
function create () {
  return addStreaming(new crdt.GSet('set'))
}

function addStreaming(set) {

  s = set
  var sequence = 1
  s.pipe = Stream.prototype.pipe
  //s.set = set
  var queued = false
  s.readable = s.writable = true

  s._flush = function () {
    if(!queued) return

    var updates = set.flush()
    if(!updates.length)
      throw new Error('NO UPDATES?')
    while(updates.length) { 
      var update = updates.shift()
      if(update) {
        update.push(sequence++)
        s.emit('data', update)
      }
    }
    queued = false
  }

  set.on('queue', function () {
    if(queued) return
    queued = true
    //  process.nextTick(s.flush)
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
