/**
 * @fileoverview Base app.
 */



/**
 * Base app.
 * @constructor
 */
var OptionPage = function() {

};


/**
 * @const
 * @protected
 * @type {string}
 */
OptionPage.prototype.login_origin = '';



/**
 * Login.
 * @param {function(this: T, Object)} cb
 * @param {T=} opt_scope
 * @template T
 */
OptionPage.prototype.request = function(url, cb, opt_scope) {
  var xhr = new XMLHttpRequest();
  var url = this.login_origin + url;
  xhr.open('GET', url, true);
  xhr.onload = function(e) {
    var json = null;
    if (xhr.status < 400) {
      json = JSON.parse(xhr.responseText);
    }

    cb.call(opt_scope, json);

  };
  xhr.send();
};

/**
 * Login.
 * @param {function(this: T, Object)} cb
 * @param {T=} opt_scope
 * @template T
 */
OptionPage.prototype.login = function(cb, opt_scope) {

  var url = '/rpc_login?url=' + location.href;

  this.request(url, function(json) {
    var a = document.getElementById('user-login');
    var name = document.getElementById('user-name');
    var user = json.User;
    if (user.is_login) {
      name.textContent = user.email;
      a.href = user.logout_url;
      a.style.display = '';
      a.textContent = 'logout';
    } else {
      a.href = user.login_url;
      a.textContent = 'login';
      a.style.display = '';
      name.style.display = 'none';
    }
    if (cb) {
      cb.call(opt_scope, user);
    }
  }, this);

};


OptionPage.prototype.app_id = 'cm';

/**
 * Initialize UI.
 */
OptionPage.prototype.run = function() {

  this.login();

};


OptionPage.prototype.getUserEmail = function() {
  return document.getElementById('user-name').textContent;
};




