/**
 * @fileoverview CMS web app using Google Sites API.
 */



/**
 * Create CMS app.
 * @constructor
 */
var TaskApp = function() {
  var schema = {
    stores: [
      {
        name: 'Tasklists',
        keyPath: 'id',
        indexes: [
          {
            name: 'updated'
          }],
        Sync: {
          format: 'gdata-json',
          baseUri: 'https://www.googleapis.com/tasks/v1/',
          Options: {
            kind: 'tasks#taskList',
            prefix: 'users/@me/lists/',
            prefetch: true // load all task lists
          }
        }
      },
      {
        name: 'Tasks',
        keyPath: 'selfLink',
        indexes: [
          {
            name: 'updated'
          }, {
            name: 'parent',
            type: 'TEXT',
            generator: function(obj) {
              return obj.selfLink.match(/lists\/(\w+)\/tasks/)[1];
            }
          }],
        Sync: {
          format: 'gdata-json',
          baseUri: 'https://www.googleapis.com/tasks/v1/',
          Options: {
            kind: 'tasks#task',
            prefix: 'lists/{parent}/tasks/',
            prefetch: true // load all task lists
          }
        }
      }]
  };
  this.db = new ydn.db.Storage('task-app', schema);
};


/**
 * Run application.
 */
TaskApp.prototype.run = function() {
  /*
  var log = function(json, raw) {
    console.log(json);
    // console.log(raw);
  };
  var args = {
    // '/calendar/v3/users/me/calendarList'
    path: '/tasks/v1/users/@me/lists'
  };
  var req = gapi.client.request(args);
  req.execute(log);

  var args = {
    // '/calendar/v3/calendars/kyawtuns@gmail.com/events'
    path: '/tasks/v1/lists/MDMzNzMzOTQ4NDQwNDM1NzkwMDM6MDow/tasks'
  };
  var req = gapi.client.request(args);
  req.execute(log);
  */
  var db = this.db;
  var loadTasks = function(tl_id) {
    var starts = 'https://www.googleapis.com/tasks/v1/users/@me/lists/' + tl_id;
    var key_range = ydn.db.KeyRange.starts(starts);
    var req = db.values('Tasks', key_range);
    req.progress(function(x) {
      console.log('progress');
      console.log(x);
    });
    req.then(function(x) {
      console.log(x);
    }, function(e) {
      throw e;
    }, this);
  };
  var req = this.db.values('Tasklists');
  req.progress(function(x) {
    console.log(x);
  });
  req.then(function(x) {
    console.log(x);
    loadTasks(x.id);
  }, function(e) {
    throw e;
  }, this);

};

