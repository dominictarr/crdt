

var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))

var createChat = require('./chat')
var createMice = require('./mouses')
var createSets = require('./sets')

var doc = new crdt.Doc()

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

