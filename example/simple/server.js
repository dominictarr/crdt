var crdt       = require('../..')
var es         = require('event-stream')
var createShoe = require('shoe')
var heartbeat  = require('./heartbeat')
var http       = require('http')
var ecstatic   = require('ecstatic')

var doc = new crdt.Doc()
heartbeat(doc, 'Server')

doc.on('row_update', function (row) {
  console.log(row.toJSON())
})

var shoe = createShoe(function (sock) {
    //connect to the crdt stream
    sock
      .pipe(doc.createStream())
      .pipe(sock)
})


/*var n = doc.set('server', {
  name: 'server', create: new Date(), heartbeat: Date.now()
})
*/

var app = http.createServer(ecstatic(__dirname))
shoe.install(app.listen(3000), '/simple')

