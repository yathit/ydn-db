/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.WebsqlCursor');
goog.require('ydn.db.index.req.AbstractCursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {SQLTransaction} tx object store.
 * @param {ydn.db.schema.Store} store_schema schema.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @extends {ydn.db.index.req.AbstractCursor}
 * @constructor
 */
ydn.db.index.req.WebsqlCursor = function(tx, store_schema, store_name, index_name, keyRange,
                                   direction, key_only, ini_key, ini_index_key) {
  goog.base(this, store_name, index_name, keyRange,
      direction, key_only);

  goog.asserts.assert(tx);
  this.tx = tx;

  goog.asserts.assert(store_schema);
  this.store_schema_ = store_schema;

  this.cache_primary_keys_ = null;
  this.cache_keys_ = null;
  this.cache_values_ = null;

  this.open_request(ini_key, ini_index_key);

};
goog.inherits(ydn.db.index.req.WebsqlCursor, ydn.db.index.req.AbstractCursor);


/**
 * @define {boolean}
 */
ydn.db.index.req.WebsqlCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.index.req.WebsqlCursor.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.index.req.WebsqlCursor');


/**
 * @private
 * @type {SQLTransaction}
 */
ydn.db.index.req.WebsqlCursor.prototype.tx;


/**
 *
 * @type {ydn.db.schema.Store}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.store_schema_ = null;


/**
 * 
 * @type {*}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.current_key_ = null;

/**
 *
 * @type {*}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.current_primary_key_ = null;

/**
 *
 * @type {*}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.current_value_ = null;


/**
 *
 * @type {Array}
 */
ydn.db.index.req.WebsqlCursor.prototype.cache_keys_ = null;

/**
 *
 * @type {Array}
 */
ydn.db.index.req.WebsqlCursor.prototype.cache_primary_keys_ = null;

/**
 *
 * @type {Array}
 */
ydn.db.index.req.WebsqlCursor.prototype.cache_values_ = null;


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @param {boolean=} inclusive
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.open_request = function(ini_key, ini_index_key, inclusive) {

  this.cache_primary_keys_ = [];
  this.cache_keys_ = [];
  this.cache_values_ = [];

  var key_range = this.key_range;
  if (goog.isDefAndNotNull(ini_index_key)) {
    if (goog.isDefAndNotNull(this.key_range)) {
    var cmp = ydn.db.con.IndexedDb.indexedDb.cmp(ini_index_key, this.key_range.upper);
    if (cmp == 1 || (cmp == 0 && !this.key_range.upperOpen)) {
      this.onNext(undefined, undefined, undefined); // out of range;
      return;
    }
    key_range = ydn.db.IDBKeyRange.bound(ini_index_key,
      this.key_range.upper, false, this.key_range.upperOpen);
    } else {
      key_range = ydn.db.IDBKeyRange.lowerBound(ini_index_key);
    }
  }

  /**
   * @type {ydn.db.index.req.WebsqlCursor}
   */
  var me = this;
  var request;
  var sqls = ['SELECT'];
  var params = [];
  var column_name = this.index_name ?
    this.index_name : ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
  var q_column_name = goog.string.quote(column_name);
  var primary_column_name = this.store_schema_.getColumnName();
  var q_primary_column_name = goog.string.quote(primary_column_name);
  sqls.push(this.key_only ?
    q_column_name + ', ' + q_primary_column_name : '*');
  sqls.push('FROM ' + goog.string.quote(this.store_name));

  var where_clause = ydn.db.Where.toWhereClause(column_name, key_range);
  if (where_clause.sql) {
    sqls.push(where_clause.sql);
    params = params.concat(where_clause.params);
  }

  if (goog.isDefAndNotNull(ini_key)) {
    if (where_clause.sql) {
      sqls.push('AND ' + ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME + ' = ?');
      params.push(ini_key);
    } else {
      sqls.push('WHERE ' + ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME + ' = ?');
      params.push(ini_key);
    }
  }

  var order = this.reverse ? 'DESC' : 'ASC';
  sqls.push(' ORDER BY ' + q_column_name + ' ' + order);

  if (this.key_only) {
    sqls.push(' LIMIT ' + 100);
  } else {
    sqls.push(' LIMIT ' + 1);
  }

  this.has_pending_request = true;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(transaction, results) {
    me.has_pending_request = false;

    var n = results.rows.length;

    for (var i = 0; i < n; i++) {
      var row = results.rows.item(i);
      me.cache_primary_keys_[i] = ydn.db.schema.Index.sql2js(row[primary_column_name],
        me.store_schema_.getType());
      if (me.key_only) {
        me.cache_keys_[i] = ydn.db.schema.Index.sql2js(row[column_name], me.store_schema_.getType());
      } else if (goog.isDefAndNotNull(row)) {
        me.cache_values_[i] = ydn.db.core.req.WebSql.parseRow(row, me.store_schema_);
      }
    }

    if (ydn.db.index.req.WebsqlCursor.DEBUG) {
      window.console.log(['onSuccess', n, results.rows,
        me.cache_primary_keys_, me.cache_keys_, me.cache_values_]);
    }

    //console.log(['onsuccess', cur ? cur.key : undefined, cur ? cur.primaryKey : undefined, ini_key, ini_index_key]);
    if (n > 0) {
      //me.onNext(cur.primaryKey, cur.key, cur.value);
      me.current_primary_key_ = me.cache_primary_keys_.shift();
      me.current_key_ = me.cache_keys_.shift();
      me.current_value_ = me.cache_values_.shift();
      me.onSuccess(me.current_primary_key_, me.current_key_, me.current_value_);
    } else {
      me.logger.finest('Iterator: ' + me.label + ' completed.');
      me.onSuccess(undefined, undefined, undefined);
    }

  };

  var onError = function (event) {
    me.logger.warning('get error: ' + event.message);
    me.onError(event);
    return true; // roll back

  };

  var sql = sqls.join(' ');
  me.logger.finest('Iterator: ' + this.label + ' opened: ' + sql);
  this.tx.executeSql(sql, params, onSuccess, onError);

};



/**
 * Continue to next position.
 * @param {*} next_position next index key.
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.forward = function (next_position) {
  //console.log(['next_position', cur, next_position]);

  if (next_position === false) {
    // restart the iterator
    this.logger.finest('Iterator: ' + this.label + ' restarting.');
    this.open_request();
  } else if (this.hasCursor()) {
    if (next_position === true && goog.isArray(this.cache_keys_)) {
      //this.cur['continue']();

      this.current_primary_key_ = this.cache_primary_keys_.shift();
      this.current_key_ = this.cache_keys_.shift();
      this.current_value_ = this.cache_values_.shift();

      this.onSuccess(this.current_primary_key_, this.current_key_, this.current_value_);

    } else if (goog.isDefAndNotNull(next_position)) {
      //console.log('continuing to ' + next_position)
      //this.cur['continue'](next_position);
      throw new ydn.error.NotImplementedException();
    } else {
      // notify that cursor iteration is finished.
      this.onSuccess(undefined, undefined, undefined);
      this.current_key_ = null;
      this.current_primary_key_ = null;
      this.current_value_ = null;
      this.logger.finest('Cursor: ' + this.label + ' resting.');
    }
  } else {
    throw new ydn.error.InvalidOperationError('Iterator:' + this.label + ' cursor gone.');
  }
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.hasCursor = function() {
  return goog.isDefAndNotNull(this.current_key_);
};


/**
 * This must call only when cursor is active.
 * @return {*} return current index key.
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.getKey = function() {
  return this.current_key_;
};


/**
 * This must call only when cursor is active.
 * @return {*} return current primary key.
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.getPrimaryKey = function() {
  return this.current_primary_key_;
};


/**
 * This must call only when cursor is active.
 * @return {*} return current primary key.
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.getValue = function() {
  return this.current_value_;
};


/**
 * Continue to next primary key position.
 *
 *
 * This will continue to scan
 * until the key is over the given primary key. If next_primary_key is
 * lower than current position, this will rewind.
 * @param {*} next_primary_key
 * @param {*=} next_index_key
 * @param {boolean=} inclusive
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.seek = function(next_primary_key,
                                         next_index_key, inclusive) {
  throw new ydn.error.NotImplementedException();
//
//  if (this.cur) {
//    var value = this.key_only ? this.cur.key : this.cur['value'];
//    var primary_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(this.cur.primaryKey, next_primary_key);
//    var primary_on_track = primary_cmp == 0 || (primary_cmp == 1 && !this.reverse) || (primary_cmp == -1 && this.reverse);
//
//    if (ydn.db.index.req.WebsqlCursor.DEBUG) {
//      var s = primary_cmp === 0 ? 'next' : primary_cmp === 1 ? 'on track' : 'wrong track';
//      window.console.log(this + ' seek ' + next_primary_key + ':' + next_index_key + ' ' + s);
//    }
//
//    if (goog.isDefAndNotNull(next_index_key)) {
//      var index_cmp = ydn.db.con.IndexedDb.indexedDb.cmp(this.cur.key, next_index_key);
//      var index_on_track = (index_cmp == 1 && !this.reverse) || (index_cmp == -1 && this.reverse);
//      if (index_cmp === 0) {
//        if (primary_cmp === 0) {
//          throw new ydn.error.InternalError('cursor cannot seek to current position');
//        } else if (primary_on_track) {
//          this.cur['continue']();
//        } else {
//          // primary key not in the range
//          // this will restart the thread.
//          this.open_request(next_primary_key, next_index_key);
//        }
//      } else if (index_on_track) {
//        // just to index key position and continue
//        this.open_request(next_index_key, next_index_key);
//      } else {
//        // this will restart the thread.
//        this.logger.finest('Iterator: ' + this.label + ' restarting for ' + next_primary_key);
//        this.open_request(next_primary_key, next_index_key);
//      }
//    } else {
//      if (primary_cmp === 0) {
//        if (inclusive) {
//          throw new ydn.db.InternalError();
//        }
//        this.cur['continue']();
//        this.has_pending_request = true;
//      } else if (primary_on_track) {
//        if (!inclusive) {
//          throw new ydn.db.InternalError();
//        }
//        this.cur['continue'](next_primary_key);
//        this.has_pending_request = true;
//      } else {
//        // primary key not in the range
//        // this will restart the thread.
//        this.open_request(next_primary_key, next_index_key, inclusive);
//      }
//    }
//  } else {
//    throw new ydn.db.InternalError(this.label + ' cursor gone.');
//  }
};

