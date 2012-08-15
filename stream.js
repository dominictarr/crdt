'use strict';
var Stream       = require('stream')
var u            = require('./utils')

exports.createStream = createStream
exports.createReadStream = createReadStream
exports.createWriteStream = createWriteStream
//stream
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/*
  to support scuttlebutt reconciliation, begin stream with a greeting
  that gives timestamp of data last recieved from each node.

  http://www.cs.cornell.edu/home/rvr/papers/flowgossip.pdf 

  pass in mode = scuttlebutt? 

  it's necessary to wait for the first greeting but that isn't 
  gonna happen when writing to disk.

  in that case, act a little different...

  so: nodes should communicate with the disk via
  createWriteStream createReadStream,
  and communicate with each other via
  createStream

  when ever I open a stream to disk, I either write or read.
  (usally switching when the stream ends)

  but if I'm communicating, that is typically a non-ending stream.
  also, when writing to disk, I want to save the id.
  so should begin by writing a {iam: id} message,
  and then read that in when reading.
*/

var streams = 1
function createStream (doc, opts) {
  var id = streams++ //used locally so to prevent writing update back to their source
  var s = new Stream() 
  s.writable = s.readable = true
  opts = opts || {}
  var queue = [], follow
  var other, recieved = {}

  function enqueue() {
    process.nextTick(s.flush)
  }

  function onUpdate (update, source) {
    if(source === id) return
      queue.push(update)
    enqueue()
  }

  function onSync () {
    //emitting histroy must be deferred because downstream
    //may not yet exist.  
    //send scuttlebutt greeting

    queue.push({iam: doc.id, iknow: doc.recieved})
    u.concat(queue, doc.history(opts.id)) 
    enqueue()
    follow = opts.id ? doc.get(opts.id) : doc
    follow.on('update', onUpdate)
    doc.removeListener('sync', onSync)
  }

  s.pipe = function (other) {
    //if _syncCount == 1 that means we are loading from the disk 
    //for the first time delay sending messages until then.
    //or should I remove this feature? it seriously won't happen much.
    //we'll see if it causes problems.

    if(doc.sync || doc._syncCount !== 1) onSync()
    else doc.on('sync', onSync)
    return Stream.prototype.pipe.call(this, other)
  }
 
  s.flush = function () {
    while(queue.length) {
      var update = queue.shift()
      //if message is scuttlebutt status
      if(!Array.isArray(update))
        s.emit('data', update)
      else {
        //if this has already been seen, do not send.
        var timestamp = update[2]
        var from      = update[3]
        if(!recieved[from] || timestamp >= recieved[from])
          s.emit('data', update)
      }
    }
  }

  s.write = function (data) {
    /*data may also be an scuttlebutt reconciliation
    message. in that case, use it to filter emits.
    if data is an object, it's to filter updates.
    remember it for later.
    */
    if(!Array.isArray(data)) {
      other = data.iam
      if(data.iknow)
        for(var k in data.iknow)
          recieved[k] = data.iknow[k] 
    } else
      doc.update(data, id)
    return true
  }

  s.end = function () {
    //stream is disconnecting.
    s.emit('end')
    s.destroy()
  }

  s.destroy = function () {  
    if(follow)
      follow.removeListener('update', onUpdate)
    doc.removeListener('sync', onSync)
    s.emit('close')
  }
  return s
}

function createReadStream(doc, opts) {
  opts = opts || {}
  if(opts.end !== false)
    opts.end = true
  var s = new Stream()
  var queue = []

  s.readable = true
  s.writable = false

  function onUpdate (data) {
    queue.push(data)
    enqueue()
  }

  s.pause = function () {
    s.paused = true
  }

  s.resume = function () {
    s.paused = false
  }

  function enqueue() {
    process.nextTick(s.flush)
  }

  s.flush = function () {
    while(queue.length && !s.paused)
      s.emit('data', queue.shift())
    if(opts.end && !queue.length && !s.paused && !s.ended) {
      s.emit('end')
      s.emit('close')
      s.ended = true
    }
  }

  s.destroy = function () { 
    queue.length = 0
    doc.removeListener('update', onUpdate)
    s.ended = true
    s.paused = false
    s.readable = false
  }

  s.pipe = function (other) {
    //emitting histroy must be deferred because downstream
    //may not yet exist.  
    //send scuttlebutt greeting
    queue.push({iam: doc.id})

    u.concat(queue, doc.history()) 
    enqueue()
    if(!opts.end)
      doc.on('update', onUpdate)

    return Stream.prototype.pipe.call(this, other)
  }

  return s 
}

function createWriteStream (doc, opts) {
   
  var s = new Stream()
  s.writable = true
  s.readable = false
  var first = false

  //if the doc has not been synced,
  //mark it as syncing...
  //hmm. that is what _syncCount does

  doc._syncCount = doc._syncCount || 0

  doc._syncCount ++

  s.write = function (data) {    
    if(s.ended)
      throw new Error('stream has ended')
    if(!first && data.iam){
      doc.id = data.iam
      first = true
    } else
      doc.update(data, 'local')
  }

  s.end = function (data) {
    if(data)
      s.write(data)
    s.ended = true
    s.emit('end')
    /*
      it may be desirable to sync to multiple sources.
      just incase, keep count and do not set sync = true
      unless you are the last one. 
    */
    if(--doc._syncCount === 0) {
      doc.sync = true
      doc.emit('sync')
    }
    s.emit('close') 
  }

  s.destroy = function () {
    s.ended = true
    s.writable = false
    if(!s.closed)
      s.emit('close')
    s.closed = true
  }

  return s 
}
