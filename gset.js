module.exports = GSet

var EventEmitter = require('events').EventEmitter
var Obj = require('./obj')
var clone = require('./utils').clone

/*
  GSet -- grow only set.

  base class for other collection types.
*/

/*
  since I want the user to inject the factory function,
  this is too complicated.

  my brain is doing a strang thing.
  it's thinking it would be a good idea to implement a 
  little peer to peer relational db.

IDEAS -- use events instead.

If a relational database was peer to peer, what would that mean?


1. no incremental primary keys.
2. updates only. to delete, set a delete column to true.


one most important thing to achive, after actually having being p2p, is a easy way to attach to UI stuff.

on the one hand, the relational store seems like a natural fit. it just feels insane.

it's resql -- replicated sql.

there arn't any templating languages that support arbitary json, 
so maybe there should be a fairly structured data model.

new Set(id).init({
  users: crdt.Obj().on('change', function (key, value) {
    //register a event listeners for update here...
    //throw if the it does not update.
    //no, because might throw by accident.
    //veto callback? that allows async validation.

    //update the model...

    veto(false) //allow this change
    veto(true, reason)  //this was invalid
    // ... veto basicially means to change back to an old value.
    // also, to remove the change from histroy?
    // this is really a security feature...
    // will have to experiment .

    this example could be currently logged in users.
    if value, add new user.
    var userel = $(userList).find('.'+key)
    if !value, remove user from list...

  }).on('validate', function (change, obj) {
    // throw if not valid. -- this is better.
    say, allow username : boolean
    
  }),  
  //async validation is possible too. it would just be handled like a message that arrived late.
  messages: new Set().on('new', function (obj, veto) {
     //object has id. so don't need to pass key.
     obj
  }).on('validate', function (change, obj, usr_ctx) {
    merge change and obj.get()
    MUST have user: name, (which must be a valid user)
    and text: message.
    MAY NOT update a user context that does not own this username.
  })
  .set('0', {text: 'hello'})
})


*/

function defFactory (id) {

  var set = (Array.isArray(id) && id.length > 1)

  var obj = set ? new GSet(id = id[0]) : new Obj('' + id)
  this[id] = obj.get()

  return obj
}

function GSet(id, state, factory) {
  this.id = id
  this.state = state || {}
  this.objects = {}
  this.queue = []
  this._factory = factory || defFactory
}

GSet.prototype = new EventEmitter()

function getMember (self, key) {
  var f = self._factory
  var obj
  var path = key

  if(Array.isArray(path)) {
    key = path[0]
    if(!path.length)
      throw new Error('path erros')
  }

  if(!self.objects[key]) {

    function enqueue () {
      if(~self.queue.indexOf(obj)) return
      self.queue.push(obj)
      self.emit('queue')
    }

    obj = f.call(self.state, path)

    try {
      self.emit('new', obj, self)
    } catch (e) {
      console.error('validation:', e.message)
      //someone will have to throw away all the changes for this...
      return
    }

    obj = self.objects[key] = obj
    obj.on('queue', enqueue)
  }

  return self.objects[key]
}

GSet.prototype.set =
GSet.prototype.add = function (key, changes, val) {

  if('string' == typeof changes) {
    var _key = changes
    changes = {}
    changes[_key] = val
  }  
  
  if(Array.isArray(key) && key.length == 1)
    key = key[0]
 
  //error if cannot apply this set.

  if ('object' != typeof changes ) {
    throw new Error('cannot do that' +  JSON.stringify(changes))
  }

 //THIS is ugly. maybe just remove the abitily to call set(key, value)
  if(Array.isArray(key)) { 
    var set = getMember(this, key)
    key.shift()
    set.set.call(set, key, changes) 
  } else {
    var obj = getMember(this, key)
    obj && obj.set.call(obj, changes)
  }
  return this
}

GSet.prototype.update = function (update) {
  update = clone(update)
  var path = update[0]
  var obj = getMember(this, path)
  var key = path.shift()
  if(obj) { // if was not valid, this is null.
    obj.update(update)
    //update events behave different on Set to on Obj.
    //it updates when any member updates.
    this.emit('update', key, obj.get())
  }
}

/*
  this can probably be used as the flush implementation for any
  collection Obj
*/

GSet.prototype.flush = function (obj) {
  var id = this.id
  var updates = []
  var queue = this.queue
  if(!queue.length)
    return
  while(queue.length) {
    //note: an object MAY NOT be a member of more than one set.
    var obj = queue.shift()
    //if obj is a set, it will return an array of updates.
    //
    var flushed = obj instanceof GSet ? obj.flush() : [obj.flush()]

    this.emit('update', obj.id, obj.get())

    while(flushed.length) {
      var update = flushed.shift()
      update = clone(update)
      update[0].unshift(id)
      updates.push(update)
    }

  }
  
  this.emit('flush', updates)
  return updates
}

GSet.prototype.history = function () {
  var hist = []
  var objects = this.objects
  var id = this.id
  for(var k in objects)
    objects[k].history().forEach(function (e) {
      e = clone(e)
      e[0].unshift(id)
        
      hist.push(e)
    })
  return hist
}

GSet.prototype.toArray =
GSet.prototype.get = function (path) {
  if(!arguments.length)
    return this.state
  //if path is defined, pass to members...
}

GSet.prototype.init = function (schema) {
  var self = this
  for (var id in schema) {
    (function () {
      var obj = self.objects[id] = schema[id]
      self.state[id] = obj.get()
      obj.id = id
      obj.on('queue', 
        function () {
        if(~self.queue.indexOf(obj)) return
        self.queue.push(obj)
        self.emit('queue')
      })
    })()
  }
  return this
}
