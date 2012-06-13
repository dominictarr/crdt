

var next = process.nextTick

var crdt = require('..')
var a    = require('assertions')

exports.test = function (t) {

  var doc = new crdt.Doc()
  var hoc = new crdt.Doc()
  doc.sync = hoc.sync = true
  var ds = crdt.createStream(doc)
  var hs = crdt.createStream(hoc)

  ds.pipe(hs).pipe(ds)

  doc.add({id: 'abc', hello: 3})

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
  doc.sync = hoc.sync = true

  var random = Math.random()
  var thing = doc.get('thing')
  thing.on('changes', function (r) {
    a.equal(thing.get('random'), random)
    t.end()
  })

  crdt.createStream(hoc).pipe(crdt.createStream(doc))
  hoc.add({id: 'thing', random: random }) 
}

exports.single = function (t) {

  var doc = new crdt.Doc()
  var hoc = new crdt.Doc()
  doc.sync = hoc.sync = true

  //getting this weird thing...
  function assertNormal (doc, name) {
    a.equal(null,  doc.toJSON()['[object Object]'], name + ' should be normal')
  }


  //this should replicate only one document.
  hoc.createStream({id: 'thing'})
    .pipe(doc.createStream({id: 'thing'}))

  var thing = hoc.get('thing')

  assertNormal(hoc, 'hoc')

  thing.set({
    whatever: Math.random(),
    prop: 'value',
    number: ~~(Math.random()*92)
  })

  assertNormal(doc, 'doc')
  assertNormal(hoc, 'hoc')

  next(function () {

    var hThing = hoc.get('thing')
  assertNormal(doc, 'doc')
  assertNormal(doc, 'hoc')


    a.deepEqual(hThing.toJSON(), thing.toJSON())

    var thing2 = hoc.get('thing2').set({random: Math.random()})
    var hThing2 = doc.get('thing2')

    console.log('HOC', hoc.toJSON())
    console.log('DOC', doc.toJSON())

    console.log(hThing2)

    a.throws(function () {
      a.deepEqual(hThing2.toJSON(), thing2.toJSON())
    })

    
    t.end()
  })
}

