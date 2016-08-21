/**
 * @fileoverview Demo to sync backend server with Backbone.sync.
 */




var clientId = '770204363449.apps.googleusercontent.com';


var apiKey = 'AIzaSyAOUb6TeEWHuNS6tbx4MRCB721BzNP20Nw';

var scopes = ['https://www.googleapis.com/auth/tasks'];

// Use a button to handle authentication the first time.
function handleClientLoad() {
  gapi.client.setApiKey(apiKey);
  window.setTimeout(checkAuth,1);
}

function checkAuth() {
  gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
}


function handleAuthResult(authResult) {
  var authorizeButton = document.getElementById('authorize-button');
  if (authResult && !authResult.error) {
    authorizeButton.style.visibility = 'hidden';
    makeApiCall();
  } else {
    authorizeButton.style.visibility = '';
    authorizeButton.onclick = handleAuthClick;
  }
}

function handleAuthClick(event) {
  gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult);
  return false;
}

// Load the API and make an API call.  Display the results on the screen.
function makeApiCall() {

  gapi.client.load('tasks', 'v1', function() {
    var request = gapi.client.tasks.tasklists.list({
      'maxResults': 100
    });
    request.execute(function(resp) {
      var cnt = 0;
      if (resp.items) {
        cnt = resp.items.length;
      }
      status('Receiving task list ' + cnt + ' items.');
      if (cnt > 0) {
        runApp(resp.items[0]);
      }
    });
  })
}

var div_status_message = document.getElementById('status-message');
function status(message) {
  div_status_message.textContent += message + '\n';
}

