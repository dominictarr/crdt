//index
'use strict';

var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter

exports = module.exports = require('./doc')
exports.Row              = require('./row')

exports.sync             = sync
exports.Set              = require('./set')
exports.Seq              = require('./seq')

exports.Doc = exports

function sync(a, b) {
  var as = a.createStream()
  var bs = b.createStream()
  return as.pipe(bs).pipe(as)
}


exports.createStream = function (doc, opts) {
  return doc.createStream(opts)
}
