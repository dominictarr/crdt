

var crdt = require('..')
var a = require('assertions')
var test = require('tap').test

test('simple', function (t) {
 // var t = a
  var s = new crdt.GSet('top')
  s.set(['inner', 'object'], {key: 'value'})
  s.set(['inner2', 'object2'], {key2: 'value2'})
/**/
  t.throws(function () {
    s.set(['inner'], {whatever: 'this should break'})
  })
  t.throws(function () {
    s.set(['inner'], 'whatever', 'this should break')
    console.log(s.get())
  })//*/
  
//  var updates = s.flush()

//  console.log(JSON.stringify(updates))

  /*a.has(updates,
  [ [ ['top', 'inner', 'object'], {key: 'value'}, a.isNumber]
  , [ ['top', 'inner2', 'object2'], {key2: 'value2'}, a.isNumber]
  ])*/ 

  console.log(s.get())

  t.deepEqual(s.get(),
    { inner  : { object   : {key  : 'value'   } }
    , inner2 : { object2  : {key2 : 'value2'  } } 
    } )

//  t.end()
//})

  s.update([
    ['inner', 'object'], {x: 1}, Date.now() + 1, 4
  ])

   t.deepEqual(s.get(),
    { inner  : { object   : {key  : 'value', x: 1   } }
    , inner2 : { object2  : {key2 : 'value2'  } } 
    } )

  t.end()
})
