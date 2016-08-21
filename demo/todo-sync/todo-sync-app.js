/**
 * @fileoverview TodoSync application.
 */



/**
 * Create a TodoSync application.
 * @constructor
 */
var TodoSyncApp = function() {
  var schema = {
    stores: [
      {
        name: 'todo',
        keyPath: 'id',
        Sync: {
          format: 'gcs',
          transport: this,
          Options: {
            bucket: 'ydn-note-data'
          }
        }
      }]
  };
  var db_name = 'todo-sync-1';
  /**
   * @final
   * @type {ydn.db.Storage}
   */
  this.db = new ydn.db.Storage(db_name, schema);
};


/**
 * Run application.
 * @param {string} email email address.
 * @param {string} id Google unique id.
 */
TodoSyncApp.prototype.run = function(email, id) {
  /**
   * @protected
   * @type {string}
   */
  this.email = email;
  /**
   * @protected
   * @type {string}
   */
  this.id = id;
};

