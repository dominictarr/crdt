
module.exports = function (doc, id) {

  if(!id)
    id = 'Client-' + Math.round(Math.random() * 10000)

  var me = doc.set(id, {create: new Date().toUTCString()})
  //update a heartbeat every so often.
  setInterval(function () {
    me.set({
      heartbeat: ''+Date.now(),
      random: Math.round(Math.random()*10)
    })

  }, 1e3)

  return me
}
