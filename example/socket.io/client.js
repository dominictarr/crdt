

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

  var set = SET = new crdt.Doc()

  var messages = set.createSet('type', 'message')

  messages.on('add', function (obj) {
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
        if(obj.get('__delete')) {
          div.remove()
          obj.removeAllListeners('update')
        }
        span.text(obj.get('text'))
      })

      setTimeout(function () {
      //scroll to bottom
        CONTENT[0].scrollTop = 9999999
      }, 10)

    })

  stream.pipe(crdt.createStream(set)).pipe(stream)

  input.change(function () {
    //enter chat message
    var m = /s\/([^\\]+)\/(.*)/.exec(this.value)
    if(m) {
      var search = m[1]
      var replace = m[2]
      //search & replace
      messages.each(function (e) {
        var item = e.get(), text = item.text
        if(text && ~text.indexOf(search) && !item.__delete) {
          e.set('text', ntext.split(search).join(replace))
        }
      })
    } else 
      SET.set('_'+Date.now(), {text: this.value, type: 'message'})
    this.value = ''
  })
}

$(function () {
  createChat('#chat', bs.createStream('test'))
  //  SET = new crdt.Doc()
  //MESSAGES = SET.createSet('type', 'message')
  //var stream = crdt.createStream(SET)
  //stream.pipe(bs.createStream('test')).pipe(stream)
})

