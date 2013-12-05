
var crdt     = require('../..')
var shoe     = require('shoe')
var MuxDemux = require('mux-demux')
var kv       = require('kv')
var ecstatic = require('ecstatic')
var http     = require('http')

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
      s.pipe(docs[s.meta.type].createStream({wrapper: 'raw'})).pipe(s)
  })).pipe(sock)
})

.install(http.createServer(ecstatic(__dirname)).listen(3000), '/shoe')

