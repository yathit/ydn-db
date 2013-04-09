
/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.core.req.WebsqlCursor');
goog.require('ydn.db.core.req.AbstractCursor');
goog.require('ydn.db.core.req.ICursor');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx tx.
 * @param {string} tx_no tx no.
 * @param {!ydn.db.schema.Store} store_schema schema.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index.
 * @param {IDBKeyRange} keyRange key range.
 * @param {ydn.db.base.Direction} direction cursor direction.
 * @param {boolean} key_only mode.
 * @param {boolean} key_query true for keys query method.
 * @extends {ydn.db.core.req.AbstractCursor}
 * @implements {ydn.db.core.req.ICursor}
 * @constructor
 */
ydn.db.core.req.WebsqlCursor = function(tx, tx_no, store_schema, store_name,
    index_name, keyRange, direction, key_only, key_query) {

  goog.base(this, tx, tx_no, store_name, index_name, keyRange, direction,
      key_only, key_query);

  goog.asserts.assert(store_schema);
  /**
   * @final
   */
  this.store_schema_ = store_schema;
  /**
   * @final
   */
  this.index_ = goog.isString(index_name) ?
      store_schema.getIndex(index_name) : null;

  this.current_key_ = undefined;
  this.current_primary_key_ = undefined;

};
goog.inherits(ydn.db.core.req.WebsqlCursor, ydn.db.core.req.AbstractCursor);


/**
 * @define {boolean} for debugging this file.
 */
ydn.db.core.req.WebsqlCursor.DEBUG = false;


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.core.req.WebsqlCursor.prototype.logger =
    goog.debug.Logger.getLogger('ydn.db.core.req.WebsqlCursor');


/**
 *
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.store_schema_;


/**
 *
 * @type {ydn.db.schema.Index}
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.index_;


/**
 *
 * @type {IDBKey|undefined}
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.current_key_;


/**
 *
 * @type {IDBKey|undefined}
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.current_primary_key_;


/**
 *
 * @type {*}
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.current_value_;


/**
 * @return {IDBKey|undefined}
 */
ydn.db.core.req.WebsqlCursor.prototype.getIndexKey = function() {

  return this.current_key_;

};


/**
 *  @return {IDBKey|undefined} primary key for index iterator.
 */
ydn.db.core.req.WebsqlCursor.prototype.getPrimaryKey = function() {
  return this.current_primary_key_;
};


/**
 * @return {*}
 */
ydn.db.core.req.WebsqlCursor.prototype.getValue = function() {
  return this.current_value_;
};


/**
 * Collect result.
 * @param {Object=} opt_row a row result.
 */
ydn.db.core.req.WebsqlCursor.prototype.collect = function(opt_row) {
  this.current_key_ = undefined;
  this.current_primary_key_ = undefined;
  this.current_value_ = undefined;
  if (goog.isDef(opt_row)) {
    var row = opt_row;
    if (goog.isObject) {
      var primary_column_name = this.store_schema_.getSQLKeyColumnName();
      var primary_key = ydn.db.schema.Index.sql2js(
          row[primary_column_name], this.store_schema_.getType());
      if (this.isIndexCursor()) {
        goog.asserts.assertString(this.index_name);
        var type = this.store_schema_.getIndex(this.index_name).getType();
        this.current_primary_key_ = primary_key;
        this.current_key_ = ydn.db.schema.Index.sql2js(
            row[this.index_name], type);
      } else {
        this.current_key_ = primary_key;
      }
      this.current_value_ = this.key_only ? primary_key :
          ydn.db.crud.req.WebSql.parseRow(row, this.store_schema_);
    } else {
      this.current_value_ = row;
    }
  }
};


/**
 *
 * @param {?ydn.db.core.req.WebsqlCursor.callback} callback invoke.
 * @param {IDBKey} primary_key primary key.
 * @param {boolean=} opt_inclusive position is inclusive.
 * @param {number=} opt_offset offset.
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.continuePrimaryKey_ = function(
    callback, primary_key, opt_inclusive, opt_offset) {

  // this is define only for index iterator.
  goog.asserts.assertString(this.index_name);
  // continuing primary key can only happen if there is a effective key.
  goog.asserts.assert(goog.isDefAndNotNull(this.current_key_));
  var index = this.store_schema_.getIndex(this.index_name);
  var params = [];
  var mth = this.key_query ? ydn.db.schema.Store.QueryMethod.KEYS :
      ydn.db.schema.Store.QueryMethod.VALUES;
  var index_name = this.index_name;

  var key_range = this.key_range;

  /**
   * @type {IDBKey}
   */
  var key = this.current_key_;
  if (goog.isDefAndNotNull(key_range)) {
    var lower = key_range.lower;
    var upper = key_range.upper;
    var lowerOpen = key_range.lowerOpen;
    var upperOpen = key_range.upperOpen;
    if (this.reverse) {
      upper = (goog.isDefAndNotNull(upper) &&
          ydn.db.cmp(upper, key) == -1) ?
          upper : key;
    } else {
      lower = (goog.isDefAndNotNull(lower) &&
          ydn.db.cmp(lower, key) == 1) ?
          lower : key;
    }
    if (goog.isDefAndNotNull(lower) && goog.isDefAndNotNull(upper)) {
      key_range = ydn.db.IDBKeyRange.bound(lower, upper,
          lowerOpen, upperOpen);
    } else if (goog.isDefAndNotNull(lower)) {
      key_range = ydn.db.IDBKeyRange.lowerBound(lower, lowerOpen);
    } else {
      key_range = ydn.db.IDBKeyRange.upperBound(upper, upperOpen);
    }
  } else {
    if (this.reverse) {
      key_range = ydn.db.IDBKeyRange.upperBound(key);
    } else {
      key_range = ydn.db.IDBKeyRange.lowerBound(key);
    }
  }
  var e_sql = this.store_schema_.inSql(params, mth, index_name,
      key_range, this.reverse, this.unique);

  var p_key_range = this.reverse ?
      ydn.db.IDBKeyRange.upperBound(primary_key, !opt_inclusive) :
      ydn.db.IDBKeyRange.lowerBound(primary_key, !opt_inclusive);
  var p_sql = this.store_schema_.inSql(params, mth,
      this.store_schema_.getSQLKeyColumnName(),
      p_key_range, this.reverse, this.unique);

  if (e_sql.where) {
    e_sql.where += ' AND ' + p_sql.where;
  } else {
    e_sql.where = p_sql.where;
  }

  var sql = 'SELECT ' + e_sql.select + ' FROM ' + e_sql.from +
      (e_sql.where ? ' WHERE ' + e_sql.where : '') +
      (e_sql.group ? ' GROUP BY ' + e_sql.group : '') +
      ' ORDER BY ' + e_sql.order;

  sql += ' LIMIT 1'; // cursor move only one step at a time.
  if (opt_offset > 0) {
    sql += ' OFFSET ' + opt_offset;
  }

  var me = this;
  /**
   * @param {SQLTransaction} tx transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(tx, results) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, results]);
    }

    if (results.rows.length > 0) {
      me.collect(results.rows.item(0));
    } else {
      me.collect();
    }
    callback.call(me, me.current_key_, me.current_primary_key_,
        me.current_value_);
    callback = null;
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var onError = function(tr, error) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, error]);
    }
    me.logger.warning('get error: ' + error.message);
    me.onError(/** @type {!Error} */ (error));
    me.collect();
    callback.call(me, me.current_primary_key_, me.current_key_,
        me.current_value_);
    callback = null;
    return false;
  };

  this.logger.finest(this + ': continuePrimary: ' + ' SQL: ' +
      sql + ' : ' + ydn.json.stringify(params));
  this.tx.executeSql(sql, params, onSuccess, onError);
};


/**
 *
 * @param {?ydn.db.core.req.WebsqlCursor.callback} callback invoke.
 * @param {IDBKey=} opt_key effective key.
 * @param {boolean=} opt_inclusive position is inclusive.
 * @param {number=} opt_offset offset.
 * @param {IDBKey=} opt_primary_key primary key.
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.continueEffectiveKey_ = function(
    callback, opt_key, opt_inclusive, opt_offset, opt_primary_key) {

  var key_range = this.key_range;
  var reverse = this.reverse;
  var p_sql;
  var params = [];
  var mth = this.key_query ? ydn.db.schema.Store.QueryMethod.KEYS :
      ydn.db.schema.Store.QueryMethod.VALUES;

  /**
   * Helper to build key range.
   * @param {IDBKey} key effective key.
   * @param {boolean} open not inclusive.
   * @return {ydn.db.KeyRange|IDBKeyRange} effective key range.
   */
  var buildEffectiveKeyRange = function(key, open) {
    if (goog.isDefAndNotNull(key_range)) {
      var lower = key_range.lower;
      var upper = key_range.upper;
      var lowerOpen = key_range.lowerOpen;
      var upperOpen = key_range.upperOpen;
      if (reverse) {
        if (goog.isDefAndNotNull(upper)) {
          var u_cmp = ydn.db.cmp(key, upper);
          if (u_cmp == -1) {
            upper = key;
            upperOpen = open;
          } else if (u_cmp == 0) {
            lowerOpen = open || upperOpen;
          }
        }
      } else {
        if (goog.isDefAndNotNull(lower)) {
          var l_cmp = ydn.db.cmp(key, lower);
          if (l_cmp == 1) {
            lower = key;
            lowerOpen = open;
          } else if (l_cmp == 0) {
            lowerOpen = open || lowerOpen;
          }
        }
      }
      // console.log([lower, upper, lowerOpen, upperOpen])
      // if lower == upper and one of the boundOpen is true,
      // the range condition cannot be met and it is DataError for KeyRange.
      // We rely this invalid key range for SQL query that return no results.
      var kr = new ydn.db.KeyRange(lower, upper, !!lowerOpen, !!upperOpen);
      return /** @type {IDBKeyRange} */ (kr);

    } else {
      if (reverse) {
        return ydn.db.IDBKeyRange.upperBound(key, open);
      } else {
        return ydn.db.IDBKeyRange.lowerBound(key, open);
      }
    }
  };

  var key = goog.isDefAndNotNull(opt_key) ? opt_key : this.current_key_;
  if (goog.isDefAndNotNull(key)) {
    var open = !opt_inclusive;
    key_range = buildEffectiveKeyRange(key, open);
  }

  var column = this.index_ ? this.index_.getSQLIndexColumnName() :
      this.store_schema_.getSQLKeyColumnName();
  var e_sql = this.store_schema_.inSql(params, mth,
      column, key_range, this.reverse, this.unique);

  if (this.is_index && goog.isDefAndNotNull(opt_primary_key)) {
    var primary_key = opt_primary_key;
    var c_key_range = ydn.db.IDBKeyRange.only(key);
    var c_sql = this.store_schema_.inSql(params, mth,
        this.index_.getSQLIndexColumnName(), c_key_range,
        this.reverse, this.unique);
    var p_key_range = this.reverse ?
        ydn.db.IDBKeyRange.upperBound(primary_key, true) :
        ydn.db.IDBKeyRange.lowerBound(primary_key, true);
    p_sql = this.store_schema_.inSql(params, mth,
        this.store_schema_.getSQLKeyColumnName(), p_key_range,
        this.reverse, this.unique);
    var where = '(' + c_sql.where + ' AND ' + p_sql.where + ')';
    if (e_sql.where) {
      e_sql.where += ' OR ' + where;
    } else {
      e_sql.where = where;
    }

  }

  var sql = 'SELECT ' + e_sql.select + ' FROM ' + e_sql.from +
      (e_sql.where ? ' WHERE ' + e_sql.where : '') +
      (e_sql.group ? ' GROUP BY ' + e_sql.group : '') +
      ' ORDER BY ' + e_sql.order;

  sql += ' LIMIT 1'; // cursor move only one step at a time.
  if (opt_offset > 0) {
    sql += ' OFFSET ' + opt_offset;
  }

  var me = this;

  /**
   * @param {SQLTransaction} tx transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(tx, results) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, results]);
    }
    if (results.rows.length > 0) {
      me.collect(results.rows.item(0));
    } else {
      me.collect();
    }

    callback.call(me, me.current_key_, me.current_primary_key_,
        me.current_value_);
    callback = null;
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var onError = function(tr, error) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, tr, error]);
    }
    me.logger.warning('get error: ' + error.message);
    me.onError(/** @type {!Error} */ (error));
    me.collect();
    callback.call(me, me.current_primary_key_, me.current_key_,
        me.current_value_);
    callback = null;
    return false;

  };

  this.logger.finest(this + ': continue: ' + ' SQL: ' +
      sql + ' : ' + ydn.json.stringify(params));

  this.tx.executeSql(sql, params, onSuccess, onError);
};


/**
 * @typedef {
 *   function (
 *     this:ydn.db.core.req.AbstractCursor,
 *     (IDBKey|undefined),
 *     (IDBKey|undefined), *)
 * }
 */
ydn.db.core.req.WebsqlCursor.callback;


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.hasCursor = function() {
  return this.isActive();
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.update = function(obj) {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }


  var df = new goog.async.Deferred();
  var me = this;
  this.has_pending_request = true;
  var primary_key = /** @type {!Array|number|string} */(this.getPrimaryKey());

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(transaction, results) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, results]);
    }
    me.has_pending_request = false;
    df.callback(primary_key);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var onError = function(tr, error) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, tr, error]);
    }
    me.has_pending_request = false;
    me.logger.warning('get error: ' + error.message);
    df.errback(error);
    return false;
  };

  goog.asserts.assertObject(obj);
  var out = me.store_schema_.getIndexedValues(obj, primary_key);

  var sql = 'REPLACE INTO ' + this.store_schema_.getQuotedName() +
      ' (' + out.columns.join(', ') + ')' +
      ' VALUES (' + out.slots.join(', ') + ')' +
      ' ON CONFLICT FAIL';

  me.logger.finest(this + ': clear "' + sql + '" : ' +
      ydn.json.stringify(out.values));
  this.tx.executeSql(sql, out.values, onSuccess, onError);
  return df;

};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.advance = function(step) {

  goog.asserts.assert(step > 0);
  step = step - 1;
  this.continueEffectiveKey_(this.onSuccess, this.current_key_, false, step,
      this.current_primary_key_);

};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.continueEffectiveKey = function(key) {

  if (goog.isDefAndNotNull(key)) {
    this.continueEffectiveKey_(this.onSuccess, key, true);
  } else {
    this.advance(1);
  }

};


/**
 * Make cursor opening request.
 *
 *
 * @param {IDBKey=} opt_key primary key to resume position.
 * @param {IDBKey=} opt_primary_key index key to resume position.
 */
ydn.db.core.req.WebsqlCursor.prototype.openCursor = function(
    opt_key,  opt_primary_key) {
  this.continueEffectiveKey_(this.onSuccess, opt_key, false,
      0, opt_primary_key);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.clear = function() {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }

  var df = new goog.async.Deferred();
  var me = this;
  this.has_pending_request = true;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(transaction, results) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, results]);
    }
    me.has_pending_request = false;
    df.callback(results.rowsAffected);
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var onError = function(tr, error) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, tr, error]);
    }
    me.has_pending_request = false;
    me.logger.warning('get error: ' + error.message);
    df.errback(error);
    return false;

  };

  var primary_column_name = this.store_schema_.getSQLKeyColumnName();
  var sql = 'DELETE FROM ' + this.store_schema_.getQuotedName() +
      ' WHERE ' + primary_column_name + ' = ?';
  var params = [this.getPrimaryKey()];
  me.logger.finest(this + ': clear "' + sql + '" : ' +
      ydn.json.stringify(params));
  this.tx.executeSql(sql, params, onSuccess, onError);
  return df;

};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.restart = function(effective_key,
                                                           primary_key) {
  this.logger.finest(this + ' restarting.');
  this.openCursor(primary_key, effective_key);
};


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.continuePrimaryKey = function(key) {

  goog.asserts.assert(this.isIndexCursor());
  goog.asserts.assert(goog.isDefAndNotNull(this.current_key_));
  goog.asserts.assert(goog.isDefAndNotNull(this.current_primary_key_));
  if (!goog.isDefAndNotNull(this.current_primary_key_)) {
    // primary key can continue only if there was previous key
    this.onSuccess(undefined, undefined, undefined);
    return;
  }
  var cmp = ydn.db.cmp(key, this.current_primary_key_);
  if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
    throw new ydn.error.InvalidOperationError(this +
        ' to continuePrimaryKey for "' +
        key + '" on ' + this.dir + ' direction is wrong');
  }

  var me = this;
  /**
   *
   * @param {IDBKey=} primary_key
   * @param {IDBKey=} index_key
   * @param {*=} value
   */
  var fnc = function(primary_key, index_key, value) {
    if (goog.isDefAndNotNull(primary_key)) {
      var cmp2 = ydn.db.cmp(key, primary_key);
      if (cmp2 == 0 || (cmp2 == 1 && me.reverse) ||
          (cmp2 == -1 && !me.reverse)) {
        me.onSuccess(primary_key, index_key, value);
      } else {
        this.continuePrimaryKey(key);
      }
    } else {
      me.onSuccess(undefined, undefined, undefined);
    }
  };

  this.continuePrimaryKey_(fnc, key)

};





