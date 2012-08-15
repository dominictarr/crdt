var crdt       = require('../..')
var reconnect  = require('reconnect/shoe')
var MuxDemux   = require('mux-demux')
var $=window.$ = require('jquery-browserify')
var heartbeat  = require('./heartbeat')

var doc = window.DOC = new crdt.Doc()

function render(row) {
  var l 
  var r = row.toJSON()
  l = '<div id='+ r.id +'> id: '+ r.id +
      ' created:'+ r.create +
      ', heartbeat:'+ r.heartbeat +
      '</div>'
  return $(l)
}

$(function () {

  //when a new row is created...
  doc.on('add', function (row) {
    $('body').append(render(row))
  }).on('row_update', function (row) {
    $('#'+row.id).html(render(row))
  })

  var me = heartbeat(doc)

  //connect, and then reconnect after wifi goes down.
  reconnect(function (shoe) {
    var mx

    //set up the base stream.
    shoe.pipe(mx = new MuxDemux({error: false})).pipe(shoe)

    mx.pipe(shoe).pipe(mx)

    // create streams with mx! to send
    // make as many as you like,
    // with out the overhead of a whole tcp connection.
    var ds = mx.createStream({
      type:'crdt', //not mandatory
      id: me.id       //just to show you can send metadata.
    })

    //connect to the crdt stream
    ds.pipe(doc.createStream()).pipe(ds)

  }).connect('/simple')

})
