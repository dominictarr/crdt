#CRDT - Commutative Replicated Data Types

a CRDT is a data type designed so that opperations on it commute - give the same result
indepent of the order in which they are applied.

CRDTs give you eventual consistency for free. it is not necessary to track concurrent changes
and use complicated merge algorithms. this module is useful for collaborative/distributed/peer2peer (same things)
applications.



