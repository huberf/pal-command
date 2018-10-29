
module.exports.postGroupRemove = (userId, groupName, groups) => {
  return groups[groupName].posters.filter(function(value, index, arr) {
    if (value == userId) {
      return false;
    } else {
      return true;
    }
  });
}

module.exports.listenGroupRemove = (userId, groupName, groups) => {
  return groups[groupName].listeners.filter(function(value, index, arr) {
    if (value == userId) {
      return false;
    } else {
      return true;
    }
  });
}
