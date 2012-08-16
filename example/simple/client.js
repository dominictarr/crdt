var crdt       = require('../..')
var reconnect  = require('reconnect/shoe')
var $=window.$ = require('jquery-browserify')
var heartbeat  = require('./heartbeat')
var es         = require('event-stream')

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

    //connect to the crdt stream
    shoe
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(doc.createStream())
      .pipe(es.stringify())
      .pipe(shoe)

  }).connect('/simple')

})
