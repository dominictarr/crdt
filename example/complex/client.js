var crdt       = require('crdt')
var reconnect  = require('reconnect/shoe')
var MuxDemux   = require('mux-demux')
//var kv         = require('kv')('crdt_example')

var createChat = require('./chat')
var createMice = require('./mouses')
var createSets = require('./sets')

var doc = DOC = new crdt.Doc()

/*
function sync(doc, name) {
  function write () {
    doc.createReadStream({end: false}) //track changes forever
      .pipe(kv.put(name))   
  }
  kv.has(name, function (err) {
    if(err) { //the doc is new
      doc.sync = true
      return write() 
    }
    var stream = kv.get(name)
    stream.once('end', write)
      .pipe(doc.createWriteStream())
  })
}

sync(doc, 'DOC')
*/

$(function () {
  reconnect(function (stream) {
    var mx = MuxDemux(), ds = doc.createStream()
    //connect remote to mux-demux
    stream.pipe(mx).pipe(stream)
    //connect the crdt document through mux-demux
    ds.pipe(mx.createStream()).pipe(ds)
    console.log('reconnect!')
  }).connect('/shoe')

  createMice(doc)
  createChat('#chat', doc)
  createSets('#sets', doc)
})

