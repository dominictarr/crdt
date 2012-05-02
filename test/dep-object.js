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

  var obj = new crdt.Obj('key', model, function (key, val) {
    this.set(key,val)
  })

  obj.set({a: 1, b: 2})
  obj.flush()

  t.equal(model.get('a'), 1)
  t.equal(model.get('b'), 2)

  t.end()

})

test('dependant set', function (t) {
  var model = []

  var set = new crdt.GSet('set', model, function (key) {
    var obj = new crdt.Obj(key)
    model.push(obj.get())
    //now you may wish to setup event listeners
    //to update the model...
    return obj
  })

  set.set(['a'], {a: 1, b: 2})
  set.set(['b'], {x: 3, y: 3})
  set.flush()

  console.log(set.get())
  
  t.deepEqual([ {a: 1, b: 2},  {x: 3, y: 3} ], set.get())
  t.end()
})
