'use strict';

var next = process.nextTick

var crdt = require('..')
var a    = require('assertions')

exports.test = function (t) {

  var doc = new crdt.Doc()
  var r = Math.random()
  var row = doc.add({})
  row.set('__proto__', {WHAT: r})
  t.equal(row.get('WHAT'), null)
  t.end()
}

