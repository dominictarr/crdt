
function findOrCreate(row) {
  var id = row.id || row
  //handle if an html element has been passed
  if(row instanceof HTMLElement) return row
  if(id)
    el = document.getElementById(id)
  if(!el) {
    var el = document.createElement('div')
    el.setAttribute('id', id)
  }
  el.classList.add('row')
  return el
}

function css () {

return '                 \
.row {                   \
  border: solid 1px gray;\
  margin: 4px;           \
  width: 400px           \
}                        \
.row .key {              \
  min-width: 75px;       \
  display: inline-block; \
}                        \
.row .value {            \
  margin: 2px;           \
  display: inline-block; \
}                        ';

}

function render (row) {
  var html = ''//'<div class=row id="' row.id + '">\n'
  var o = row.toJSON()
  for(var k in o) {
    html += '<div class=pair>'
    html += '  <div class=key id="'+   row.id +':key:'+   k +'">' + k + '</div>\n'
    html += '  <div class=value id="'+ row.id +':value:'+ k +'">' + o[k] + '</div>\n'
    html += '</div>'
  }
  return html
}

//would be good to refactor this out...
//and make it installable as a middleware... 
//hmm, not that simple because will need:
//html, js, websocket to crdt documents.
//probably best to be something that can be
//added as an element to a page, for now.

module.exports = function (id, doc) {
  if(!doc)
    doc = id, id = 'crdt_debugger'
  var parent = findOrCreate(id)

  var style = document.createElement('style')
  style.innerText = css()
  document.head.appendChild(style)

  function update (row) {
    var el = findOrCreate(row)
    el.innerHTML = render(row)
    if(parent !== el.parentNode)
      parent.appendChild(el)
  }
  doc.on('row_update', update)
}

