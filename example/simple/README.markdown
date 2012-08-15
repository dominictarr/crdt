# simple

This is a very simple example of using crdt.
basically, each node creates a `Row` and then 
updates a property in it every second.

(I say "node" because crdt provides an API that
is the same for both the client _and_ the server)

notice that `heartbeat.js` is used by _both_ the 
client and the server. The server is just another node,
with the unfortunate duty of relaying all messages from
the clients, because the clients have been cruely banned
form sending messages directly to each other!

