var crdt       = require('../..')
var reconnect  = require('reconnect')
var MuxDemux   = require('mux-demux')
var kv         = require('kv')('crdt_example')
var domready   = require('domready')

var createChat = require('./chat')
var createMice = require('./mouses')
var createSets = require('./sets')

//some data to replicate!
var docs = window.DOCS = {
  todo: new crdt.Doc(),
  chat: new crdt.Doc(),
  mice: new crdt.Doc()
}

domready(function () {

  reconnect(function (stream) {
    var mx = MuxDemux()
    //connect remote to mux-demux
    stream.pipe(mx).pipe(stream)

    //connect the crdt documents through mux-demux
    ;['todo', 'mice', 'chat'].forEach(function (name) {
      var ds = docs[name].createStream({wrapper: 'raw'})
      ds.pipe(mx.createStream({type: name})).pipe(ds)
    })
    console.log('reconnect!')
  }).connect('/shoe')

  createMice(docs.mice)
  createChat('#chat', docs.chat)
  createSets('#sets', docs.todo)
})


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

sync(docs.todo, 'TODO2-')
*/

