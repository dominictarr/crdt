//index
'use strict';

var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter
var u            = require('./utils')

exports = module.exports = require('./doc')
exports.Row              = require('./row')
exports.createStream     = require('./stream').createStream
exports.sync             = sync
exports.Set              = require('./set')
exports.Seq              = require('./seq')

exports.Doc = exports

function sync(a, b) {
  var as = exports.createStream(a)
  var bs = exports.createStream(b)
  return as.pipe(bs).pipe(as)
}

