

var next = process.nextTick

var crdt = require('..')
var a    = require('assertions')

exports.test = function (t) {

  var doc = new crdt.Doc()
  var hoc = new crdt.Doc()

  var ds = crdt.createStream(doc)
  var hs = crdt.createStream(hoc)

  ds.pipe(hs).pipe(ds)

  doc.add({id: 'abc', hello: 3})

  console.log('DOC', doc)
  next(function () {
    a.deepEqual(hoc.toJSON(), doc.toJSON())

    hoc.set('abc', {goodbye: 5})

    next(function () { 

      a.deepEqual(hoc.toJSON(), doc.toJSON())

      doc.set('abc', {hello: 7})
      next(function () {

        a.deepEqual(hoc.toJSON(), doc.toJSON())

        console.log('DOC', doc.toJSON())
        console.log('HOC', hoc.toJSON())

        var moc = new crdt.Doc()

        var hs2 = crdt.createStream(hoc)
        var ms = crdt.createStream(moc)

        console.log('DHIST', doc.history())
        console.log('HHIST', hoc.history())

        hs2.pipe(ms).pipe(hs2)

        next(function () {
          a.deepEqual(moc.toJSON(), doc.toJSON())
          console.log('PASSED')
          t.end()
        })
      })
    })
  })

}

exports.listen = function (t) {

  var doc = new crdt.Doc()
  var hoc = new crdt.Doc()

  var random = Math.random()
  var thing = doc.get('thing')
  thing.on('changes', function (r) {
    a.equal(thing.get('random'), random)
    t.end()
  })

  crdt.createStream(hoc).pipe(crdt.createStream(doc))
  hoc.add({id: 'thing', random: random }) 
}

