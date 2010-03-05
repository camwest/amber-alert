HOST = null; // localhost
PORT = 8080;

var fu = require ('./lib/fu');
var qs = require("querystring");
var url = require("url");
var sys = require("sys");

var SESSION_TIMEOUT = 60 * 1000;

// APPLICATION FUNCTIONS

var sessionManager = new function() {
  var callbacksBySubdomain = {};
  var subdomains = {};
  
  this.createSession = function(username, subdomain) {
    
    // if the subdomain doesn't exist create it
    if (!subdomains.hasOwnProperty(subdomain)) {
      subdomains[subdomain] = {};
    } 

    var subdomainSessions = subdomains[subdomain];
    
    var session = {
      username: username,
      id: Math.floor(Math.random()*99999999999).toString(),
      timestamp: new Date(),
      created_at: (new Date()).getTime(),
      poke: function() {
        session.timestamp = new Date();
      },

      destroy: function() {
        sessionManager.removeUser(this.id, subdomain);
        delete subdomainSessions[session.id];
        delete sessions[session.id];
      },

      toPublic: function() {
        return { id: this.id, username: this.username, created_at: this.created_at };
      }
    };

    //store into the global session object
    sessions[session.id] = session;
    
    //store in the subdomain sessions array
    subdomainSessions[session.id] = session;
    
    //if the callbackSubdomain doesn't exist, create it
    if (!callbacksBySubdomain.hasOwnProperty(subdomain)) {
      callbacksBySubdomain[subdomain] = [];
    } 
    
    var callbackSubdomain = callbacksBySubdomain[subdomain];      

    //notify all the listening clients
    while (callbackSubdomain.length > 0) {
      callbackSubdomain.shift().callback({ userAdded: session });
    }
    
    return session;
  };
  
  this.destroySession = function(sessionId, subdomain) {
    var subdomainSessions = subdomains[subdomain];
    var session = subdomainSessions[sessionId];
    session.destroy();
    
    //clean up subdomain if the last user is logged out    
    var count = 0;
    for ( var session in subdomainSessions) {
      count++;
      
    }
    if (count == 0)
      delete subdomains[subdomain];
  };
  
  this.getSessionForUser = function(sessionId, subdomain) {
    var subdomainSessions = subdomains[subdomain];
    return subdomainSessions[sessionId];
  };
  
  this.getUsers = function(user, subdomain, since, callback) {
    //get a list of users that has been created at since since    
    var matching = [];        
    var subdomainSessions = subdomains[subdomain];    
    
    for (var i in subdomainSessions) {
      var session = subdomainSessions[i];
      if (session.created_at > since && session.id != user.id)
        matching.push( session.toPublic() );
    }

    if (matching.length != 0) {
      callback({ currentUsers: matching });
    } else {
      callbackSubdomain = callbacksBySubdomain[subdomain];
      callbackSubdomain.push({ timestamp: new Date(), callback: callback });
    }
  };
  
  this.removeUser = function(userId, subdomain) {
    callbackSubdomain = callbacksBySubdomain[subdomain];
    
    while (callbackSubdomain.length > 0) {
      callbackSubdomain.shift().callback({ userRemoved: userId });
    }
  };
  
  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    
    for ( var subdomain in callbacksBySubdomain ) {
      var callbackSubdomain = callbacksBySubdomain[subdomain];      
      while (callbackSubdomain.length > 0 && now - callbackSubdomain[0].timestamp > 30*1000) {
        callbackSubdomain.shift().callback({}); //zero users
      }
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
  var params = qs.parse(url.parse(req.url).query);
  sessionManager.destroySession(params.id, params.subdomain);
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

  var session = sessionManager.getSessionForUser(params.id, params.subdomain);
  session.poke();
  
  sessionManager.getUsers(session, params.subdomain, params.since, function(data) {
    if (session) session.poke();
    res.simpleJSON(200, data);
  });
});