/**
 * @fileoverview Wrap over goog.db.IndexedDb.
 *
 * This is not used.
 */

goog.provide('ydn.db.GoogIndexedDb');
goog.require('goog.db');
goog.require('goog.db.ObjectStore');
goog.require('goog.events');
goog.require('ydn.db.Db');



/**
 * @param {string} dbname
 * @param {string=} tablename create a 'default' table.
 * @constructor
 */
ydn.db.GoogIndexedDb = function(dbname, tablename) {
  var self = this;
  this.dbname = dbname;
  this.tablename = tablename || 'tb';

  goog.db.openDatabase(this.dbname).addCallback(function(db) {
    window.console.log('db creaded');
    self.db = db.setVersion('1.0').addCallback(function(tx) {
      window.console.log('v set.');
      db.createObjectStore(self.tablename);
      // restart to see our structure changes
      return goog.db.openDatabase(self.dbname);
    });
  });

  /**
   *
   * @type {!goog.async.Deferred} db
   */
  this.db = goog.db.openDatabase(this.dbname);
};


/**
 *
 * @param {string} key
 * @param {string} value
 */
ydn.db.GoogIndexedDb.prototype.put = function(key, value) {

  var d = new goog.async.Deferred();
  var self = this;
  window.console.log('putting ' + key);
  this.db.addCallback(function(db) {
    self.db = goog.async.Deferred.succeed(db);
    window.console.log('db opened.');
    var tx = db.createTransaction(
        [self.tablename],
        goog.db.Transaction.TransactionMode.READ_WRITE);

    goog.events.listen(tx, goog.db.Transaction.EventTypes.COMPLETE, function() {
      d.callback(true);
    });

    var store = tx.objectStore(self.tablename);
    store.put(value, key);

  });
  return d;
};


/**
 *
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.GoogIndexedDb.prototype.get = function(key) {
  var d = new goog.async.Deferred();
  var self = this;
  this.db.addCallback(function(db) {
    var tx = db.createTransaction(
        [self.tablename],
        goog.db.Transaction.TransactionMode.READ_ONLY);

    var value;
    goog.events.listen(tx, goog.db.Transaction.EventTypes.COMPLETE, function() {
      self.db = goog.async.Deferred.succeed(db);
      window.console.log(['value', value]);
      d.callback(value);
    });

    var store = tx.objectStore(self.tablename);
    store.get(key).addCallback(function(result) {
      window.console.log(['result', result]);
      value = result;
    });
  });
  return d;
};


/**
 * Return object
 * @param {string} key
 * @return {!goog.async.Deferred}
 */
ydn.db.GoogIndexedDb.prototype.getObject = function(table, key) {

};


/**
 *
 * @param {Object} value
 * @param {string=} key
 * @return {!goog.async.Deferred} true on success. undefined on fail.
 */
ydn.db.GoogIndexedDb.prototype.putObject = function(table, value, key) {

};


/**
 * Deletes all objects from the store.
 * @return {!goog.async.Deferred}
 */
ydn.db.GoogIndexedDb.prototype.clear = function() {
  var d = new goog.async.Deferred();
  var self = this;
  this.db.addCallback(function(db) {
    var tx = db.createTransaction(
        [self.tablename],
        goog.db.Transaction.TransactionMode.READ_WRITE);

    goog.events.listen(tx, goog.db.Transaction.EventTypes.COMPLETE, function() {
      self.db = goog.async.Deferred.succeed(db);
      d.callback(true);
    });

    var store = tx.objectStore(self.tablename);
    store.clear();
  });
  return d;
};


/**
 *
 * @return {!goog.async.Deferred} {@code Array.<string>}.
 */
ydn.db.GoogIndexedDb.prototype.getAll = function() {
  var d = new goog.async.Deferred();
  var self = this;
  goog.db.openDatabase(this.dbname).addCallback(function(db) {
    var putTx = db.createTransaction(
        [self.tablename],
        goog.db.Transaction.TransactionMode.READ_ONLY);
    var store = putTx.objectStore(self.tablename);
    store.getAll().addCallback(function(value) {
      d.callback(value);
    }).addErrback(function() {
      d.errback(false);
    });
  });
  return d;
};


/**
 * Get number of items stored.
 * @return {!goog.async.Deferred} {@code number}.
 */
ydn.db.GoogIndexedDb.prototype.getCount = function() {
  var d = new goog.async.Deferred();
  this.getAll().addCallback(function(all) {
    d.callback(all.length);
  }).addErrback(function() {
    d.errback(false);
  });
  return d;
};


/**
 * @private
 */
ydn.db.GoogIndexedDb.prototype.test = function() {
  var self = this;
  goog.db.openDatabase(this.dbname).addCallback(function(db) {
    var putTx = db.createTransaction(
        [self.tablename],
        goog.db.Transaction.TransactionMode.READ_WRITE);
    var store = putTx.objectStore(self.tablename);
    store.put('value', 'key');
    goog.events.listen(putTx, goog.db.Transaction.EventTypes.COMPLETE, function() {
      var getTx = db.createTransaction([self.tablename], goog.db.Transaction.TransactionMode.READ_ONLY);
      var request = getTx.objectStore(self.tablename).get('key');
      request.addCallback(function(result) {
        window.console.log('got ' + result);
      });
    });
  });
};






