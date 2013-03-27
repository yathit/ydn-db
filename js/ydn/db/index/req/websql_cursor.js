/**
 * @fileoverview Cursor.
 */


goog.provide('ydn.db.index.req.WebsqlCursor');
goog.require('ydn.db.index.req.AbstractCursor');
goog.require('ydn.db.index.req.ICursor');


/**
 * Open an index. This will resume depending on the cursor state.
 * @param {SQLTransaction|IDBTransaction|ydn.db.con.SimpleStorage} tx
 * @param {number} tx_no tx no
 * @param {!ydn.db.schema.Store} store_schema schema.
 * @param {string} store_name the store name to open.
 * @param {string|undefined} index_name index
 * @param {IDBKeyRange} keyRange
 * @param {ydn.db.base.Direction} direction we are using old spec
 * @param {boolean} key_only mode.
 * @extends {ydn.db.index.req.AbstractCursor}
 * @implements {ydn.db.index.req.ICursor}
 * @constructor
 */
ydn.db.index.req.WebsqlCursor = function(tx, tx_no, store_schema, store_name,
       index_name, keyRange, direction, key_only) {

  goog.base(this, tx, tx_no, store_name, index_name, keyRange, direction, key_only);

  goog.asserts.assert(store_schema);
  this.store_schema_ = store_schema;

  this.current_cursor_offset_ = 0;

  //this.openCursor(ini_key, ini_index_key);
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
 * @type {!Array.<string>|string|undefined}
 */
ydn.db.index.req.WebsqlCursor.prototype.index_key_path;


/**
 *
 * @type {!ydn.db.schema.Store}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.store_schema_;

/**
 *
 * @type {*}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.ini_key_ = null;


/**
 *
 * @type {*}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.ini_primary_key_ = null;


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
 * @type {number}
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.current_cursor_offset_ = NaN;



/**
 * This must call only when cursor is active.
 * @return {*} return current index key.
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.getIndexKey = function() {

  return this.current_key_;

};


/**
 * This must call only when cursor is active.
 * @return {*} return current primary key.
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.getPrimaryKey = function () {
  return this.current_primary_key_;
};


/**
 * This must call only when cursor is active.
 * @return {*} return current primary key.
 * @override
 */
ydn.db.index.req.WebsqlCursor.prototype.getValue = function () {
  return this.current_value_;
};


/**
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @param {boolean=} exclusive
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.openCursor = function(ini_key, ini_index_key, exclusive) {

};


/**
 * Move cursor to the position as defined.
 * @param {?function (key, primary_key, value)} callback invoke with this context
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.move_ = function(callback) {

  /**
   * @type {ydn.db.index.req.WebsqlCursor}
   */
  var me = this;
  var request;
  var sqls = ['SELECT'];
  var params = [];
  var primary_column_name = this.store_schema_.getSQLKeyColumnName();
  var q_primary_column_name = goog.string.quote(primary_column_name);
  var is_index = !!this.index_name;
  var index = is_index ?
    this.store_schema_.getIndex(this.index_name) : null;
  var type = index ? index.getType() : this.store_schema_.getType();

  var effective_col_name = index ?
    index.getSQLIndexColumnName() : primary_column_name;
  var q_effective_col_name = goog.string.quote(effective_col_name);

  var order =  ' ORDER BY ';

  if (this.key_only) {
    if (is_index) {
      goog.asserts.assertString(effective_col_name);
      sqls.push(goog.string.quote(effective_col_name) + ', ' + q_primary_column_name);
      order += this.reverse ?
        goog.string.quote(effective_col_name) + ' DESC, ' +
          q_primary_column_name + ' DESC ' :
        goog.string.quote(effective_col_name) + ' ASC, ' +
          q_primary_column_name + ' ASC ';
    } else {
      sqls.push(q_primary_column_name);
      order += q_primary_column_name;
      order += this.reverse ? ' DESC' : ' ASC';
    }
  } else {
    sqls.push('*');
    if (is_index) {
      goog.asserts.assertString(effective_col_name);
      order += this.reverse ?
        goog.string.quote(effective_col_name) + ' DESC, ' +
          q_primary_column_name + ' DESC ' :
        goog.string.quote(effective_col_name) + ' ASC, ' +
          q_primary_column_name + ' ASC ' ;

    } else {
      order += q_primary_column_name;
      order += this.reverse ? ' DESC' : ' ASC';
    }

  }

  sqls.push('FROM ' + goog.string.quote(this.store_name));

  var wheres = [];
  var is_multi_entry = !!index && index.isMultiEntry();

  var key_range = this.key_range;
  if (goog.isDefAndNotNull(this.ini_key_)) {
    if (!!this.index_name) {
      goog.asserts.assert(goog.isDefAndNotNull(this.ini_index_key_));
      if (goog.isDefAndNotNull(this.key_range)) {
        key_range = ydn.db.IDBKeyRange.bound(this.ini_index_key_,
          this.key_range.upper, false, this.key_range.upperOpen);
      } else {
        key_range = ydn.db.IDBKeyRange.lowerBound(this.ini_index_key_);
      }

      ydn.db.KeyRange.toSql(q_effective_col_name, type,
        is_multi_entry, key_range, wheres, params);
    } else {
      if (this.reverse) {
        key_range = ydn.db.IDBKeyRange.upperBound(this.ini_key_, false);
      } else {
        key_range = ydn.db.IDBKeyRange.lowerBound(this.ini_key_, false);
      }
      ydn.db.KeyRange.toSql(q_primary_column_name, type,
        false, key_range, wheres, params);
    }
  } else {
    ydn.db.KeyRange.toSql(q_effective_col_name, type,
      is_multi_entry, key_range, wheres, params);
  }


  if (wheres.length > 0) {
    sqls.push('WHERE ' + wheres.join(' AND '));
  }

  sqls.push('LIMIT 1'); // cursor move only one step at a time.
  if (this.current_cursor_offset_ > 0) {
    sqls.push('OFFSET ' + this.current_cursor_offset_);
  }

  sqls.push(order);

//  if (this.key_only) {
//    sqls.push(' LIMIT ' + 100);
//  } else {
//    sqls.push(' LIMIT ' + 1);
//  }

  this.has_pending_request = true;

  /**
   * @param {SQLTransaction} transaction transaction.
   * @param {SQLResultSet} results results.
   */
  var onSuccess = function(transaction, results) {
    if (ydn.db.index.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, results]);
    }
    me.has_pending_request = false;

    me.current_key_ = undefined;
    me.current_primary_key_ = undefined;
    me.current_value_ = undefined;
    if (results.rows.length > 0) {
      var row = /** @type {!Object} */ (results.rows.item(0));
      me.current_primary_key_ = ydn.db.schema.Index.sql2js(row[primary_column_name],
        type, false);
      me.current_key_ = is_index ? ydn.db.schema.Index.sql2js(row[effective_col_name],
        type, is_multi_entry) : me.current_primary_key_;
      me.current_value_ = me.key_only ? me.current_primary_key_ :
        ydn.db.crud.req.WebSql.parseRow(row, me.store_schema_);
    }

    callback.call(me, me.current_key_, me.current_primary_key_, me.current_value_);
    callback = null;
  };

  /**
   * @param {SQLTransaction} tr transaction.
   * @param {SQLError} error error.
   * @return {boolean} true to roll back.
   */
  var onError = function(tr, error) {
    if (ydn.db.index.req.WebsqlCursor.DEBUG) {
      window.console.log([sql, tr, error]);
    }
    me.has_pending_request = false;
    me.logger.warning('get error: ' + error.message);
    me.onError(/** @type {Error} */ (error));
    me.current_key_ = undefined;
    me.current_primary_key_ = undefined;
    me.current_value_ = undefined;
    callback.call(me, me.current_key_, me.current_primary_key_, me.current_value_);
    callback = null;
    return false;

  };

  var sql = sqls.join(' ');

  me.logger.finest(this + ': move: ' + ' SQL: ' +
    sql + ' : ' + ydn.json.stringify(params));
  this.tx.executeSql(sql, params, onSuccess, onError);

};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.hasCursor = function() {
  return this.isActive() && this.current_cursor_offset_ >= 0;
};




/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.clear = function(idx) {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }

  if (idx) {
    throw new ydn.error.NotImplementedException();
  } else {
    var df = new goog.async.Deferred();
    var me = this;
    this.has_pending_request = true;

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var onSuccess = function(transaction, results) {
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
        window.console.log([sql, results]);
      }
      me.has_pending_request = false;
      me.logger.finer('success: ' + msg);
      df.callback(results.rowsAffected);
    };

    /**
     * @param {SQLTransaction} tr transaction.
     * @param {SQLError} error error.
     * @return {boolean} true to roll back.
     */
    var onError = function(tr, error) {
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
        window.console.log([sql, tr, error]);
      }
      me.has_pending_request = false;
      me.logger.warning('error: ' + msg + ' ' + error.message);
      df.errback(error);
      return true; // roll back

    };

    var primary_column_name = this.store_schema_.getSQLKeyColumnName();
    var sql = 'DELETE FROM ' + this.store_schema_.getQuotedName() +
      ' WHERE ' + primary_column_name + ' = ?';
    var params = [this.getPrimaryKey()];
    var msg = this + ': clear "' + sql + '" : ' + ydn.json.stringify(params);
    me.logger.finest(msg);
    this.tx.executeSql(sql, params, onSuccess, onError);
    return df;
  }
};

/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.update = function(obj, idx) {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }

  if (idx) {
    throw new ydn.error.NotImplementedException();
  } else {
    var df = new goog.async.Deferred();
    var me = this;
    this.has_pending_request = true;
    var primary_key = /** @type {!Array|number|string} */(this.getPrimaryKey());

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var onSuccess = function(transaction, results) {
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
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
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
        window.console.log([sql, tr, error]);
      }
      me.has_pending_request = false;
      me.logger.warning('get error: ' + error.message);
      df.errback(error);
      return false;
    };

    goog.asserts.assertObject(obj);
    var out = me.store_schema_.getIndexedValues(obj, primary_key);

    var sql = 'REPLACE INTO ' + this.store_schema_.getQuotedName()+
      ' (' + out.columns.join(', ') + ')' +
      ' VALUES (' + out.slots.join(', ') + ')' +
      ' ON CONFLICT FAIL';

    me.logger.finest(this + ': clear "' + sql + '" : ' + ydn.json.stringify(out.values));
    this.tx.executeSql(sql, out.values, onSuccess, onError);
    return df;
  }
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.advance = function(step) {

  this.current_cursor_offset_ += step;
  this.move_(this.onNext);

};



/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.continueEffectiveKey = function(key) {
  if (!this.hasCursor()) {
    throw new ydn.error.InvalidOperationError(this + ' cursor gone.');
  }
  if (!goog.isDefAndNotNull(key)) {
    this.advance(1);
    return;
  }

  this.ini_key_ = null;
  this.ini_index_key_ = key;
  this.move_(this.onNext);
};






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
 * Make cursor opening request.
 *
 * This will seek to given initial position if given. If only ini_key (primary
 * key) is given, this will rewind, if not found.
 *
 * @param {*=} ini_key primary key to resume position.
 * @param {*=} ini_index_key index key to resume position.
 * @param {boolean=} exclusive
 * @private
 */
ydn.db.index.req.WebsqlCursor.prototype.openCursor = function(ini_key, ini_index_key, exclusive) {
  this.ini_key_ = ini_key;
  this.ini_index_key_ = ini_index_key;
  if (exclusive) {
    this.current_cursor_offset_++;
  }
  this.move_(this.onNext);
};



/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.clear = function(idx) {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }

  if (idx) {
    throw new ydn.error.NotImplementedException();
  } else {
    var df = new goog.async.Deferred();
    var me = this;
    this.has_pending_request = true;

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var onSuccess = function(transaction, results) {
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
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
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
        window.console.log([sql, tr, error]);
      }
      me.has_pending_request = false;
      me.logger.warning('get error: ' + error.message);
      df.errback(error);
      return true; // roll back

    };

    var primary_column_name = this.store_schema_.getSQLKeyColumnName();
    var sql = 'DELETE FROM ' + this.store_schema_.getQuotedName() +
        ' WHERE ' + primary_column_name + ' = ?';
    var params = [this.getPrimaryKey()];
    me.logger.finest(this + ': clear "' + sql + '" : ' + ydn.json.stringify(params));
    this.tx.executeSql(sql, params, onSuccess, onError);
    return df;
  }
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.update = function(obj, idx) {

  if (!this.hasCursor()) {
    throw new ydn.db.InvalidAccessError();
  }

  if (idx) {
    throw new ydn.error.NotImplementedException();
  } else {
    var df = new goog.async.Deferred();
    var me = this;
    this.has_pending_request = true;
    var primary_key = /** @type {!Array|number|string} */(this.getPrimaryKey());

    /**
     * @param {SQLTransaction} transaction transaction.
     * @param {SQLResultSet} results results.
     */
    var onSuccess = function(transaction, results) {
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
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
      if (ydn.db.index.req.WebsqlCursor.DEBUG) {
        window.console.log([sql, tr, error]);
      }
      me.has_pending_request = false;
      me.logger.warning('get error: ' + error.message);
      df.errback(error);
      return true; // roll back
    };

    goog.asserts.assertObject(obj);
    var out = me.store_schema_.getIndexedValues(obj, primary_key);

    var sql = 'REPLACE INTO ' + this.store_schema_.getQuotedName()+
        ' (' + out.columns.join(', ') + ')' +
        ' VALUES (' + out.slots.join(', ') + ')' +
        ' ON CONFLICT FAIL';

    me.logger.finest(this + ': clear "' + sql + '" : ' + ydn.json.stringify(out.values));
    this.tx.executeSql(sql, out.values, onSuccess, onError);
    return df;
  }
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.restart = function(effective_key, primary_key) {
  this.logger.finest(this + ' restarting.');
  this.openCursor(primary_key, effective_key, true);
};


/**
 * @inheritDoc
 */
ydn.db.index.req.WebsqlCursor.prototype.continuePrimaryKey = function (key) {
  if (!this.hasCursor()) {
    throw new ydn.error.InvalidOperationError(this + ' cursor gone.');
  }
  if (!goog.isDefAndNotNull(this.current_primary_key_)) {
    this.onSuccess(undefined, undefined, undefined);
    return;
  }
  var cmp = ydn.db.cmp(key, this.current_primary_key_);
  if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
    throw new ydn.error.InvalidOperationError(this + ' wrong direction.');
  }

  if (cmp == 0 || (cmp == 1 && this.reverse) || (cmp == -1 && !this.reverse)) {
    this.onSuccess(this.current_primary_key_, this.current_key_, this.current_value_);
    return;
  }

  this.current_cursor_offset_++;
  this.move_(function() {
    this.continuePrimaryKey(key);
  });

};





