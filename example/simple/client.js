var crdt       = require('../..')
var reconnect  = require('shoe')
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
      ', status:'+ (Date.now - 5e3 > r.heartbeat ?  +
      '</div>'
  console.log(l)
  return $(l)
}

// we can start making connections before the dom is ready,
// but it will mess up the add events. etc.
// there is gotta be a better way to do this, 
// but this is acceptable for now.

$(function () {

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
      id: id       //just to show you can send metadata.
    })

    //connect to the crdt stream
    ds.pipe(doc.createStream()).pipe(ds)

  }).connect('/simple')

  //when a new row is created...
  //can't do add, because the document might not be ready yet.
  doc.on('add', function (row) {
    $('body')
      .append('hello')
      .append(render(row))
  }).on('row_update', function (row) {
    $('#'+row.id)
      .html(render(row))
  })

  var me = heartbeat(doc)
})
