

var crdt = require('..')
var a    = require('assertions')

var doc = new crdt.Doc()
var hoc = new crdt.Doc()
var loc = new crdt.Doc()
doc.sync = hoc.sync = loc.sync = true
var ls = crdt.sync(doc, hoc)
var hs = crdt.sync(doc, loc)

//what happens if the streams are connected in a loop?
//that is not allowed. 
//because createStream will not reemit 
//written data, because it expects the stream
//to pipe back to the source.

var next = process.nextTick

exports.test = function (t) {

doc.add({id: 'abc', hello: 3})

next(function () {

  console.log('HOC', doc, hoc, loc)

  a.deepEqual(hoc.toJSON(), doc.toJSON())

  a.deepEqual(loc.toJSON(), doc.toJSON())

  hoc.set('abc', {goodbye: 5})

  next(function () {

    a.deepEqual(hoc.toJSON(), doc.toJSON())
    
    next(function () { 
      a.deepEqual(loc.toJSON(), doc.toJSON())
      t.end()
    })
  })
})

}
