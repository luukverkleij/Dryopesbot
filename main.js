const tmi = require('tmi.js');
const request = require('request');
const https = require('https');
const axios = require('axios');
const fs = require('fs');

const get = require('./aoe4requests');
const stats = require('./aoe4stats');
const db = require('./cmds-debug');

const cmd = require('./commands.js');



// Define configuration options
const opts = {
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: JSON.parse(fs.readFileSync(".data/channels"))
};

// Create a client with our options
const client = new tmi.client(opts);

var lookup_names = JSON.parse(fs.readFileSync(".data/names"));

function lookup(name) {
  if(lookup_names[name])
    return lookup_names[name]
  
  return name;
}

console.log(opts.channels);
console.log(lookup_names);

const pool = new cmd.commandspool();
pool.add("!aoe4rank", "public", true, PrintRank, "Gives the rank, rating and winrate of the player.");
pool.add("!aoe4daily", "public", true, PrintDaily, "Shows the score for the lasts 8 hours.");
pool.add("!aoe4player", "public", true, PrintPlayer, "Gives a player and some relevant stats.");
pool.add("!aoe4vs", "public", true, PrintVS, "Gives the score between the two players given.");
pool.add(["!aoe4current", "!aoe4match"], "public", true, PrintCurrent, "Gives the current match the given player is in.");
pool.add("!aoe4civs", "public", true, PrintCivs, "Gives the winrate for all civilizations.");
pool.add("!aoe4name", "mods", false, cmdName, "Sets the ingame name of the streamer (mods/broadcaster only)");
pool.add("!aoe4dbmatches", "debug", true, db.printMatchesRetrieved, "(DEBUG) Prints matches retrieved vs matches played.");
pool.add("!aoe4dbnames", "debug", true, ((a, b) => db.printMap(a, b, lookup_names)), "(DEBUG) Prints the current lookup_names");
pool.add(["!aoe4cmds", "!aoe4help"], "mods", true, PrintHelp, "Tells where the commands can be found");

//pool.add("!addme", "self", false, cmdAdd, "Adds this bot to your channel");
//pool.add("!removeme", "self", false, cmdRemove, "Removes this bot from your channel");

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  
  pool.execute(client, target, context, msg);
  
  console.log("received " + msg + " by " + context.username + " on channel " + target);
}

async function PrintRank(client, target, name) {
  if(!name) name = lookup_names[target];
  
  get.playerByName(name, (player) => {
    if(player) {
         client.say(target, player.name + " is #" + player.rank + " (Rating " + player.rating 
                    + ")  with a winrate of " + (player.wins / player.games * 100).toFixed(1) 
                    + "% ("+ player.wins + "-" + player.losses + ")");
    }
    else { 
      PrintPlayerNotFound(client, target, name);
    }
  });
}

async function PrintPlayer(client, target, name) {
  if(!name) name = lookup_names[target];
  
    get.playerByName(name, (player) => {
    if(player) {
      axios.all([
        get.ratingHistory(player.profile_id),
        get.matchHistory(player.profile_id)
      ])
        .then( ([r1, r2]) => {
          const ratings = r1.data;        
          const matches = stats.updateMatchesWon(r2.data, ratings, player.profile_id);
        
          const civs = stats.civStats(matches, player.profile_id);
          const maps = stats.mapStats(matches, player.profile_id);
        
          const civs2 = civs.map(x => x[0] === 0 ? 0 : (x[0] / (x[0] + x[1]) * 100).toFixed());
          const maps2 = maps.map(x => x[0] === 0 ? 0 : (x[0] / (x[0] + x[1]) * 100).toFixed());
          
          const maxIcivs = civs2.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
          const maxImaps = maps2.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
        
          client.say(target, player.name + " is #" + player.rank + " (Rating " + player.rating + ")  with a winrate of " 
                     + (player.wins / player.games * 100).toFixed() + "% ("+ player.wins + "-" + player.losses + ") and best civ "
                    + stats.civs[maxIcivs] + " (" + civs2[maxIcivs] + "%) and best map " 
                     + stats.maps[maxImaps] + " (" + maps2[maxImaps] + "%)");
        }).catch(get.err);
    }
    else { 
      PrintPlayerNotFound(client, target, name);
    }
  });
}

async function PrintCivs(client, target, name) {
  if(!name) name = lookup_names[target];
  
    get.playerByName(name, (player) => {
    if(player) {
      axios.all([
        get.ratingHistory(player.profile_id),
        get.matchHistory(player.profile_id)
      ])
        .then( ([r1, r2]) => {
          const ratings = r1.data;        
          const matches = stats.updateMatchesWon(r2.data, ratings, player.profile_id);

          const civs = stats.civStats(matches, player.profile_id);

          var msg = player.name + " has winrates ";
          for(var i = 0; i < civs.length-1; i++) {
            var winrate = (civs[i][0]/(civs[i][0] + civs[i][1])*100).toFixed();
            msg = msg + stats.civs[i] + " " + (isNaN(winrate) ? 0 : winrate) + "%, ";
          } 
          var winrate = (civs[i][0]/(civs[i][0] + civs[i][1])*100).toFixed();
          msg = msg + stats.civs[i] + " " + (isNaN(winrate) ? 0 : winrate) + "%";

          client.say(target, msg);
        }).catch(get.err);
    }
    else { 
      PrintPlayerNotFound(client, target, name);
    }
  });
}


async function PrintDaily(client, target, name) {
  if(!name) name = lookup_names[target];
  
  get.playerByName(name, (playerinfo) => {
    if(playerinfo) {
      get.ratingHistory(playerinfo.profile_id)
        .then( (response) => { const data = response.data;
          var lastindex = 0;
          while(lastindex < data.length && Math.round(Date.now() / 1000) - data[lastindex].timestamp < 43200) lastindex++;
          var wins = data[0].num_wins - data[lastindex].num_wins;
          var losses = data[0].num_losses - data[lastindex].num_losses;
          client.say(target, playerinfo.name + " (#" + playerinfo.rank + ") record today is " + wins + "-" + losses + " today, starting at rating " 
                     + data[lastindex].rating + " and is now " + playerinfo.rating);
      })
      .catch(get.err);
    } else {
      PrintPlayerNotFound(client, target, name);
    }
  });
}


async function PrintVS(client, target, name1, name2) {
  if(!name2) name = lookup_names[target];
  
  axios.all([
    get.leaderboardByName(name1),
    get.leaderboardByName(name2)
  ])
    .then( ([r1, r2]) => {
     
      const p1 = get.leaderboardToPlayer(name1, r1.data);
      const p2 = get.leaderboardToPlayer(name2, r2.data);

      if(p1 && p2) {
      axios.all([
        get.ratingHistory(p1.profile_id),
        get.matchHistory(p1.profile_id)
      ])
        .then( ([r3, r4]) => {
          const ratings = r3.data;
          var matches = r4.data;


          let vsmatches = matches.filter(match => 
                                     (match.players[0].profile_id === p1.profile_id && match.players[1].profile_id === p2.profile_id)
                                     || (match.players[1].profile_id === p1.profile_id && match.players[0].profile_id === p2.profile_id)
                                     )
          let vsratings = [0, 0];
          for(let m = 0; m < vsmatches.length; m++) {
            for(let r = 0; r < ratings.length; r++) {
              if(ratings[r].timestamp < vsmatches[m].started) {
                if(r === 0) break;
                vsratings[0] += ratings[r - 1].num_wins - ratings[r].num_wins;
                vsratings[1] += ratings[r - 1].num_losses - ratings[r].num_losses;
                break;
              }
            }
          }
          if(vsratings[0] + vsratings[1] === 0)
            client.say(target, p1.name + " (#" + p1.rank + ") has not yet played against " + p2.name + " (#" + p2.rank + ")");
          else
            client.say(target, p1.name + " (#" + p1.rank + ") vs " + p2.name + " (#" + p2.rank + "): " + vsratings[0] + " - " + vsratings[1]);
        }).catch(get.err);

      } else if(p2){
        PrintPlayerNotFound(client, target, name1);
      } else {
        PrintPlayerNotFound(client, target, name2);
      }
  }).catch(get.err);
}

async function PrintCurrent(client, target, name) {
  if(!name) name = lookup_names[target];
  
  get.playerByName(name, (player) => {
    if(player) {
      axios.all([
        get.ratingHistory(player.profile_id),
        get.matchHistory(player.profile_id)
      ]).then(([r1, r2]) => { var ratings = r1.data; var matches = r2.data;
     
          if(ratings[0].timestamp < matches[0].started) {     
            const mp1 = matches[0].players[0].profile_id === player.profile_id ? matches[0].players[0] : matches[0].players[1];
            const mp2 = matches[0].players[0].profile_id !== player.profile_id ? matches[0].players[0] : matches[0].players[1];
            
            var map = matches[0].map_type;
            
            matches = stats.updateMatchesWon(matches, ratings, mp1.profile_id);
            var matchescivs = stats.civStats(matches, mp1.profile_id);
            var matchesmaps = stats.mapStats(matches, mp1.profile_id);
            var civwinrate = (matchescivs[mp1.civ][0] / (matchescivs[mp1.civ][0] + matchescivs[mp1.civ][1]) * 100).toFixed();
            var mapwinrate = (matchesmaps[map][0] / (matchesmaps[map][0] + matchesmaps[map][1]) * 100).toFixed(); 
            
            axios.all([
              get.leaderboard(mp2.profile_id),
              get.ratingHistory(mp2.profile_id),
              get.matchHistory(mp2.profile_id),
            ])
              .then( ([r1, r2, r3]) => {
                if(r1.data) {
                  const player2 = r1.data["leaderboard"][0]; var ratings2 = r2.data; var matches2 = r3.data;
                
                  matches2 = stats.updateMatchesWon(matches2, ratings2, mp2.profile_id);
                  var matches2civs = stats.civStats(matches2, mp2.profile_id);
                  var matches2maps = stats.mapStats(matches2, mp2.profile_id);
                  var civwinrate2 = (matches2civs[mp2.civ][0] / (matches2civs[mp2.civ][0] + matches2civs[mp2.civ][1]) * 100).toFixed(); 
                  var mapwinrate2 = (matches2maps[map][0] / (matches2maps[map][0] + matches2maps[map][1]) * 100).toFixed(); 
                  
                  client.say(target, player.name + " (#" + player.rank + ") as " + stats.civs[mp1.civ] + " (WR " + civwinrate + "%)"
                             + " vs " + player2.name + " (#" + player2.rank + ") as " + stats.civs[mp2.civ]
                             + " (WR " + civwinrate2 + "%) on the map " + stats.toMap(matches[0].map_type) 
                    + " (WR " + mapwinrate + "% - " + mapwinrate2 + "%)");

              } else {
                client.say(target, player.name + " (#" + player.rank + ") is currently playing against someone not in the leaderboards");
              }
              })
            .catch(get.err);
          } else {
            client.say(target, player.name + " is currently not in game");
          }
        })
      .catch(get.err);
    } else {
      PrintPlayerNotFound(client, target, name);
    }
  });
}

async function PrintPlayerNotFound(client, target, name) {
  client.say(target, name + " could not be found in the leadersboards");
}

async function PrintHelp(client, target) {
 client.say(target, "Commands can be found on my profile page"); 
}

async function cmdName(client, target, name) {
  lookup_names[target] = name;
  fs.writeFileSync(".data/names", JSON.stringify(lookup_names));
  client.say(target, target.substring(1) + " ingame name set to " + name);
}

async function cmdAddMe(client, target) {
  
}

async function cmdRemoveMe(client, target) {
  
}
