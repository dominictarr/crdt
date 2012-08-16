var crdt       = require('../..')
var connect    = require('express') //require('connect')
var es         = require('event-stream')
var createShoe = require('shoe')

var app = connect()
  .use(connect.static(__dirname))

var set = new crdt.Doc()

set.on('row_update', function (row) {
  console.log(row.toJSON())
})

var shoe = createShoe(function (sock) {
    //connect to the crdt stream
    sock
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(set.createStream())
      .pipe(es.stringify())
      .pipe(sock)
})


var n = set.set('server', {
  name: 'server', create: new Date(), heartbeat: Date.now()
})

setInterval(function () {
  n.set('heartbeat', Date.now())
}, 1e3)

app.on('log', console.log)
shoe.install(app.listen(3000), '/simple')

