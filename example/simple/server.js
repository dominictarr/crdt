var crdt       = require('../..')
var connect    = require('express') //require('connect')
var es         = require('event-stream')
var createShoe = require('shoe')
var MuxDemux   = require('mux-demux')

var app = connect()
  .use(connect.static(__dirname))

var set = new crdt.Doc()

set.on('row_update', function (row) {
  console.log(row.toJSON())
})

var shoe = createShoe(function (sock) {
  var mx
  sock.pipe(mx = new MuxDemux({error: false})).pipe(sock)

  console.log(sock)

  mx.on('connection', function (s) {
    s.on('data', console.log)
    s.pipe(set.createStream()).pipe(s)
  })
})


var n = set.set('server', {
  name: 'server', create: new Date(), heartbeat: Date.now()
})

setInterval(function () {
  n.set('heartbeat', Date.now())
}, 1e3)

app.on('log', console.log)
shoe.install(app.listen(4242), '/simple')
console.log(app)
