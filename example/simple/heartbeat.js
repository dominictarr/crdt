
module.exports = function (doc, id) {

  if(!id)
    id = 'item_' + Math.round(Math.random() * 10000)

  var me = doc.set(id, {create: ''+new Date()})
  //update a heartbeat every so often.
  setInterval(function () {
    me.set('heartbeat', ''+Date.now())
  }, 1e3)

  return me
}
