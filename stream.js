
var Stream       = require('stream')
var u            = require('./utils')

module.exports = createStream

//stream
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var streams = 1

function createStream (doc) {
  var id = streams++ //used locally so to prevent writing update back to their source
  var s = new Stream() 
  s.writable = s.readable = true
  var queue = []

  function enqueue() {
    process.nextTick(s.flush)
  }

  function onUpdate (update, source) {
    if(source === id) return
      queue.push(update)
    enqueue()
  }

  s.pipe = function (other) {
    //emitting histroy must be deferred because downstream
    //may not yet exist.  
    u.concat(queue, doc.history()) 
    enqueue()
    doc.on('update', onUpdate)

    return Stream.prototype.pipe.call(this, other)
  }
  
  s.flush = function () {
    while(queue.length)
      s.emit('data', queue.shift())
  }

  s.write = function (data) {
    doc.update(data, id)
    return true
  }

  s.end = function () {
    //stream is disconnecting.
    doc.removeListener('update', onUpdate)
    s.emit('end')
  }

  return s
}


