
var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))

CONTENT = document.createElement('div')
CONTENT.id = 'chat'

// setup crdt to update dom elements.

var set = SET = new crdt.Set('set', {}, function (key) {
  var div = document.createElement('div')
    var o = new crdt.Obj(key, {}, function (key, val) { 
    console.log('update', key, val)
    div.innerHTML = val + '\n'
    this[key] = val
  })
  //this is CONTENT
  CONTENT.appendChild(div) 
  
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
    var m = /s\/([^\\]+)\/(.*)/.exec(this.value)
    if(m) {
      var search = m[1]
      var replace = m[2]
      //search & replace
      console.log('REPLACE:', search, 'WITH', replace)
      var set = SET.objects
      for(var k in set) {
        //oh... I threw away the state. hmm. need to do that differently.
        var text
        if((text = set[k].get().text) && ~text.indexOf(search)) {
          set[k].set('text', text.split(search).join(replace))
          console.log('TEXT TO UPDATE', text)
          //set doesn't seem to work when the value was set remotely
        }
      }
      //set.flush()
    } else 
      SET.set(['#'+Math.random()], {text: this.value})
    this.value = ''
  } 
  document.body.insertBefore(CONTENT, input)
}
