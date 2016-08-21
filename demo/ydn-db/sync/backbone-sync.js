/**
 * @fileoverview Demo to sync backend server with Backbone.sync.
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

var app = new ydn.api.App(open_id_options);

var user = app.getUser();

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

var schema = {
  stores: [
    {
      name: 'store1',
      keyPath: 'cid',
      type: 'TEXT'
    }]
};
$.db = new ydn.db.Storage('backbone-sync-1', schema);

// copy original backbone sync for later use
var Backbone_sync = Backbone.sync;

/**
 * inject client-side database cache data before sending to server
 * @param {string} method
 * @param {Backbone.Model} model
 * @param {Object} options
 * @return {*}
 */
Backbone.sync = function(method, model, options) {
  var df = $.Deferred();
  if (method == 'read') {
    var df_db = $.db.get(model.urlRoot, model.id);
    df_db.done(function(data) {
      if (data) {
        df.resolve(data);
        options['header'].push({'If-Not-Match': data.etag});
        var ajax_df = Backbone_sync(method, model, options);
        ajax_df.done(function(new_data) {
          if (new_data) {
            assert(new_data.cid == model.cid);
            $.db.put(model.name, new_data);
            model.set(new_data).change();
          } // else, no change
        });
      } else {
        var ajax_df = Backbone_sync(method, model, options);
        df.pipe(ajax_df);
        ajax_df.done(function(new_data) {
          $.db.put(model.name, new_data);
        });
      }
    });
    df_db.fail(function(e) {
      throw e; // db connection blocking, or schema mismatch
    });
  } else if (method == 'update') {
    options['header'].push({'If-Match': model.etag});
    var ajax_df = Backbone_sync(method, model, options);
    df.pipe(ajax_df);
    ajax_df.done(function(new_data, status) {
      if (status == 409) { // conflict
        assert(new_data.cid == model.cid);
        $.db.run(function(db) { // run in transaction
          db.get(model.name, model.cid).done(function(data) { // NOTE: not $.db
            if (data) {
              var resolved_data = $.magic.resolve(new_data, data);
              db.put(model.name, resolved_data);
              model.set(resolved_data);
              model.save(); // send merge result to server
            } else {
              db.put(model.name, new_data);
            }
          });
        }, model.name, 'readwrite'); // transaction scope of model object store for read write operations
      } else if (status == 404) { // not found
        $db.clear(model.name, model.cid);
      } else if (status < 300) {
        assert(new_data.cid == model.cid);
        $.db.put(model.name, new_data);
      }
    });
  }
  return df;
};

// run the app
app.run();