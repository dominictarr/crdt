
var crdt     = require('../..')
var connect  = require('connect')
var shoe     = require('shoe')
var MuxDemux = require('mux-demux')
var kv       = require('kv')

var app = connect()
  .use(connect.static(__dirname))

var docs = {
  todo: new crdt.Doc(),
  chat: new crdt.Doc(),
  mice: new crdt.Doc()
}

;['todo', 'chat', 'mice'].forEach(function (name) {
  docs[name].on('row_update', function (row) {
    console.log(row.toJSON())
  })
})

shoe(function (sock) {
  var mx
  sock.pipe(mx = new MuxDemux(function (s) {
    if(!s.meta || !docs[s.meta.type])
      s.error('Unknown Doc' + JSON.stringify(s.meta))
    else
      s.pipe(docs[s.meta.type].createStream()).pipe(s)
  })).pipe(sock)
}).install(app.listen(3000), '/shoe')

