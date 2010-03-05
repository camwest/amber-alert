HOST = null; // localhost
PORT = 8080;

var fu = require ('./lib/fu');
var qs = require("querystring");
var url = require("url");
var sys = require("sys");

var SESSION_TIMEOUT = 60 * 1000;

// APPLICATION FUNCTIONS

var sessionManager = new function() {
  var callbacks = [];
  
  this.createSession = function(username, subdomain) {
    var session = {
      username: username,
      id: Math.floor(Math.random()*99999999999).toString(),
      timestamp: new Date(),
      created_at: (new Date()).getTime(),
      poke: function() {
        session.timestamp = new Date();
      },

      destroy: function() {
        sessionManager.removeUser(this.id);
        delete sessions[session.id];
      },

      toPublic: function() {
        return { id: this.id, username: this.username, created_at: this.created_at };
      }
    };

    sessions[session.id] = session;
    
    //notify all the listening clients
    while (callbacks.length > 0) {
      callbacks.shift().callback({ userAdded: session });
    }
    
    return session;
  };
  
  this.getUsers = function(user, since, callback) {
    //get a list of users that has been created at since since    
    var matching = [];
    
    for (var i in sessions) {
      var session = sessions[i];
      if (session.created_at > since && session.id != user.id)
        matching.push( session.toPublic() );
    }
    
    if (matching.length != 0) {
      callback({ currentUsers: matching });
    } else {
      callbacks.push({ timestamp: new Date(), callback: callback });
    }
  };
  
  this.removeUser = function(userId) {
    while (callbacks.length > 0) {
      callbacks.shift().callback({ userRemoved: userId });
    }
  };
  
  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback({}); //zero users
    }
  }, 1000);
  
  // clear out old sessions
  setInterval(function () {
    var now = new Date();
    for (var id in sessions) {
      if (!sessions.hasOwnProperty(id)) continue;
      var session = sessions[id];

      if (now - session.timestamp > SESSION_TIMEOUT) {
        session.destroy();
      }
    }
  }, 1000);
  
  
};

var sessions = {};


// ROUTES CONFIGURATION
fu.listen(PORT, HOST);

fu.get("/", fu.staticHandler("public/index.html"));
fu.get("/javascripts/client.js", fu.staticHandler("public/javascripts/client.js"));
fu.get("/javascripts/jquery-1.4.2.min.js", fu.staticHandler("public/javascripts/jquery-1.4.2.min.js"));

fu.get("/login", function(req, res) {
  var params = qs.parse(url.parse(req.url).query);

  var session = sessionManager.createSession(params.username, params.subdomain);
  
  res.simpleJSON(200, { id: session.id, username: session.username });
});

fu.get("/logout", function(req, res) {
  var id = qs.parse(url.parse(req.url).query).id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.destroy();
  }
  res.simpleJSON(200, { });
});

fu.get("/data", function(req, res) {
  var params = qs.parse(url.parse(req.url).query);
  
  if (!params.id || params.id == "null") {
    res.simpleJSON(400, { error: "Must be logged in"});
  }
  
  if (!params.since) {
    res.simpleJSON(400, { error: "Must specify the since parameter"});
  }
  
  var session;
  
  if (sessions[params.id]) {
    session = sessions[params.id];
    session.poke();
  }
  
  sessionManager.getUsers(session, params.since, function(data) {
    if (session) session.poke();
    res.simpleJSON(200, data);
  });
});