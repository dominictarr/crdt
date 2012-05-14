/*
  show other mouses of other users.

  so that users don't feel lonely.
*/

var crdt = require('crdt')

module.exports =
function (doc) {

  var mice = doc.createSet('type', 'mouse') 

  var m = doc.add({id: 'user'+doc.id, type: 'mouse'})
  var last = 0
  window.addEventListener('mousemove', function (e) {
    if(last + 100 < Date.now()) {
      var ch = {x: e.x, y: e.y}
      if(!m.get('in')) ch.in = true
      m.set(ch)
      last = Date.now()
    }
  })

  window.addEventListener('mouseout', function (e) {
    if(m.get('in')) {
      m.set({in: false})
    }
  })

  mice.on('add', function (m) {
    console.log('ADD', m)
    var pointer = 
    $('<span class=pointer>' + m.id +'</span>')
      .css({position: 'absolute'})

    $('body').append(pointer)

    m.on('update', function () {
      console.log(m.get('id'), m.get('x'), m.get('y'), m.get('in'))
      pointer.css({
        left: m.get('x')
      , top: m.get('y')
      , display: m.get('in') ? 'block' : 'none'})
    })
  })
} 
