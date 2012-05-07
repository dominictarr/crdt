/*
  Seq - a Set with significant order.
*/

var Seq  = require('../seq')
var test = require('tap').test
var a    = require('assertions')

/*
  hmm, I need to do a flush after each change to get the 
  push to work correctly.
  maybe I should ditch all the queue stuff and make each change
  apply immediately?

  that would probably simplify quite a lot.

*/

test('simple', function (t) {
  var s = new Seq()
  s.push({A: 1})
  s.flush()
  s.push({A: 2})
  s.flush()
  s.push({A: 3})
  s.flush()

  console.log(s.get())

  a.has(s.get(),
    [ {A: 1}
    , {A: 2}
    , {A: 3} ] 
  )

  t.end()
})

test('simple 2', function (t) {
  var s = new Seq()
  s.push({A: 2})
  s.flush()
  s.push({A: 3})
  s.flush()
  s.unshift({A: 1})
  s.flush()

  console.log(s.get())

  a.has (
    s.get(),
    [ {A: 1}
    , {A: 2}
    , {A: 3} ] 
  )

  t.end()
})
