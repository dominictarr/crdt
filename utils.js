'use strict';
var b = require('between')

exports.clone = 
function (ary) {
  return ary.map(function (e) {
    return Array.isArray(e) ? exports.clone(e) : e
  })
}

exports.randstr   = b.randstr
exports.between   = b.between
exports.strord    = b.strord
exports.merge     = merge
exports.concat    = concat
exports.timestamp = timestamp


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

function concat(to, from) {
  while(from.length)
    to.push(from.shift())
  return to
}
