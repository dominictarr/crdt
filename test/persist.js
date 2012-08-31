var crdt    = require('..')
var es      = require('event-stream')
var assert  = require('assertions')
var help    = require('./helpers')

var randomUpdates   = help.randomUpdates
var clone           = help.clone
var validateUpdates = help.validateUpdates

/*function test (name, test) {
  exports[name] = test
}*/

var next = process.nextTick

function test(n,t) {
  exports[n] = t
}

test('simple', function (t) {

  var a = new crdt.Doc()

  randomUpdates(a)
console.log('simple')
  a.createReadStream({wrapper: 'raw'})
    .pipe(es.writeArray(function (err, array) {
      console.log('array', array)
      array.forEach(function(v, i) {
        if(!i)
          assert.equal(v, a.id)
        else
          assert.equal(v.length, 4)
      })
      var sync = false
      var b = new crdt.Doc()
      var reader = es.readArray(array)
      reader
        .pipe(b.createWriteStream({wrapper: 'raw'}))

      reader.on('end', function () {
        assert.equal(a.id, b.id)
        assert.deepEqual(a.toJSON(), b.toJSON())
        console.log(b.toJSON())

        assert.ok(b.sync)
        assert.ok(sync)
        t.end()
      })

      b.on('sync', function () {
        sync = true
      })

    }))
})


test('JSON', function (t) {

  var a = new crdt.Doc()

  randomUpdates(a)
console.log('simple')
  a.createReadStream({wrapper: 'json'})
    .pipe(es.writeArray(function (err, array) {
      console.log('array', array)
      array.forEach(function(v, i) {
        console.log(v)
        v = JSON.parse(v)
        if(!i)
          assert.equal(v, a.id)
        else
          assert.equal(v.length, 4)
      })
      var sync = false
      var b = new crdt.Doc()
      var reader = es.readArray(array)
      reader
        .pipe(b.createWriteStream({wrapper: 'json'}))

      reader.on('end', function () {
        assert.equal(a.id, b.id)
        assert.deepEqual(a.toJSON(), b.toJSON())
        console.log(b.toJSON())

        assert.ok(b.sync)
        assert.ok(sync)
        t.end()
      })

      b.on('sync', function () {
        sync = true
      })

    }))
})


