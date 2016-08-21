/**
 * Created with IntelliJ IDEA.
 * User: kyawtun
 * Date: 1/4/13
 * Time: 1:39 PM
 * To change this template use File | Settings | File Templates.
 */




var Task = Backbone.Model.extend(
  {
    initialize: function(args) {
      console.log(['initialize task', args]);
      this.id = args.id;
      this.etag = args.etag;
      this.updated = args.updated;
      this.selfLink = args.selfLink;
    },
    name: 'task',
    url: function() {
      return this.selfLink;
    }
  }
);
var Tasks = Backbone.Collection.extend(
  {
    id: '',  // this must be set during instantiation,
    name: 'tasks',
    model: Task,
    url:  function() {
      return '/tasks/v1/lists/' + this.id + '/tasks';
    },
    parse: function(resp) {
      console.log(['to parse ', resp]);
      return resp.items;
    }
  });

var schema = {
  stores: [
    {
      name: 'task',
      keyPath: 'id',
      type: 'TEXT'
    }, {
      name: 'tasks',
      keyPath: 'id',
      type: 'TEXT'
    }]
};
$.db = new ydn.db.Storage('backbone-sync-1', schema);

// copy original backbone sync for later use
var Backbone_sync = Backbone.sync;

var backboneMathod2Httpmethod = {
  'read': 'GET',
  'update': 'PUT',
  'create': 'POST',
  'delete': 'DELETE'
};

var fetch_gapi = function(method, model, options) {

  if (method == 'read') {
    var req = {
      path: model.url(),
      method: backboneMathod2Httpmethod[method]
    };
    req.callback = function(result) {
      //console.log(result);
      df.resolve(result);
      options.success(result);
    };
    console.log('sending request ' + JSON.stringify(req));
    gapi.client.request(req)

  }
};


/**
 *
 * @param {string} method
 * @param {Backbone.Model} model
 * @param {Object} options
 * @return {*}
 */
var collection_sync = function(method, model, options) {
  if (method == 'read') {
    var df_db = $.db.get(model.name, model.parent);
    df_db.done(function(data) {
      if (data) {
        options.success(data);
        options['header'].push({'If-Not-Match': data.etag});
        var ajax_df = fetch_gapi(method, model, options);
        ajax_df.done(function(new_data) {
          if (new_data) {
            assert(new_data.cid == model.cid);
            $.db.put(model.name, new_data);
            model.set(new_data).change();
          } // else, no change
        });
      } else {
        var req = {
          path: model.url(),
          method: 'GET'
        };
        req.callback = function(result) {
          //console.log(result);
          if (result.items.length > 0) {
            $.db.put(model.name, result.items);
          }
          options.success(result);
        };
        console.log('sending request ' + JSON.stringify(req));
        gapi.client.request(req)
      }
    });
    df_db.fail(function(e) {
      throw e; // db connection blocking, or schema mismatch
    });
  } else if (method == 'update') {
    options['header'].push({'If-Match': model.etag});
    var ajax_df = Backbone_sync(method, model, options);

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
};


/**
 *
 * @param {string} method
 * @param {Backbone.Model} model
 * @param {Object} options
 * @return {*}
 */
var model_sync = function(method, model, options) {
  if (method == 'read') {
    var df_db = $.db.get(model.name, model.id);
    df_db.done(function(data) {
      if (data) {
        options.success(data);
        options['header'].push({'If-Not-Match': data.etag});
        var ajax_df = fetch_gapi(method, model, options);
        ajax_df.done(function(new_data) {
          if (new_data) {
            assert(new_data.cid == model.cid);
            $.db.put(model.name, new_data);
            model.set(new_data).change();
          } // else, no change
        });
      } else {
        var req = {
          path: model.url(),
          method: 'GET'
        };
        req.callback = function(result) {
          //console.log(result);
          if (result.items.length > 0) {
            $.db.put(model.name, result.items);
          }
          options.success(result);
        };
        console.log('sending request ' + JSON.stringify(req));
        gapi.client.request(req)
      }
    });
    df_db.fail(function(e) {
      throw e; // db connection blocking, or schema mismatch
    });
  } else if (method == 'update') {
    options['header'].push({'If-Match': model.etag});
    var ajax_df = Backbone_sync(method, model, options);

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
};

/**
 * inject client-side database cache data before sending to server
 * @param {string} method
 * @param {Backbone.Model} model
 * @param {Object} options
 * @return {*}
 */
Backbone.sync = function(method, model, options) {
  console.log('receiving to sync ' + model.name + ' for ' + method);
  if (model instanceof Backbone.Collection) {
    collection_sync(method, model, options);
  } else {
    model_sync(method, model, options);
  }
};


var tasks;
/**
 *
 * @param {!Object} taskList
 */
runApp = function(taskList) {
  //console.log('running for ' + taskList.title);
  console.log(taskList);
  document.getElementById('task-list').textContent = taskList.title;
  tasks = new Tasks();
  tasks.id = taskList.id;
  tasks.title = taskList.title;
};