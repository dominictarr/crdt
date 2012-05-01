
var crdt    = require('crdt')
var es      = require('event-stream')
var _bs = require('browser-stream')

var bs = _bs(io.connect('http://localhost:3000'))

var set = SET = new crdt.Set('set')

set.on('update', function (key, val) {
  console.log('UPDATE', key, val)
})

var stream = crdt.createStream(set)

stream.pipe(BS = bs.createStream('test')).pipe(stream)
