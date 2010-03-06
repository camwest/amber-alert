var CONFIG = {
  username: "",
  id: null,
  last_message_time: 1,
  user_id_preix: 'user_'
};

function getSubdomain() {
  return window.location.host.split(".")[0];
};

function loginListener(session) {  
  CONFIG.username = session.username;
  CONFIG.id = session.id;
  
  loggedInAs(CONFIG.username);
  longPoll("first");
};

function showLogin() {
  $('#login').show();
  $('#main').hide();
}

function logout() {
  showLogin();  
  $("#users").empty();
  
  jQuery.get("/logout", { id: CONFIG.id, subdomain: getSubdomain() }, function (data) { }, "json");
  CONFIG.username = "";
  CONFIG.id = null;
  CONFIG.last_message_time = 1;
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
var transmission_errors = 0;

function longPoll(data) {
  if (data == null) {
    showLogin();
    return;
  }
  
  if (data && data.currentUsers) {
    for (var i = 0; i < data.currentUsers.length; i++) {
      var user = data.currentUsers[i];
      addUser(user);
    }
  }
  
  if (data && data.userAdded) {
    addUser(data.userAdded);
  }
  
  if (data && data.userRemoved) {
    removeUser(data.userRemoved);
  }
  
  if (data && data.userStatusChange) {
    updateStatus(data.userStatusChange);
  }
  
  $.ajax({ 
    cache:false,
    type: "GET",
    url: "/data",
    dataType: "json",
    data: { since: CONFIG.last_message_time, id: CONFIG.id, subdomain: getSubdomain() },
    success: function(data, textStatus) {
      longPoll(data);
    }
  });
}

function addUser(user) {
  users.push(user);
  renderUser(user);

  // update the last user created_at time
  if (user.created_at > CONFIG.last_message_time)
    CONFIG.last_message_time = user.created_at;
}

function renderUser(user) {
  $("#users").append("<li class='user' id='user_" + user.id + "'>" + user.username + "</li>");
}

function removeUser(userId) {
  $("#user_" + userId).remove();
}

function updateStatus(user) {
  $("#user_" + user.id).removeClass().addClass("user " + user.currentStatus);
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
  
  $('.user').live('click', function() {
    var userId = this.id.substr(CONFIG.user_id_preix.length);
    jQuery.get("/notify", { current_user: CONFIG.id, target_user: userId, subdomain: getSubdomain() }, function (data) { }, "json");
  });
  
  $("#logout").click(function(){
    logout();
  });
});