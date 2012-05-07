var test = require('tap').test
var crdt = require('..')


test('GSet', function (t) {

  var s = new crdt.Set()

  s.update([['key'], {initial: true}, 0, 1])

  var ary = s.get()

  t.deepEqual(
    ary,
    {key: {initial: true}}
  )
  t.end()
})

test('GSet - 2', function (t) {

  var s = new crdt.GSet()

  s.update([['A'], {initial: true} , 0, 1])
  s.update([['B'], {initial: false}, 0, 2])
  s.update([['C'], {initial: 6}    , 0, 3])

  s.update([['C'], {initial: 3} , 2, 5])
  s.update([['B'], {initial: 6}], 1, 4)

  var ary = s.get()

  t.deepEqual(
    ary,
    { A: {initial: true}
    , B: {initial: 6}
    , C: {initial: 3} }
  )
  t.end()

})

test('validate', function (t) {
  //test a set - deleteable members.
  //pull this into it's own thing. this will be useful.
  var array = []

  function sort () { 
    return array.sort(function (a, b) {
      return a.thing - b.thing
    })
  }

  var dset = 
  new crdt.GSet('set')
    .on('new', function (obj) {
      //a new object is added to the set.
      array.push(obj.get())
    })
    .on('update', function (key, obj) {
      console.log('!!!!!!!!!!!!!!!!',key, obj)
      var i
      if(obj.__delete && ~(i = array.indexOf(obj)))
        array.splice(i, 1)
      else if(!obj.__delete && !~(i = array.indexOf(obj)))
        array.push(obj) 
    })

  dset.set(['a'], {thing: 1})
  dset.set(['b'], {thing: 2})

  t.deepEqual(sort(), [{thing: 1}, {thing:2}])
  
  dset.set(['b'], {__delete: true})

  t.deepEqual(sort(), [{thing: 1}])

  t.end() 
})
