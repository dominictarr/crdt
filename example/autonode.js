
var crdt         = require('..')
var autonode     = require('autonode')
var es           = require('event-stream')
var opts         = require('optimist').argv
var EventEmitter = require('events').EventEmitter

var m = new crdt.Doc()

if(!module.parent) {

  if(!opts.name) {
    console.error('usage: node autonode.js --name NAME')
    process.exit(1)
  }

  autonode(function (stream) {
    stream
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(m.createStream())
      .pipe(es.stringify())
      .pipe(stream)
  }).listen(4242)

  // we do not have to wait for the connection. 
  // we can start changing the model right away
  // this information will be replicated when the connection is down.

  m.on('row_update', function (row) {
    console.log(row.toJSON())
  })

  var item = m.set(opts.name, {timestamp: new Date(), pid: process.pid})

  setInterval(function () {
    item.set('random', Math.round(Math.random() * 100))
  }, 1e3)

}
