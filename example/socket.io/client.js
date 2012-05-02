
var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))

CONTENT = document.createElement('div')
CONTENT.id = 'chat'

// setup crdt to update dom elements.

var set = SET = new crdt.Set('set', CONTENT, function (key) {
  var div = document.createElement('div')
  var o = new crdt.Obj(key, div, function (key, val) { 
    this.innerHTML += key +': ' + val + '\n'
  })
  //this is CONTENT
  this.appendChild(div) 
  
  process.nextTick(function () {
    //scroll to bottom
    CONTENT.scrollTop = 9999999
  }, 10)
  return o 
})

//or should I decouple this and just use events?
//and paths?

var stream = crdt.createStream(set)

stream.pipe(BS = bs.createStream('test')).pipe(stream)

window.onload = function () {
  var input = document.getElementById('input')
  input.onchange = function () {
    //enter chat message
    SET.set(['#'+Math.random()], {text: this.value})
    this.value = ''
  } 
  document.body.insertBefore(CONTENT, input)
}
