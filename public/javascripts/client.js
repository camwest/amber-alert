var CONFIG = {
  username: "",
  id: null,
  last_message_time: 1
};

function getSubdomain() {
  return window.location.host.split(".")[0];
};

function loginListener(session) {  
  CONFIG.username = session.username;
  CONFIG.id = session.id;
  
  loggedInAs(CONFIG.username);
  
  longPoll();
};

function showLogin() {
  $('#login').show();
  $('#main').hide();
}

function loggedInAs(username) {
  $('#login').hide();
  $('#main').show();
  $('.username').text(username);
};


function setupDefaultScreens() {
  $('#main').hide();
}


/* 
  Long poll accepts data in the following format
  { users: [ { username: "Cameron", id: 1234 } ]}
*/

var users = [];

function longPoll(data) {
  if (data && data.users) {
    for (var i = 0; i < data.users.length; i++) {
      var user = data.users[i];

      users.push(user);
      renderUser(user);

      // update the last user created_at time
      if (user.created_at > CONFIG.last_message_time)
        CONFIG.last_message_time = user.created_at;
    }
  }
  
  $.ajax({ 
    cache:false,
    type: "GET",
    url: "/data",
    dataType: "json",
    data: { since: CONFIG.last_message_time, id: CONFIG.id },
    success: function(data, textStatus) {
      longPoll(data);
    }
  });
}

function renderUser(user) {
  $("#users").append("<li id='" + user.id + "'>" + user.username + "</li>");
}

$(document).ready(function() {
  $(".subdomainText").text( getSubdomain() );  
  $("input[name=username]").focus();
  
  setupDefaultScreens();
  
  $("input[name=login]").click(function() {
    var username = $("input[name=username]").attr("value");
    
    if (username.length == 0) {
      alert('username is required');
      return false;
    }
    
    $.ajax({ 
      cache: false,
      type: "GET",
      dataType: "json",
      url: "/login",
      data: { username: username, subdomain: getSubdomain() },
      error: function () {
        alert("error connecting!");
      },
      
      success: loginListener
    });
    
    return false;
  });
  
});