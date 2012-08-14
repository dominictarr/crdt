//row
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
'use strict';

var inherits     = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = Row

inherits(Row, EventEmitter)

function Row (id) {
  this.id = id
  this.state = {id: id}
}

Row.prototype.set = function (changes, v) {
  if(arguments.length == 2) {
    var k = changes 
    changes = {}
    changes[k] = v
  }

  if(changes.id && changes.id !== this.state.id)
    throw new Error('id cannot be changed')

  this._set(changes, 'local')  
  return this
}

Row.prototype.validate = function (changes) {
  try {
    this.emit('validate', changes)
    return true
  } catch (e) {
    console.error('validation', e.message)
    return false
  } 
}

Row.prototype._set = function (changes, source) {

  //the change is applied by the Doc!
  this.emit('preupdate', changes, source)
  return this
}

Row.prototype.get = function (key) {
  if(key)
    return this.state[key]
  return this.state
}

Row.prototype.toJSON = function () {
  return this.state
}

