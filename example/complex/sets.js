var crdt = require('crdt')

/*
  add some sets, that items can be dragged and dropped between,
  a la trello.

  refactor this to decouple and to add support for crdt ordering.

  change css to make lists parellel.
  
  'add' link, inplace editing.
*/

function seqWidget( el, seq, template ) {
  el = $(el)
  var name = el.attr('id')
  
  function update (r) { 
    var li = $('#'+r.id)
    li = li.length ? li : $(template(r))

    var i = seq.indexOf(r) 
    if(el.children().index(li) == i) return //already in place

    var next = seq.next(r)
    if (next) li.insertBefore($('#'+next.id)) 
    else el.append(li) 
  }

  seq.on('move', update) //when a member of the set updates

  function change (_, ui) {
    var itemId = ui.item.attr('id')
    var i = $(this).children().index(ui.item)
    //update event is emitted when a item is removed from a set.
    //in that case i will be -1. 
    //changeSet will detect the correct index, though.
    //if item is not already in correct position, move
    if(~i && seq.indexOf(itemId) !== i)
      seq.before(itemId, ui.item.next().attr('id'))
  }

  el.sortable({
    connectWith: '.sortable',
    receive: change,
    update: change
  })

  return el
  
}

module.exports = 
function (div, doc) {
 
  var c = 0
  div = $(div)

  var a = doc.createSeq('set', 'a')
  var b = doc.createSeq('set', 'b')
  var c = doc.createSeq('set', 'c')

  function inplace (initial, cb) {
    var i = $('<input>')
    var done = false
    i.attr('value', initial)
    function edit (e) {
      if(done) return
      done = true
      cb.call(this, this.value)
      i.remove()
    }
    i.change(edit)
    i.blur(edit)
    setTimeout(function () {i.focus()}, 1)
    return i
  }

  function t (r) {
    var text, check
    var el = $('<li id='+r.id + '>')
      .append(text = $('<span>'+r.get('text')+'</span>'))
      .append(check = $('<input type=checkbox>'))

    r.on('update', function () {
      text.text(r.get('text'))
      check.attr('checked', r.get('checked'))
    }) 

    check.attr('checked', !! r.get('checked'))
    check.click(function () {
      r.set({checked: !! check.attr('checked')})
    })

    text.click(function () {
      text.hide()
      el.append(inplace(r.get('text'), function (val) {
        if(val) r.set({text: val})
        text.show()
      }))
    })
    return el
  }

  function st (q) {
    return $('<ul class=sortable id='+q.id+'>')
  }

  function addable (s, q) {
    var add
    var el = $('<div class=sortbox>')
      .append(s)
      .append(add = $('<a href=#>add</a>'))

    add.click(function () {
      add.hide()
      el.append(inplace('', function (val) {
        if(val) q.push({text: val})
        add.show()
      }))
    })
    return el 
  }

  div
    .append(addable(seqWidget(st(a), a, t), a))
    .append(addable(seqWidget(st(b), b, t), b))
    .append(addable(seqWidget(st(c), c, t), c))
 
  /*
    nest the div inside another set...
    so that it is concurrently sortable
    like trello.
  */
 
  div.sortable()

  a.on('move', function (r) {
    console.log('MOVE', r, a.indexOf(r))
  })

  setTimeout(function () {

/*  var n = Math.round(Math.random() * 100)
  a.push({id: 'item' + n, text: 'hello' + n})

  n = Math.round(Math.random() * 100)
  b.push({id: 'item' + n, text: 'hello' + n})

  n = Math.round(Math.random() * 100)
  c.push({id: 'item' + n, text: 'hello' + n})
*/
  }, 100)
}
