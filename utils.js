exports.clone = 
function (ary) {
  return ary.map(function (e) {
    return Array.isArray(e) ? exports.clone(e) : e
  })
}


