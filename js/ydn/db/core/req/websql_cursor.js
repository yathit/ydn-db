// Copyright 2012 YDN Authors. All Rights Reserved.
//
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
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.core.req.WebsqlCursor');
goog.require('ydn.db.core.req.AbstractCursor');
goog.require('ydn.db.core.req.ICursor');



/**
 * Open an index. This will resume depending on the cursor state.
 * @param {ydn.db.con.IDatabase.Transaction} tx tx.
 * @param {string} tx_no tx no.
 * @param {!ydn.db.schema.Store} store_schema schema.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index.
 * @param {IDBKeyRange} keyRange key range.
 * @param {ydn.db.base.Direction} direction cursor direction.
 * @param {boolean} key_only mode.
 * @param {ydn.db.schema.Store.QueryMethod} mth true for keys query method.
 * @extends {ydn.db.core.req.AbstractCursor}
 * @implements {ydn.db.core.req.ICursor}
 * @constructor
 */
ydn.db.core.req.WebsqlCursor = function(tx, tx_no, store_schema, store_name,
    index_name, keyRange, direction, key_only, mth) {

  goog.base(this, tx, tx_no, store_name, index_name, keyRange, direction,
      key_only, mth);

  goog.asserts.assert(store_schema);
  /**
   * @final
   * @private
   */
  this.store_schema_ = store_schema;
  /**
   * @final
   * @private
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
  if (ydn.db.core.req.WebsqlCursor.DEBUG) {
    window.console.log(opt_row);
  }
  if (goog.isDef(opt_row)) {
    var row = opt_row;
    if (goog.isObject(row)) {
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
      this.current_value_ = !this.isValueCursor() ? primary_key :
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

  var index_name = this.index_name;

  var key_range = this.key_range;

  /**
   * @type {IDBKey}
   */
  var key = this.current_key_;
  if (goog.isDefAndNotNull(key_range)) {
    var lower = /** @type {IDBKey} */ (key_range.lower);
    var upper = /** @type {IDBKey} */ (key_range.upper);
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
      // here, sometime, we rely unvalid key range such as
      // lower = upper, lowerPen = true, upperOpen = false
      // IDBKeyRange will not accept such invalid key range.
      key_range = ydn.db.KeyRange.bound(lower, upper,
          !!lowerOpen, !!upperOpen);
    } else if (goog.isDefAndNotNull(lower)) {
      key_range = ydn.db.IDBKeyRange.lowerBound(lower, !!lowerOpen);
    } else {
      key_range = ydn.db.IDBKeyRange.upperBound(upper, !!upperOpen);
    }
  } else {
    if (this.reverse) {
      key_range = ydn.db.IDBKeyRange.upperBound(key);
    } else {
      key_range = ydn.db.IDBKeyRange.lowerBound(key);
    }
  }
  var e_sql = this.store_schema_.inSql(params, this.query_method, index_name,
      key_range, this.reverse, this.unique);

  var p_key_range = this.reverse ?
      ydn.db.IDBKeyRange.upperBound(primary_key, !opt_inclusive) :
      ydn.db.IDBKeyRange.lowerBound(primary_key, !opt_inclusive);
  var p_sql = this.store_schema_.inSql(params, this.query_method,
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
    me.onError(error);
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
 * Continue to given effective key position.
 * @param {!Array.<string>} params sql params.
 * @param {?ydn.db.core.req.WebsqlCursor.callback} callback invoke.
 * @param {IDBKey} key effective key.
 * @param {boolean} open open.
 * @param {IDBKey} primary_key primary key.
 * @return {string} sql.
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.sqlContinueIndexEffectiveKey_ = function(
    params, callback, key, open, primary_key) {


  var index_column = this.index_.getSQLIndexColumnName();
  var q_index_column = this.index_.getSQLIndexColumnNameQuoted();
  var primary_column = this.store_schema_.getSQLKeyColumnName();
  var q_primary_column = this.store_schema_.getSQLKeyColumnNameQuoted();

  var op = this.reverse ? ' <' : ' >';
  if (open) {
    op += ' ';
  } else {
    op += '= ';
  }
  var encode_key = ydn.db.schema.Index.js2sql(key, this.index_.getType());
  var encode_primary_key = ydn.db.schema.Index.js2sql(primary_key,
      this.store_schema_.getType());

  var e_sql;
  var or = '';
  if (this.key_range) {
    e_sql = this.store_schema_.inSql(params, this.query_method,
        index_column, this.key_range,
        this.reverse, this.unique);
    e_sql.where += ' AND ';

    or = q_index_column + op + '?';
    params.push(encode_key);
  } else {
    var key_range = this.reverse ?
        ydn.db.KeyRange.upperBound(key, true) :
        ydn.db.KeyRange.lowerBound(key, true);
    e_sql = this.store_schema_.inSql(params, this.query_method,
        index_column, key_range,
        this.reverse, this.unique);
    or = e_sql.where;
    e_sql.where = '';
  }

  e_sql.where += '(' + or + ' OR (' + q_index_column + ' = ? AND ' +
      q_primary_column + op + '?))';
  params.push(encode_key);
  params.push(encode_primary_key);

  return 'SELECT ' + e_sql.select + ' FROM ' + e_sql.from +
      ' WHERE ' + e_sql.where +
      (e_sql.group ? ' GROUP BY ' + e_sql.group : '') +
      ' ORDER BY ' + e_sql.order;
};


/**
 * Continue to given effective key position.
 * @param {!Array.<string>} params sql params.
 * @param {?ydn.db.core.req.WebsqlCursor.callback} callback invoke.
 * @param {IDBKey} key effective key.
 * @param {boolean} open open bound.
 * @return {string} sql.
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.sqlContinueEffectiveKey_ = function(
    params, callback, key, open) {
  var p_sql;
  /** @type {IDBKey} */
  var lower;
  /** @type {IDBKey} */
  var upper;
  var lowerOpen, upperOpen;
  if (goog.isDefAndNotNull(this.key_range)) {
    lower = /** @type {IDBKey} */ (this.key_range.lower);
    upper = /** @type {IDBKey} */ (this.key_range.upper);
    lowerOpen = this.key_range.lowerOpen;
    upperOpen = this.key_range.upperOpen;

    if (this.reverse) {
      if (goog.isDefAndNotNull(upper)) {
        var u_cmp = ydn.db.cmp(key, upper);
        if (u_cmp == -1) {
          upper = key;
          upperOpen = open;
        } else if (u_cmp == 0) {
          upperOpen = open || upperOpen;
        }
      } else {
        upper = key;
        upperOpen = open;
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
      } else {
        lower = key;
        lowerOpen = open;
      }
    }
  } else {
    if (this.reverse) {
      upper = key;
      upperOpen = open;
    } else {
      lower = key;
      lowerOpen = open;
    }
  }

  var key_range = new ydn.db.KeyRange(lower, upper, !!lowerOpen, !!upperOpen);

  var column = this.index_ ? this.index_.getSQLIndexColumnName() :
      this.store_schema_.getSQLKeyColumnName();
  var e_sql = this.store_schema_.inSql(params, this.query_method,
      column, key_range, this.reverse, this.unique);


  var sql = 'SELECT ' + e_sql.select + ' FROM ' + e_sql.from +
      (e_sql.where ? ' WHERE ' + e_sql.where : '') +
      (e_sql.group ? ' GROUP BY ' + e_sql.group : '') +
      ' ORDER BY ' + e_sql.order;

  if (this.isIndexCursor()) {
    var order = this.reverse ? 'DESC' : 'ASC';
    sql += ', ' + this.store_schema_.getSQLKeyColumnNameQuoted() + order;
  }

  return sql;
};


/**
 * Continue to given effective key position.
 * @param {?ydn.db.core.req.WebsqlCursor.callback} callback invoke.
 * @param {IDBKey=} opt_key effective key.
 * @param {boolean=} opt_inclusive position is inclusive.
 * @param {number=} opt_offset offset.
 * @param {IDBKey=} opt_primary_key primary key.
 * @private
 */
ydn.db.core.req.WebsqlCursor.prototype.continueEffectiveKey_ = function(
    callback, opt_key, opt_inclusive, opt_offset, opt_primary_key) {

  var offset = opt_offset || 0;
  var open = !opt_inclusive;
  var params = [];
  var sql;

  if (goog.isDefAndNotNull(opt_primary_key)) {
    goog.asserts.assert(this.is_index);
    goog.asserts.assert(goog.isDefAndNotNull(opt_key));
    sql = this.sqlContinueIndexEffectiveKey_(params, callback, opt_key,
        open, opt_primary_key);
  } else if (goog.isDefAndNotNull(opt_key)) {
    sql = this.sqlContinueEffectiveKey_(params, callback, opt_key, open);
  } else {
    var column = this.isPrimaryCursor() ?
        this.store_schema_.getSQLKeyColumnName() :
        this.index_.getSQLIndexColumnName();
    sql = this.store_schema_.toSql(params, this.query_method, column,
        this.key_range, this.reverse, this.unique);
    if (this.isIndexCursor()) {
      var order = this.reverse ? 'DESC' : 'ASC';
      sql += ', ' + this.store_schema_.getSQLKeyColumnNameQuoted() + ' ASC';
    }
  }

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
    /*
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log(sql);
      for (var r = 0, rn = results.rows.length; r < rn; r++) {
        window.console.log(results.rows.item(r));
      }
    }
    */
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
    me.onError(error);
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
  var primary_key = /** @type {!Array|number|string} */(this.getPrimaryKey());

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(transaction, results) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, results]);
    }
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
    df.setDbValue(error, true);
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
 * @const
 * @type {boolean}
 */
ydn.db.core.req.WebsqlCursor.MONITOR = true;


/**
 * @inheritDoc
 */
ydn.db.core.req.WebsqlCursor.prototype.advance = function(step) {

  var key = this.current_key_;
  var p_key = this.current_primary_key_;
  /**
   * @param {IDBKey=} opt_key
   * @param {IDBKey=} opt_p_key
   * @param {*=} opt_value
   * @this {ydn.db.core.req.WebsqlCursor}
   */
  var on_success = function(opt_key, opt_p_key, opt_value) {
    var same_k = goog.isDefAndNotNull(key) && goog.isDefAndNotNull(opt_key) &&
        ydn.db.cmp(key, opt_key) == 0;
    if (this.isPrimaryCursor()) {
      if (same_k) {
        throw new ydn.debug.error.InternalError(
            'current: ' + key + ' next: ' + opt_key);
      }
    } else {
      var same_p_k = goog.isDefAndNotNull(opt_p_key) &&
          goog.isDefAndNotNull(p_key) &&
          ydn.db.cmp(opt_p_key, p_key) == 0;
      if (same_k && same_p_k) {
        throw new ydn.debug.error.InternalError(
            'current: ' + key + ';' + p_key + ' next: ' +
                opt_key + ';' + opt_p_key);
      }
    }
    this.onSuccess(opt_key, opt_p_key, opt_value);
  };

  goog.asserts.assert(step > 0);

  var inclusive = true;
  if (goog.isDefAndNotNull(this.current_key_) && (this.isPrimaryCursor() ||
      goog.isDefAndNotNull(this.current_primary_key_))) {
    step = step - 1;
    inclusive = false;
  }

  this.continueEffectiveKey_(
      ydn.db.core.req.WebsqlCursor.MONITOR ? on_success : this.onSuccess,
      this.current_key_, inclusive, step,
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
 * Prepare key range SQL.
 * @param {!Array.<string>} params SQL params.
 * @return {ydn.db.schema.Store.SqlParts} SQL statement parts.
 */
ydn.db.core.req.WebsqlCursor.prototype.prepareBaseSql = function(params) {
  var column = this.index_ ? this.index_.getSQLIndexColumnName() :
      this.store_schema_.getSQLKeyColumnName();
  var sql = this.store_schema_.inSql(params, this.query_method,
      column, this.key_range, this.reverse, this.unique);
  return sql;
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

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(transaction, results) {
    if (ydn.db.core.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, results]);
    }
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
    df.setDbValue(error, true);
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
  // console.log(this + ' continuePrimaryKey ' + key);
  var cmp = ydn.db.cmp(key, this.current_primary_key_);
  if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
    throw new ydn.error.InvalidOperationError(this +
        ' to continuePrimaryKey ' +
        ' from ' + this.current_primary_key_ + ' to ' + key +
        ' on ' + this.dir + ' direction is wrong');
  }

  this.continuePrimaryKey_(this.onSuccess, key, true);

};




if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.core.req.WebsqlCursor.prototype.toString = function() {
    return 'WebSql' + goog.base(this, 'toString');
  };
}

