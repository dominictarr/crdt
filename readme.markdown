#CRDT - Commutative Replicated Data Types

a CRDT is a data type designed so that opperations on it commute - give the same result
indepent of the order in which they are applied.

CRDTs give you eventual consistency for free. it is not necessary to track concurrent changes
and use complicated merge algorithms. this module is useful for collaborative/distributed/peer2peer (same things)
applications.


## peer to peer nodes.

Think of each instance as a node. A node must do two things, 
1) persist and read it's own state. 2) communicate changes in it's state to other nodes.

for both of these functions a stream api is used.

I wrote [kv](http://github.com/dominictarr/kv) for this purpose, but any JSON stream will do.

begin by syncing the state:
``` js
  var doc = new crdt.Doc()

  kv.get(name)
    .pipe(doc.createReadStream())  

```

then pipe `doc.createStream()` to a remote node.

``` js
  var s = doc.createStream()
  stream.pipe(s).pipe(stream)
  
  stream.on('error', function () {
    s.destroy()
  })
```

Don't forget to listen for unexpected disconnects. Expect the unexpected.

