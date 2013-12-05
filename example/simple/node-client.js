var crdt       = require('../..')
var reconnect  = require('reconnect/sock')
var heartbeat  = require('./heartbeat')
//var es         = require('event-stream')
//var debug      = require('../../debug')

var doc =  new crdt.Doc()

/*function render(row) {
  var r = row.toJSON()
  return (
      '<div id='+ r.id +' class=heartbeat>'
       + ['id', 'create', 'heartbeat'].map(function (k) {
          return '<div><span class=key>'+k+'</span><span class=value>'+r[k]+'</span></div>'
        }).join('\n')
      + '</div>' 
    )
}*/
doc.on('row_update', function (row) {
      console.log(row.toJSON())
})


  //when a new row is created...
/*  doc.on('add', function (row) {
    $('body').append(render(row))
  }).on('row_update', function (row) {
    $('#'+row.id).html(render(row))
  })
*/

  var me = heartbeat(doc)

  //connect, and then reconnect after wifi goes down.
  reconnect(function (shoe) {

    //connect to the crdt stream
    shoe
      .pipe(doc.createStream())
      .pipe(shoe)

  }).connect('http://localhost:3000/simple')

