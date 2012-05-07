var GSet = require('./gset')

/*
  set with deletable items.

  simplest way is just to hook onto the events.
*/

module.exports = Set

function Set (id) {
  GSet.call(this, id)
  var state = this.state
  var self = this
  this.on('update', function (key, obj) {
    if(obj.__delete && state[key])
      delete state[key]
    else if(!obj.__delete && !state[key]
      state[key] = obj
    this.emit('remove', key, obj)
  })
}

Set.prototype.remove = function (key) {
  if(this.objects[key])
    this.set(key, {__delete: true})
  return this
}

