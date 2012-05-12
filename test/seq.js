var crdt = require('..')
var a = require('assertions')
var Seq = require('../seq')

var doc = new crdt.Doc()
var seq = new Seq(doc, 'type', 'thing')

var A = seq.push({id: 'a', type: 'thing', what: 3})

var B = seq.push({id: 'b', type: 'thing', what: 4})

var C = seq.unshift({id: 'c', type: 'thing', what: 2})

console.log(seq.toJSON())

a.equal(seq.first(), C)
a.equal(seq.last(),  B)
a.equal(seq.indexOf(A), 1)

seq.rm({id: 'c'})


console.log(seq.toJSON())
