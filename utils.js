exports.clone = 
function (ary) {
  return ary.map(function (e) {
    return Array.isArray(e) ? exports.clone(e) : e
  })
}

exports.randstr   = randstr
exports.between   = between
exports.strord    = strord
exports.merge     = merge
exports.concat    = concat
exports.timestamp = timestamp

var chars =
//'!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
'!0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~'

function randstr(l) {
  var str = ''
  while(l--) 
    str += chars[
      Math.floor(
        Math.random() * chars.length 
      )
    ]
  return str
}

function between (a, b) {

  if(a === b)
    throw new Error('a === b')

  //force order
  if(a > b) {
    var t = b; b = a; a = t
  }

  var s = '', i = 0

  //match prefixes
  while(a[i] === b[i]) s += a[i++]

  var _a = chars.indexOf(a[i])
  var _b = chars.indexOf(b[i])
  
  //if the indexes are adjacent, must lengthen the
  //key. note: P is the middle most letter.
  if(_a + 1 === _b) 
    s += a[i] + 'P'
  //otherwise, append the letter that is halfway
  //between _a and _b.
  else
    s += chars[Math.round((_a+_b)/2)]

  return s
}


//utils
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function merge(to, from) {
  for(var k in from)
    to[k] = from[k]
  return to
}

var _last = 0
var _count = 1
var LAST
function timestamp () {
  var t = Date.now()
  var _t = t
  if(_last == t) {
//    while(_last == _t)
    _t += ((_count++)/1000) 
  } 
  else _count = 1 

  _last = t

  if(_t === LAST)
    throw new Error('LAST:' + LAST + ',' + _t)
  LAST = _t
  return _t
}


function strord (a, b) {
  return (
    a == b ?  0
  : a <  b ? -1
  :           1
  )
}

function concat(to, from) {
  while(from.length)
    to.push(from.shift())
  return to
}
