/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");.
 */
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



/**
 * @fileoverview Main app.
 */



/**
 * Create the app.
 * @constructor
 * @implements {Service}
 */
var CheckvistApp = function() {
  this.session = {};
  this.checkvist = null;

  this.ele_login_panel = document.getElementById('login-panel');
  this.ele_username = document.getElementById('username');
  this.btn_logout = document.getElementById('btn_logout');

  var form_ele = document.getElementById('login-form');
  var me = this;
  form_ele.onsubmit = function(e) {
    e.preventDefault();
    var login = document.getElementById('login').value;
    var pass = document.getElementById('pass').value;
    me.login(function(result) {
      if (result) {
        me.ele_login_panel.style.display = 'none';
      }
    }, login, pass);
    return false;
  };

  var me = this;
  this.btn_logout.onclick = function(e) {
    me.session = {};
    sessionStorage.removeItem('Checkvist.session');
    me.ele_username.textContent = '';
    me.btn_logout.style.display = 'none';
    me.ele_login_panel.style.display = '';
    if (me.checkvist) {
      me.checkvist.dispose();
      me.checkvist = null;
    }
  };

};


/**
 * @type {Checkvist}
 */
CheckvistApp.prototype.checkvist = null;


/**
 * @return {string}
 */
CheckvistApp.prototype.getId = function() {
  return 'checkvist' + encodeURIComponent(this.session.username);
};


/**
 * Do login.
 * @param {function(string?)} cb callback.
 * @param {string=} login user name.
 * @param {string=} pass password.
 */
CheckvistApp.prototype.login = function(cb, login, pass) {
  var me = this;
  var params = {};
  this.session.username = this.session.username || login;
  this.session.password = this.session.password || pass;
  params['remote_key'] = this.session.password;

  var processLogin = function(result) {
    me.session.token = result;
    me.ele_username.textContent = me.session.username;
    me.btn_logout.style.display = '';
    var client = new JsonClient(me);
    me.checkvist = new Checkvist(me.getId(), client);
    me.checkvist.refresh();
  };

  if (!navigator.onLine) {
    console.warn('working offline');
    processLogin(undefined);
    cb(null);
    return;
  }
  var callback = function(result) {
    // console.log(result);
    if (result) {
      processLogin(result);
    } else {
      me.session = {};
      me.ele_username.textContent = '';
      me.btn_logout.style.display = 'none';
      if (me.checkvist) {
        me.checkvist.dispose();
        me.checkvist = null;
      }
    }
    sessionStorage.setItem('Checkvist.session', JSON.stringify(me.session));
    cb(result);
  };
  this.request({
    path: '/auth/login',
    callback: callback,
    method: 'POST',
    params: params});
};


/**
 * Send request to checkvist server.
 * @link https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiclientrequest
 * @param {Object} args request arguments, compatible with Google javascript
 * client library.
 */
CheckvistApp.prototype.request = function(args) {
  var path = args.path;
  var method = args.method || 'GET';
  var params = args.params || {};
  params['username'] = this.session.username;
  if (this.session.token) {
    params['token'] = this.session.token;
  }
  var host = 'beta.checkvist.com';
  var url = 'https://' + host + path + '.json';
  var query = [];
  for (var q in params) {
    query.push(q + '=' + encodeURIComponent(params[q]));
  }
  url += '?' + query.join('&');
  var req = new XMLHttpRequest();
  req.open(method, url, false);
  // req.withCredentials = true;
  var me = this;
  req.onload = function(e) {
    var raw = {
      body: req.responseText,
      status: req.status,
      statusText: req.statusText,
      headers: {}
    };

    var header_lines = req.getAllResponseHeaders().split('\n');
    for (var i = 0; i < header_lines.length; i++) {
      var idx = header_lines[i].indexOf(':');
      if (idx > 0) {
        var name = header_lines[i].substr(0, idx).toLowerCase();
        var value = header_lines[i].substr(idx + 1).trim();
        raw.headers[name] = value;
      }
    }

    args.callback(JSON.parse(req.responseText), raw);
  };
  console.info('sending ' + url);
  req.send();
};


/**
 * Run the app.
 */
CheckvistApp.prototype.run = function() {
  var cache = sessionStorage.getItem('Checkvist.session');
  if (cache) {
    this.session = JSON.parse(cache);
    this.btn_logout.style.display = '';
    var me = this;
    this.login(function(result) {
    });
  } else {
    this.ele_login_panel.style.display = '';
    this.btn_logout.style.display = 'none';
  }
};


