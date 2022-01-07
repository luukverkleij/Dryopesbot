exports.civs = [
              "Abbasid", //correct
             "Chinese", //correct
             "Delhi",  //correct
             "English",
             "French", //correct
             "HRE", //correct
             "Mongols", //correct
             "Rus" //correct
            ];

exports.maps = [
  "Dry Arabia", //correct
  "Lipany", //correct
  "High View", //correct
  "Mountain Pass", //correct
  "Ancient Spires", //correct
  "Danube River", //correct
  "Black Forest", //correct
  "Mongolian Heights",
  "Altai", //correct
  "Confluence", //correct
  "French Pass", //correct
  "Hill and Dale", //correct
  "King of the Hill", //correct
  "Warring Islands",
  "Archipelago", //correct
  "Nagari", //correct
  "Boulder Bay" //correct
];

exports.toCiv = (civId) => {
  if(civId in exports.civs )
    return exports.civs[civId];
  return civId;
};

exports.toMap = (mapId) => {
  if(mapId in exports.maps)
    return exports.maps[mapId];
  return mapId;
}

exports.updateMatchesWon = (matches, ratings, id) => {
  for(var m = 0; m < matches.length; m++) {
    for(var r = 0; r < ratings.length; r++) {
      if(ratings[r].timestamp < matches[m].started) {
        if(r === 0 ) break;
        matches[m].players[0].won = (ratings[r - 1].num_wins - ratings[r].num_wins > 0 && matches[m].players[0].profile_id === id) ||
          (ratings[r - 1].num_losses - ratings[r].num_losses > 0 && matches[m].players[0].profile_id !== id);
        matches[m].players[1].won = !matches[m].players[0].won;
        
        break;
      }
    }
  }
  return matches;
};

exports.filterMatchesCiv = (matches, civ, id) => {
  return matches.filter(match => (match.players[0].profile_id === id && match.players[0].civ === civ)
                        || (match.players[1].profile_id === id && match.players[1].civ === civ));
}

exports.filterMatchesWon = (matches, id) => {
  return matches.filter(match => (match.players[0].profile_id === id && match.players[0].won === true)
                       || (match.players[1].profile_id === id && match.players[0].won === true));
}

exports.filterMatchesLost = (matches, id) => {
  return matches.filter(match => match.players[0].profile_id === id && match.players[0].won === false
                       || match.players[1].profile_id === id && match.players[0].won === false);
}

exports.civStats = (matches, id) => {
  var result = Array(exports.civs.length).fill([0, 0]);
  
  for(var m = 0; m < matches.length; m++) {
    const p = matches[m].players[0].profile_id === id ? 0 : 1;
    const civ = matches[m].players[p].civ;
     result[civ] = [result[civ][0] + matches[m].players[p].won, result[civ][1] + !matches[m].players[p].won];
  }
  
  return result;
}

exports.mapStats = (matches, id) => {
  var result = Array(exports.maps.length).fill([0, 0]);
  
  for(var m = 0; m < matches.length; m++) {
    const p = matches[m].players[0].profile_id === id ? 0 : 1;
    const map = matches[m].map_type;
    result[map] = [result[map][0] + matches[m].players[p].won, result[map][1] + !matches[m].players[p].won];
  }
  return result;
}
