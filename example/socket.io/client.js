

var crdt    = require('crdt')
var _bs = require('browser-stream')
var bs = _bs(io.connect('http://localhost:3000'))

/*
  tidy this example & use jQuery
*/
function createChat (el, stream) {
  var input, CONTENT
  var chat = $(el) //stick everything into the chat 
    .append(CONTENT = $('<div class=chat_text>'))
    .append(input   = $('<input type=text>'))

  messages = null

  var set = SET =
  new crdt.GSet('set').init({
    messages: messages = new crdt.GSet()
    .on('new', function (obj) {
      var div, span, a

      div = 
      $('<div class=line>')
        .append(span = $('<span class=message>'))
        .append(a = $('<a href=# class=del>x</a>')
          .click(function () {
            obj.set({__delete: true})
          })
        )

      CONTENT.append(div)

      obj.on('update', function () {
        if(obj.get().__delete) {
          div.remove()
          obj.removeAllListeners('update')
        }
        span.text(obj.get().text)
      })

      setTimeout(function () {
      //scroll to bottom
        CONTENT[0].scrollTop = 9999999
      }, 10)

    })
    ,
    users: new crdt.Obj()
    //track this too 
  })

  stream.pipe(crdt.createStream(set)).pipe(stream)

  input.change(function () {
    //enter chat message
    var m = /s\/([^\\]+)\/(.*)/.exec(this.value)
    if(m) {
      var search = m[1]
      var replace = m[2]
      //search & replace
      var set = messages.objects
      for(var k in set) {
        //oh... I threw away the state. hmm. need to do that differently.
        var item = set[k].get(), text = item.text
        if(text && ~text.indexOf(search) && !item.__delete) {
          set[k].set('text', text.split(search).join(replace))
        }
      }
      set.flush()
    } else 
      messages.set(['_'+Date.now()], {text: this.value})
    this.value = ''
  })
}


$(function () {
  createChat('#chat', bs.createStream('test'))    
})

