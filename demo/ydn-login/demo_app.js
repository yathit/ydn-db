/**
 * @fileoverview Demonstrate YDN-AUTH module login system to OpenID server.
 */




var open_id_options = {
  appId:'test',
  OpenIdClient:{
    'end_point':'https://accounts.google.com/o/oauth2/auth',
    'client_id':'770204363449.apps.googleusercontent.com',
    'redirect_url': window.top.location.href.replace(/(\?|#)\S*/, ''),
    'scopes':'https://www.googleapis.com/auth/userinfo.email',
    'verify_url':'https://www.googleapis.com/oauth2/v1/tokeninfo'
  }
};


app = new ydn.api.App(open_id_options);

user = app.getUser();

var login_ele = document.getElementById('login');
var nickname_ele = document.getElementById('nickname');
var user_display = {
  setLoginUrl: function(label) {
    login_ele.textContent = 'login';
    login_ele.href = label;
  },
  setLogoutUrl: function(label) {
    login_ele.textContent = 'logout';
    login_ele.href = label;
  },
  setNickname: function(label) {
    nickname_ele.textContent = label;
  }
};
user.setView(user_display);
user.refresh();
