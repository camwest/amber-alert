function getSubdomain() {
  return window.location.host.split(".")[0];
};

function loginListener(session) {
  loggedInAs(session.username);
};

function setupDefaultScreens() {
  $('#main').hide();
}

function loggedInAs(username) {
  $('#login').hide();
  $('#main').show();
  $('.username').text(username);
};

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