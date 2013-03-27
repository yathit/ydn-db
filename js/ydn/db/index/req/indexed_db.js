
/**
 * @fileoverview Implements ydn.db.io.QueryService with IndexedDB.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.index.req.IndexedDb');
goog.require('ydn.db.crud.req.IndexedDb');
goog.require('ydn.db.index.req.IRequestExecutor');
goog.require('ydn.db.algo.AbstractSolver');
goog.require('ydn.db.IDBCursor');
goog.require('ydn.db.IDBValueCursor');
goog.require('ydn.db.index.req.IDBCursor');
goog.require('ydn.error');
goog.require('ydn.json');


/**
 * Create a new IDB request executor.
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @param {string} scope_name
 * @constructor
 * @implements {ydn.db.index.req.IRequestExecutor}
 * @extends {ydn.db.crud.req.IndexedDb}
 */
ydn.db.index.req.IndexedDb = function(dbname, schema, scope_name) {
  goog.base(this, dbname, schema, scope_name);
};
goog.inherits(ydn.db.index.req.IndexedDb, ydn.db.crud.req.IndexedDb);


/**
 *
 * @const {boolean} turn on debug flag to dump object.
 */
ydn.db.index.req.IndexedDb.DEBUG = false;



/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.IndexedDb.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.IndexedDb');




/**
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.keysByIterator = function(tx, tx_no, df,
                  iter, limit, offset) {
  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.KEY_ONLY);
  var msg = 'TX' + tx_no + ' keysByIterator:' + iter;
  var me = this;
  this.logger.finest(msg);
  var cursor = iter.iterate(tx, tx_no, this);
  cursor.onError = function(e) {
    me.logger.warning('error:' + msg);
    iter.exit();
    cursor.dispose();
    df(e, true);
  };
  var count = 0;
  var cued = false;
  cursor.onNext = function(primary_key, key, value) {
    if (goog.isDef(primary_key)) {
      if (!cued && offset > 0) {
        cursor.advance(offset);
        cued = true;
        return;
      }
      count++;
      arr.push(cursor.isIndexCursor() ? key : primary_key);
      if (!goog.isDef(limit) || count < limit) {
        cursor.continueEffectiveKey();
      } else {
        iter.exit();
        cursor.dispose();
        me.logger.finest('success:' + msg);
        df(arr);
      }
    } else {
      iter.exit();
      cursor.dispose();
      me.logger.finest('success:' + msg);
      df(arr);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.listByIterator = function(tx, tx_no, df, iter, limit, offset) {
  var arr = [];
  //var req = this.openQuery_(q, ydn.db.base.CursorMode.READ_ONLY);
  var msg = 'TX' + tx_no + ' listByIterator' + iter;
  var me = this;
  this.logger.finest(msg);
  var cursor = iter.iterate(tx, tx_no, this);
  cursor.onError = function(e) {
    me.logger.finer('error:' + msg);
    iter.exit();
    cursor.dispose();
    df(e, false);
  };
  var count = 0;
  var cued = false;
  cursor.onNext = function(primary_key, key, value) {
    if (goog.isDef(key)) {
      if (!cued && offset > 0) {
        cursor.advance(offset);
        cued = true;
        return;
      }
      count++;
      arr.push(iter.isKeyOnly() ? primary_key : value);
      if (!goog.isDef(limit) || count < limit) {
        cursor.continueEffectiveKey();
      } else {
        iter.exit();
        me.logger.finer('success:' + msg);
        cursor.dispose();
        df(arr);
      }
    } else {
      iter.exit();
      me.logger.finest('success:' + msg);
      cursor.dispose();
      df(arr);
    }
  };
};


/**
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.getCursor = function (tx, tx_no, store_name,
     index_name, keyRange, direction, key_only) {

  return new ydn.db.index.req.IDBCursor(tx, tx_no, store_name, index_name,
    keyRange, direction, key_only);
};


/**
 * @inheritDoc
 */
ydn.db.index.req.IndexedDb.prototype.getStreamer = function(tx, tx_no, store_name, index_name) {
  return new ydn.db.Streamer(tx, store_name, index_name);
};