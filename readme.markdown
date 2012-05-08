#CRDT - Commutative Replicated Data Types

a CRDT is a data type designed so that opperations on it commute - give the same result
indepent of the order in which they are applied.

CRDTs give you eventual consistancy for free.

## basic

A normal `{key: value, ...}` javascript object. Updates have a sequence number and may 
update the values for multiple keys.


``` js

 ['up', path, timestamp, {key: value}]
//update object at `path` at `timestamp`
```

Applying each update MUST be idempotent. 
If an update arrives out of order, 
updates to this path with later timestamps can be reapplied, 
to give the correct current value.

### example

```
['up', 'crdt:example', 0,  {type: 'example', foo: 'bar'}]
['up', 'crdt:example', 1, {qux: 'tun'}]
['up', 'crdt:example', 2, {qux: 'blerg', foo: null}]
```

At each update the properties in the update are merged with the properties at `path`.
applying these updates in order gives the result:

``` js
{ type: 'example',
, foo: null,
, qux: 'blerg' }
``` 

note that the information from update 1 is completely overwritten by update 2.
if update 1 arrives at a given node after time 2, it is necessary to check that
`qux` already has a value from a later timestamp (2) and so need not be applied.

since updates are idempotent, that is equivalent to reapplying all updates to the given path.
however, it has the benefit that updates that are totally superceded may be discarded.

## sets

Sets can be implemented by tracking every object at a sub-path.
items can be deleted by adding a property `__destroy: true` or similar.

Sets are suitable when the order of data is not very important. For example,
in a chat room, it is sufficant to order each item as they arrive, or in their timestamp order.

## sequences

sometimes the order of a sequence is important, or needs to be changed this can be acomplished by
sorting members by a certain property. then if you need to move a member, or insert a new member
give it a sort value between two adjacent keys.

### example

``` js
['up', 'crdt:seq1:X', 0, {value: 'A', seq: 'B'}]   // insert at B
['up', 'crdt:seq1:Y', 1, {value: 'X', seq: 'A'}]   // insert ahead of crdt:seq1:X
['up', 'crdt:seq1:Z', 2, {value: 'B', seq: 'AL'}]  // insert between crdt:seq1:X, and crdt:seq1:Y
```
here X, and Y are inserted with near by `seq` values. however, it is always possible to create
another string that is ordered between any two given strings so it is always possible to move or insert
items.

## validation.

validation is very simple to apply 

## TODO

okay, got a simple example up... it's just a chat room, which doesn't depend on the strengths of CRDTs.
... so plan is to make a playlist editor...

  * sequence type, with delete.
  * multiple sets... so that can put current users in a separate set...
  * couple to knockout or backbone... need inplace editing. so you can have editable chat
  * garbage collect insignificant updates.
