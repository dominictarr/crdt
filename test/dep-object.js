var test = require('tap').test
var crdt = require('..')

function Model () {
  if (!(this instanceof Model)) return new Model()
}

Model.prototype.set = function (key, val) {
  console.log(key, val)
  this['_'+key] = val
  return this
}

Model.prototype.get = function (key) {
  return this['_'+key]
}

test('dependant object', function (t) {

  var model = new Model()
  var obj = new crdt.Obj('key')
  .on('update', function (changes) {
    for (var k in changes)
      model.set(k, changes[k])
  })

  obj.set({a: 1, b: 2})
  obj.flush()

  t.equal(model.get('a'), 1)
  t.equal(model.get('b'), 2)

  t.end()

})

test('dependant set', function (t) {
  var model = []

  var set = new crdt.GSet('set')
  .on('new', function (obj) {
    model.push(obj.get())
  })

  set.set(['a'], {a: 1, b: 2})
  set.set(['b'], {x: 3, y: 3})
  set.flush()
 
  t.deepEqual(model, [ {a: 1, b: 2},  {x: 3, y: 3} ])
  t.end()
})
