var crdt       = require('../..')
var connect    = require('express') //require('connect')
var es         = require('event-stream')
var createShoe = require('shoe')
var heartbeat  = require('./heartbeat')

var app = connect()
  .use(connect.static(__dirname))

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

app.on('log', console.log)
shoe.install(app.listen(3000), '/simple')

