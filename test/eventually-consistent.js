'use strict';
var next = process.nextTick

var help = require('./helpers')

var crdt = require('..')
var a    = require('assertions')

var doc = new crdt.Doc()
var hoc = new crdt.Doc()
doc.sync = hoc.sync = true

var ds = crdt.createStream(doc)
var hs = crdt.createStream(hoc)

var piped = false
var consistent = false

setTimeout(function () {
  piped = true
  console.log('pipe')
  ds.pipe(hs).pipe(ds)
}, Math.random()*10)

var c = 100
exports.test = function (t) {
  help.eventuallyConsistent(doc, hoc
  , function () { 
      return c <= 0 && piped
    },
    function () {
      a.deepEqual(doc.history(), hoc.history())
      a.deepEqual(doc.toJSON(), hoc.toJSON())
      consistent = true
      t.end()
    }
  )

  var timer = setInterval(function () {
    c --
    if(c < 0)
       return clearTimeout(timer)

    help.randomUpdates(Math.random() > 0.5 ? doc : hoc)
  }, 0)

  var it =  require('it-is').style('colour')
  process.on('exit', function () { 
    it(doc.history()).has(hoc.history())
    it(hoc.history()).has(doc.history())
    a.deepEqual(doc.toJSON(), hoc.toJSON())
    it(consistent).ok()
    t.end()
  })
}

