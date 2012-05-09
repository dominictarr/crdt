
var crdt    = require('../..')
var connect = require('connect')
var es      = require('event-stream')
var io      = require('socket.io')
var _bs = require('browser-stream')

var app = connect()
  .use(connect.static(__dirname))

io = io.listen(app.listen(3000))


var set = new crdt.Doc()

set.on('update', console.log)

io.sockets.on('connection', function (sock) {

  var stream = crdt.createStream(set)
  var bs = _bs(sock)
  console.log(sock)
  bs.on('connection', function (s) {
    s.on('data', console.log)
    stream.pipe(s).pipe(stream)
  })
})
