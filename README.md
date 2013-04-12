#CRDT - Commutative Replicated Data Types

a CRDT is a data type designed so that operations on it commute - give the same result
indepent of the order in which they are applied.

CRDTs give you eventual consistency for free. it is not necessary to track concurrent changes
and use complicated merge algorithms. this module is useful for collaborative/distributed/peer2peer (same things)
applications.

Further Reading: [A comprehensive study of
Convergent and Commutative Replicated Data Types
](http://hal.upmc.fr/docs/00/55/55/88/PDF/techreport.pdf)


## replicating documents

create two documents,

``` js
var Doc = require('crdt').Doc
var A = new Doc()
var B = new Doc()
```

then pipe them together

``` js
var as
(as = A.createStream())
  .pipe(B.createStream())
  .pipe(as)
```

We just replicated two documents with in the same process...
this is the idea, but of course, we want to do it on different machines...

notice the pattern is basically the same...

the client side ...

``` js
var net = require('net')
var es  = require('es')
var Doc = require('crdt').Doc

var A = new Doc()

var stream
(stream = net.connect())
  .pipe(A.createStream())
  .pipe(stream)
```

and the server ...

``` js
var net = require('net')
var es  = require('es')
var Doc = require('crdt').Doc

var A = new Doc()

net.createServer(function (stream) {
  stream
    .pipe(A.createStream())
    .pipe(stream)
})
```

## Doc

### Doc#add(obj = {id: ID, ...})

Add a `Row` to the document initialized to `obj`.
If `obj` doesn't have a unique `id` property, a random key will be created.

Return the `Row` object.

### Doc#rm(id)

Remove a `Row` from the document by `id`
Also removes from all sets as well.


### Doc#createSet (key, value)

Create a `Set` a set is a collection of rows defined by a particular
value on a particular property.

``` js

var cheeses = doc.createSet('type', 'cheese')

```

`key` and `value` must both be strings.

### Doc#createSet (filter)

You can also create a `Set` using a filter function.

```js
var cheeses = doc.createSet(function (state) {
    return state.type === 'cheese'
})
```

A filter function should just be a more expressive filter and
shouldn't be a stateful function

### Doc#createSeq (key, value)

same as `Doc#createSet` except that seqs have a significant order.

sequences can also be created with a filter using `Doc#createSeq(filter)`

### Doc#createStream (opts)

create a stream that is used to connect to another Doc instance.

### event: doc.emit('create', row)

Emitted when a new `Row` is created

### event: doc.emit('row_update', row)

Emitted when a new `Row` is updated

## Row

an object with in a crdt `Doc`

### Row#set(key, value)

set `key` to `value`. if `Row#set(obj)` is called instead
all the keys in obj will update atomically.

This causes a 'change' event to be emitted, and an update message
to be sent down the stream. (note, if the stream in not yet connected,
that is okay, current state of the document is replicated as soon as the
streams are connected.)

### Row#get(key)

get the current value for a key.

### Row#toJSON()

return a raw object ready for serialization.
this is not a JSON string yet, misleading name,
but that is the correct JSON.stringify api.

### event: Row.emit('change', changed)

Emitted when a row is changed. this may be the result of a local or a
remote update.

changed is the a hash of the fields that have changed.

## Set

A collection of `Rows` within a document.

### Set#asArray()

get the contents of this set as a regular js `Array`

### Set#toJSON()

calls `toJSON` on the each `Row` in the set and puts it in an array.

### Set#has(row|id)

check if a row|id is a member of the set.

### Set#get(id)

get an item in this set, if it exists.

### Set#each(iter), Set#forEach(iter)

Iterate over the `Rows` in the set.

### Set#onEach(iter)

Iterate over the `Rows` in the set and any new row that may be
added to the set in the future.

### Set#remove(row)

removes a row from the set. sets the set's `key`, to null.
note, if you have multiple sets with the same key, they are mutually exclusive,
and adding a node to a different set will remove it from the first one.

### event: Set.emit('add', Row)

Emitted when a row is added to the set.

### event: Set.emit('changes', Row, changed)

Emitted when a row in the set changed. The changed value contains a hash
of the key / values that changed.

### event: Set.emit('remove', Row)

Emitted when a row is removed from the set

## Seq

just like a Set, but the items are ordered.
they will begiven a `_sort` property.

### Seq#first()

get the first item in the seq.

### Seq#last()

get the last item in the seq.

### Seq#has(row|id)

check if a row|id is a member of the seq. (inherited from `Set`)

### Seq#indexOf(id | row)

find the index of the given row or id.

### Seq#at(index)

get the item currently at `index`

### Seq#unshift(row)

push a `Row` onto the start of the `Seq`

### Seq#push(row)

push a `Row` onto the end of the `Seq`

### Seq#length()

get the number of items currently in the `Seq`.

### Seq#pop()

remove the last item.

### Seq#shift()

remove the first item.

### Seq#before(item, id | row)

insert `item` before the given `row/id`.

### Seq#after(item, id | row)

insert `item` after the given `row/id`.

### Seq#next(key)

Finds the item that is after this key

### Seq#prev(key)

Finds the item that is before this key

### event: Seq.emit('move', Row)

Emitted when the row has changed it's position in the sequence
