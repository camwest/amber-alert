HOST = null; // localhost
PORT = 8080;

var fu = require ('./lib/fu');
var qs = require("querystring");
var url = require("url");
var sys = require("sys");

fu.listen(PORT, HOST);

// APPLICATION FUNCTIONS
var sessions = {};


// creates a new session
function createSession(username, subdomain) {
  var session = {
    username: username,
    id: Math.floor(Math.random()*99999999999).toString(),
    timestamp: new Date(),
    poke: function() {
      session.timestamp = new Date();
    },
    
    destroy: function() {
      delete sessions[session.id];
    }    
  };
  
  sessions[session.id] = session;
  return session;
};


// ROUTES CONFIGURATION

fu.get("/", fu.staticHandler("public/index.html"));
fu.get("/javascripts/client.js", fu.staticHandler("public/javascripts/client.js"));
fu.get("/javascripts/jquery-1.4.2.min.js", fu.staticHandler("public/javascripts/jquery-1.4.2.min.js"));

fu.get("/login", function(req, res) {
  var params = qs.parse(url.parse(req.url).query);

  var session = createSession(params.username, params.subdomain);
  
  res.simpleJSON(200, { id: session.id, username: session.username });
});