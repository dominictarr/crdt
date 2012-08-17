var crdt       = require('../..')
var reconnect  = require('reconnect/shoe')
var $=window.$ = require('jquery-browserify')
var heartbeat  = require('./heartbeat')
var es         = require('event-stream')

var doc = window.DOC = new crdt.Doc()

function render(row) {
  var r = row.toJSON()
  return (
      '<div id='+ r.id +' class=heartbeat>'
       + ['id', 'create', 'heartbeat'].map(function (k) {
          return '<div><span class=key>'+k+'</span><span class=value>'+r[k]+'</span></div>'
        }).join('\n')
      + '</div>' 
    )
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
