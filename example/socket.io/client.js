

var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))
var kv = require('kv')('crdt_example')

var createChat = require('./chat')
var createMice = require('./mouses')
var createSets = require('./sets')

var doc = DOC = new crdt.Doc()

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

$(function () {
  var stream = crdt.createStream(doc)
  stream.pipe(bs.createStream('test')).pipe(stream)
  createChat('#chat', doc)
  //createMice(doc)
  createSets('#sets', doc)
  //  SET = new crdt.Doc()
  //MESSAGES = SET.createSet'type', 'message')
  //var stream = crdt.createStream(SET)
  //stream.pipe(bs.createStream('test')).pipe(stream)
})

