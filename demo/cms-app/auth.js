/**
 * @fileoverview Google client login.
 */


var clientId = '612642631247.apps.googleusercontent.com';
var apiKey = 'AIzaSyCuwhPfBetJ8ncidLzQcLZHCxZcJUvN774';
var scopes = 'email';


// Use a button to handle authentication the first time.
function handleClientLoad() {
  gapi.client.setApiKey(apiKey);
  window.setTimeout(checkAuth, 1);
}

function checkAuth() {
  gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true},
      handleAuthResult);
}


function handleAuthResult(authResult) {
  var login_link = document.getElementById('user-login');
  if (authResult && !authResult.error) {
    login_link.textContent = 'logout';
    login_link.onclick = null;
    login_link.href = 'https://accounts.google.com/logout';
    login_link.style.display = 'none';
    makeApiCall();
  } else {
    login_link.style.display = '';
    login_link.onclick = handleAuthClick;
    login_link.textContent = 'login';
    login_link.href = '#';
  }
}

function handleAuthClick(event) {
  gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false},
      handleAuthResult);
  return false;
}


function makeApiCall() {
  gapi.client.request({
    path: 'oauth2/v3/userinfo',
    callback: function(data) {
      var ele_name = document.getElementById('user-name');
      ele_name.textContent = data.email;
      ele_name.style.display = '';
      app.run(data.email, data.sub);
    }
  });
}
