
var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))

CONTENT = document.createElement('div')
CONTENT.id = 'chat'

messages = null
var set = SET =
new crdt.GSet('set').init({
  messages: messages = new crdt.GSet()
  .on('new', function (obj) {

    var div = document.createElement('div')
    var p = document.createElement('span')
    var a = document.createElement('a')

    a.href = '#'
    a.innerHTML = 'x'

    a.onclick = function () {
      obj.set({__delete: true})
    }

    div.appendChild(p)
    div.appendChild(a)
    obj.on('update', function () {
      if(obj.get().__delete) {
        CONTENT.removeChild(div)
        obj.removeAllListeners('update')
      }
      p.innerText = JSON.stringify(obj.get())
    })
    setTimeout(function () {
    //scroll to bottom
      CONTENT.scrollTop = 9999999
    }, 10)
    CONTENT.appendChild(div)
  })
  ,
  users: new crdt.Obj()
  //track this too 
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
      var set = messages.objects
      for(var k in set) {
        //oh... I threw away the state. hmm. need to do that differently.
        var item = set[k].get(), text = item.text
        if(text && ~text.indexOf(search) && !item.__delete) {
          set[k].set('text', text.split(search).join(replace))
          console.log('TEXT TO UPDATE', text)
          //set doesn't seem to work when the value was set remotely
        }
      }
      set.flush()
    } else 
      messages.set(['_'+Date.now()], {text: this.value})
    this.value = ''
  } 
  document.body.insertBefore(CONTENT, input)
}
