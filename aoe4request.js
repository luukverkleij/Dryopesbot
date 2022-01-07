const request = require('request');
const https = require('https');
const axios = require('axios').default;

const misc = require('./misc');
const stats = require('./aoe4stats');

const agent = new https.Agent({
    rejectUnauthorized: false
});

exports.err = (error) => {
  console.error(error.message);
}

exports.axiosget = async (callback, params) => {
   await axios.get("https://aoeiv.net/api/player/ratinghistory", 
             {httpsAgent: agent, 
              params: {game : "aoe4",
                      leaderboard_id : 17,
                       count : 10000,
                      profile_id : 8740810}
             }
  ).then(function (response) {
    console.log(response.status);
    console.log(response.statusText);
    console.log(response.headers);
    console.log(response.config);
  }).catch(exports.err);
}

// Called every time the bot connects to Twitch chat
exports.get = (params, callback) => {
   let agentOptions = {
      host: 'aoeiv.net'
    , port: '443'
    , path: '/'
    , rejectUnauthorized: false
  };

  let agent = new https.Agent(agentOptions);  
  let options = {json: true, agent : agent};  

  request("https://aoeiv.net/api/" + params, options, (error, res, body) => {
    if (error) {
        console.log(error);
    };

    if (!error && res.statusCode == 200) {
        if(callback) {
          callback(body);
        }
        else
          console.log("Callback not defined");
    };
  });
};

exports.leaderboard = async (id) => {
  return axios.get("https://aoeiv.net/api/leaderboard", 
             {httpsAgent: agent, 
              params: {game : "aoe4",
                      leaderboard_id : 17,
                      profile_id : id}
             }); 
};

exports.leaderboardByName = async (name) => {
  return axios.get("https://aoeiv.net/api/leaderboard", 
             {httpsAgent: agent, 
              params: {game : "aoe4",
                      leaderboard_id : 17,
                       count : 10000,
                      search : name}
             });
};

exports.leaderboardByNumber = async (number) => {
  return axios.get("https://aoeiv.net/api/leaderboard", 
             {httpsAgent: agent, 
              params: {game : "aoe4",
                      leaderboard_id : 17,
                      count : 1,
                      start : number}
             });
}

exports.ratingHistory= async (id)  => {
  return axios.get("https://aoeiv.net/api/player/ratinghistory", 
             {httpsAgent: agent, 
              params: {game : "aoe4",
                      leaderboard_id : 17,
                       count : 10000,
                      profile_id : id}
             });
};

exports.matchHistory = (id, callback)  => {
  return axios.get("https://aoeiv.net/api/player/matches", 
             {httpsAgent: agent, 
              params: {game : "aoe4",
                      leaderboard_id : 17,
                       count : 10000,
                      profile_id : id}
             });
};

exports.MatchRatingHistory= (id, callback)  => {
  exports.MatchHistory(id, (matches) => {
    exports.RatingHistory(id, (ratings) => {
      callback(stats.updateMatchesWon(matches), ratings);
    });
  });
};

exports.leaderboardToPlayer = (name, data) => {
  name = name.toLowerCase(name);
  
   if(data && Array.isArray(data.leaderboard) && data.leaderboard.length != 0) {
      let smallest = 0;
      for(let i = 1; i < data.leaderboard.length; i++) {
        if(misc.lDistance(data.leaderboard[smallest].name.toLowerCase(), name) 
           > misc.lDistance(data.leaderboard[i].name.toLowerCase(), name))
           smallest = i;
      }
      return data.leaderboard[smallest];
   }

    return undefined;
}

exports.playerByName = async (name, callback) => {  
  await exports.leaderboardByName(name)
  .then( (response) => {
    callback(exports.leaderboardToPlayer(name, response.data));
  })
  .catch(exports.err);
}

