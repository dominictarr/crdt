
var crdt     = require('../..')
var connect  = require('connect')
var es       = require('event-stream')
var shoe     = require('shoe')
var MuxDemux = require('mux-demux')

var app = connect()
  .use(connect.static(__dirname))


var set = new crdt.Doc()

set.on('row_update', function (row) {
  console.log(row.toJSON())
})

shoe(function (sock) {
  var mx
  sock.pipe(mx = new MuxDemux(function (s) {
    s.on('data', console.log)
    s.pipe(crdt.createStream(set)).pipe(s)
  })).pipe(sock)
}).install(app.listen(3000), '/shoe')

