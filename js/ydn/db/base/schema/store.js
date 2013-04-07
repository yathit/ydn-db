/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 24/2/13
 */

goog.provide('ydn.db.schema.Store');

goog.require('ydn.db.schema.Index');
goog.require('ydn.db.KeyRange');


/**
 *
 * @param {string} name table name.
 * @param {(Array.<string>|string)=} keyPath indexedDB keyPath, like
 * 'feed.id.$t'. Default to.
 * @param {boolean=} autoIncrement If true, the object store has a key
 * generator. Defaults to false.
 * @param {string|ydn.db.schema.DataType=} opt_type
 * data type for keyPath. Default to
 * <code>ydn.db.schema.DataType.INTEGER</code> if opt_autoIncrement is
 * <code>true.</code>
 * @param {!Array.<!ydn.db.schema.Index>=} opt_indexes list of indexes.
 * @param {boolean=} dispatch_events if true, storage instance should
 * dispatch event on changes.
 * @param {boolean=} fixed sync with backend server.
 * @param {StoreSyncOptionJson=} sync sync with backend server.
 * @constructor
 */
ydn.db.schema.Store = function(name, keyPath, autoIncrement, opt_type,
                               opt_indexes, dispatch_events, fixed, sync) {

  /**
   * @final
   */
  this.name = name;
  if (!goog.isString(this.name)) {
    throw new ydn.debug.error.ArgumentException('store name must be a string');
  }
  /**
   * @final
   */
  this.keyPath = goog.isDef(keyPath) ? keyPath : null;
  /**
   * @final
   */
  this.isComposite = goog.isArrayLike(this.keyPath);

  if (!goog.isNull(this.keyPath) &&
      !goog.isString(this.keyPath) && !this.isComposite) {
    throw new ydn.debug.error.ArgumentException(
        'keyPath must be a string or array');
  }

  /**
   * IE10 do not reflect autoIncrement, so that make undefined as an option.
   * @final
   * @type {boolean|undefined}
   */
  this.autoIncrement = autoIncrement;

  var type;
  if (goog.isDef(opt_type)) {
    type = ydn.db.schema.Index.toType(opt_type);
    if (!goog.isDef(type)) {
      throw new ydn.debug.error.ArgumentException('type invalid in store: ' +
          this.name);
    }
    if (this.isComposite) {
      throw new ydn.debug.error.ArgumentException(
          'composite key for store "' + this.name + '" must not specified type');
    }
  }

  /**
   * @final
   */
  this.type = goog.isDef(type) ? type : this.autoIncrement ?
      ydn.db.schema.DataType.INTEGER : undefined;

  /**
   * @final
   */
  this.keyPaths = goog.isString(this.keyPath) ? this.keyPath.split('.') : [];
  /**
   * @final
   */
  this.indexes = opt_indexes || [];
  /**
   * @final
   */
  this.dispatch_events = !!dispatch_events;
  /**
   * @final
   */
  this.fixed = !!fixed;
  /**
   * @final
   */
  this.keyColumnType_ = goog.isString(this.type) ?
      this.type : ydn.db.schema.DataType.TEXT;
  /**
   * @final
   */
  this.primary_column_name_ = goog.isArray(this.keyPath) ?
      this.keyPath.join(',') :
      goog.isString(this.keyPath) ?
          this.keyPath :
          ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;

  this.primary_column_name_quoted_ = goog.string.quote(this.primary_column_name_);
};


/**
 * @enum {string}
 */
ydn.db.schema.Store.FetchStrategy = {
  LAST_UPDATED: 'last-updated',
  ASCENDING_KEY: 'ascending-key',
  DESCENDING_KEY: 'descending-key'
};



/**
 * @const
 * @type {Array.<ydn.db.schema.Store.FetchStrategy>}
 */
ydn.db.schema.Store.FetchStrategies = [
  ydn.db.schema.Store.FetchStrategy.LAST_UPDATED,
  ydn.db.schema.Store.FetchStrategy.ASCENDING_KEY,
  ydn.db.schema.Store.FetchStrategy.DESCENDING_KEY];


/**
 * @type {string}
 */
ydn.db.schema.Store.prototype.name;

/**
 * @type {boolean}
 * @private
 */
ydn.db.schema.Store.prototype.isComposite;

/**
 * @type {(!Array.<string>|string)?}
 */
ydn.db.schema.Store.prototype.keyPath;

/**
 * @type {boolean|undefined}
 */
ydn.db.schema.Store.prototype.autoIncrement;

/**
 * @type {ydn.db.schema.DataType|undefined} //
 */
ydn.db.schema.Store.prototype.type;

/**
 * @private
 * @type {ydn.db.schema.DataType}
 */
ydn.db.schema.Store.prototype.keyColumnType_;

/**
 * @protected
 * @type {!Array.<string>}
 */
ydn.db.schema.Store.prototype.keyPaths;

/**
 * @type {!Array.<!ydn.db.schema.Index>}
 */
ydn.db.schema.Store.prototype.indexes;

/**
 * @type {boolean}
 */
ydn.db.schema.Store.prototype.dispatch_events = false;

/**
 * A fixed schema cannot store arbitrary data structure. This is used only
 * in WebSQL. A arbitrery data structure require default blob column.
 * @type {boolean}
 */
ydn.db.schema.Store.prototype.fixed = false;


/**
 * @inheritDoc
 */
ydn.db.schema.Store.prototype.toJSON = function() {

  var indexes = [];
  for (var i = 0; i < this.indexes.length; i++) {
    indexes.push(this.indexes[i].toJSON());
  }

  return {
    'name': this.name,
    'keyPath': this.keyPath,
    'autoIncrement': this.autoIncrement,
    'type': this.type,
    'indexes': indexes
  };
};



/**
 *
 * @param {!StoreSchema} json Restore from json stream.
 * @return {!ydn.db.schema.Store} create new store schema from JSON string.
 */
ydn.db.schema.Store.fromJSON = function(json) {
  if (goog.DEBUG) {
    var fields = ['name', 'keyPath', 'autoIncrement', 'type', 'indexes',
      'dispatchEvents', 'fixed', 'Sync'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown attribute "' +
          key + '"');
      }
    }
  }
  var indexes = [];
  var indexes_json = json.indexes || [];
  if (goog.isArray(indexes_json)) {
    for (var i = 0; i < indexes_json.length; i++) {
      var index = ydn.db.schema.Index.fromJSON(indexes_json[i]);
      if (goog.isDef(index.keyPath) && index.keyPath === json.keyPath) {
        continue; // key do not need indexing.
      }
      indexes.push(index);
    }
  }
  return new ydn.db.schema.Store(json.name, json.keyPath,
      json.autoIncrement, json.type, indexes, json.dispatchEvents, json.fixed,
      json.Sync);
};


/**
 *
 * @enum {number}
 */
ydn.db.schema.Store.QueryMethod = {
  NONE: 0,
  KEYS: 1,
  VALUES: 2,
  COUNT: 3
};


/**
 *
 * @param {!Array} params sql parameter list.
 * @param {ydn.db.schema.Store.QueryMethod} method query method.
 * @param {string|undefined} index_column name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {boolean} unique unique column.
 * @return {string} sql statement.
 */
ydn.db.schema.Store.prototype.toSql = function(params, method, index_column,
    key_range, reverse, unique) {
  var out = this.inSql(params, method, index_column,
      key_range, reverse, unique);
  var sql = '';

  if (method != ydn.db.schema.Store.QueryMethod.NONE) {
    sql += 'SELECT ' + out.select;
  }
  sql += ' FROM ' + out.from;
  if (out.where) {
    sql += ' WHERE ' + out.where;
  }
  if (out.order) {
    sql += ' ORDER BY ' + out.order;
  }

  return sql;
};


/**
 *
 * @param {!Array} params sql parameter list.
 * @param {ydn.db.schema.Store.QueryMethod} method query method.
 * @param {string|undefined} index_column name.
 * @param {IDBKeyRange} key_range to retrieve.
 * @param {boolean} reverse ordering.
 * @param {boolean} unique unique.
 * @return {{
 *   select: string,
 *   from: string,
 *   where: string,
 *   order: string
 * }}
 */
ydn.db.schema.Store.prototype.inSql = function(params, method, index_column,
    key_range, reverse, unique) {

  var out = {
    select: '',
    from: '',
    where: '',
    order: ''
  };
  var key_column = this.primary_column_name_;
  var q_key_column = this.primary_column_name_quoted_;
  var index = null;
  if (index_column !== key_column && goog.isString(index_column)) {
    index = this.getIndex(index_column);
  }
  var is_index = !!index;
  var effective_column = index_column || key_column;
  var q_effective_column = goog.string.quote(effective_column);
  var key_path = is_index ? index.getKeyPath() : this.getKeyPath();
  var type = is_index ? index.getType() : this.getType();
  var is_multi_entry = is_index && index.isMultiEntry();

  out.from = this.getQuotedName();
  if (method != ydn.db.schema.Store.QueryMethod.NONE) {
    out.select = '*';
  }

  var dist = unique ? 'DISTINCT ' : '';

  var wheres = [];

  if (is_multi_entry) {
    var idx_store_name = goog.string.quote(
        ydn.db.con.WebSql.PREFIX_MULTIENTRY +
        this.getName() + ':' + index.getName());

    if (method === ydn.db.schema.Store.QueryMethod.COUNT) {
      out.select = 'COUNT(' + dist +
          idx_store_name + '.' + q_effective_column + ')';
    } else if (method === ydn.db.schema.Store.QueryMethod.KEYS) {
      out.select = this.getQuotedName() + '.' + q_key_column +
          ', ' + idx_store_name + '.' + q_effective_column;
    } else {
      out.select = this.getQuotedName() + '.*';
    }
    out.from = idx_store_name + ' INNER JOIN ' + this.getQuotedName() +
        ' USING (' + q_key_column + ')';
    var col = idx_store_name + '.' + q_effective_column;
    if (goog.isDefAndNotNull(key_range)) {
      ydn.db.KeyRange.toSql(col, type, key_range, wheres, params);
      if (wheres.length > 0) {
        if (out.where) {
          out.where += ' AND ' + wheres.join(' AND ');
        } else {
          out.where = wheres.join(' AND ');
        }
      }
    }
  } else {
    if (method === ydn.db.schema.Store.QueryMethod.COUNT) {
      // primary key is always unqiue.
      out.select = 'COUNT(' + q_key_column + ')';
    } else if (method === ydn.db.schema.Store.QueryMethod.KEYS) {
      out.select = q_key_column;
      if (goog.isDefAndNotNull(index_column) && index_column != key_column) {
        out.select += ', ' + q_effective_column;
      }
    }
    if (goog.isDefAndNotNull(key_range)) {
      ydn.db.KeyRange.toSql(q_effective_column, type, key_range, wheres,
          params);
      if (wheres.length > 0) {
        if (out.where) {
          out.where += ' AND ' + wheres.join(' AND ');
        } else {
          out.where = wheres.join(' AND ');
        }
      }
    }
  }

  var dir = reverse ? 'DESC' : 'ASC';
  out.order = q_effective_column + ' ' + dir;
  if (is_index) {
    out.order += ', ' + q_key_column + ' ' + dir;
  }

  return out;
};


/**
 *
 * @return {!ydn.db.schema.Store} clone this database schema.
 */
ydn.db.schema.Store.prototype.clone = function() {
  return ydn.db.schema.Store.fromJSON(
      /** @type {!StoreSchema} */ (this.toJSON()));
};


/**
 *
 * @return {number}
 */
ydn.db.schema.Store.prototype.countIndex = function() {
  return this.indexes.length;
};


/**
 *
 * @param {number} idx index of index.
 * @return {ydn.db.schema.Index}
 */
ydn.db.schema.Store.prototype.index = function(idx) {
  return this.indexes[idx] || null;
};


/**
 *
 * @param {string} name index name.
 * @return {ydn.db.schema.Index} index if found.
 */
ydn.db.schema.Store.prototype.getIndex = function(name) {
  return /** @type {ydn.db.schema.Index} */ (goog.array.find(this.indexes,
      function(x) {
        return x.name == name;
      }));
};


/**
 * @see #hasIndexByKeyPath
 * @param {string} name index name.
 * @return {boolean} return true if name is found in the index or primary
 * keyPath.
 */
ydn.db.schema.Store.prototype.hasIndex = function(name) {
  if (name == this.keyPath) {
    return true;
  }

  return goog.array.some(this.indexes, function(x) {
    return x.name == name;
  });
};


/**
 * @see #hasIndex
 * @param {string|!Array.<string>} key_path index key path.
 * @return {boolean} return true if key_path is found in the index including
 * primary keyPath.
 */
ydn.db.schema.Store.prototype.hasIndexByKeyPath = function(key_path) {
  if (this.keyPath &&
      goog.isNull(ydn.db.schema.Index.compareKeyPath(this.keyPath, key_path))) {
    return true;
  }
  return goog.array.some(this.indexes, function(x) {
    return goog.isDefAndNotNull(x.keyPath) &&
      goog.isNull(ydn.db.schema.Index.compareKeyPath(x.keyPath, key_path));
  });
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Store.prototype.getSQLKeyColumnNameQuoted = function () {
  return this.primary_column_name_quoted_;
};

/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath. If keyPath is array, they are
 * join by ',' and quoted. If keyPath is not define, default sqlite column
 * name is used.
 */
ydn.db.schema.Store.prototype.getSQLKeyColumnName = function () {
  return this.primary_column_name_;
};


/**
 * @type {string}
 * @private
 */
ydn.db.schema.Store.prototype.primary_column_name_;

/**
 * @type {string}
 * @private
 */
ydn.db.schema.Store.prototype.primary_column_name_quoted_;

//
//
///**
//* Return keyPath. In case undefined return default key column.
//* @return {string} return keyPath or default key column name.
//*/
//ydn.db.schema.Store.prototype.getColumnName = function () {
//  return goog.isArray(this.keyPath) ?
//    goog.string.quote(this.keyPath.join(',')) :
//    goog.isString(this.keyPath) ?
//      this.keyPath : ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
//};


/**
 *
 * @return {string} return quoted name.
 */
ydn.db.schema.Store.prototype.getQuotedName = function() {
  return goog.string.quote(this.name);
};


/**
 * @return {Array.<string>} return name of indexed. It is used as column name
 * in WebSql.
 */
ydn.db.schema.Store.prototype.getColumns = function() {
  if (this.columns_ && this.columns_.length != this.indexes.length) {
    /**
     * @private
     * @final
     * @type {Array.<string>}
     */
    this.columns_ = [];
    for (var i = 0; i < this.indexes.length; i++) {
      this.columns_.push(this.indexes[i].name);
    }
  }
  return this.columns_;
};


/**
 * Create a new update store schema with given guided store schema.
 * NOTE: This is used in websql for checking table schema sniffed from the
 * connection is similar to requested table schema. The fact is that
 * some schema information are not able to reconstruct from the connection,
 * these include:
 *   1. composite index: in which a composite index is blown up to multiple
 *     columns. @see ydn.db.con.WebSql.prototype.prepareTableSchema_.
 * @param {ydn.db.schema.Store} that guided store schema
 * @return {!ydn.db.schema.Store} updated store schema
 */
ydn.db.schema.Store.prototype.hint = function(that) {
  if (!that) {
    return this;
  }
  goog.asserts.assert(this.name == that.name);
  var autoIncrement = this.autoIncrement;
  var keyPath = goog.isArray(this.keyPath) ?
    goog.array.clone(/** @type {goog.array.ArrayLike} */ (this.keyPath)) :
      this.keyPath;
  var type = this.type;
  var indexes = goog.array.map(this.indexes, function (index) {
    return index.clone();
  });
//  if (goog.isArray(that.keyPath)) {
//    // check composite index have blown up
//    keyPath = that.keyPath;
//    for (var i = indexes.length - 1; i >= 0; i--) {
//      if (that.keyPath.indexOf(indexes[i].getKeyPath()) >= 0
//          && !that.hasIndex(indexes[i].getName())) {
//        indexes.splice(i, 1); // blown up index are removed.
//      }
//    }
//  }
  if (!goog.isDef(that.type) && type == 'TEXT') {
    // composite are converted into TEXT
    type = undefined;
  }
  if (goog.isArray(that.keyPath) && goog.isString(keyPath) &&
      keyPath == that.keyPath.join(',')) {
    keyPath = goog.array.clone(
      /** @type {goog.array.ArrayLike} */ (that.keyPath));
  }

  // update composite index
  for (var i = 0, n = that.indexes.length; i < n; i++) {
    if (that.indexes[i].isComposite()) {
      var name = that.indexes[i].getName();
      for (var j = indexes.length - 1; j >= 0; j--) {
        if (name.indexOf(indexes[j].getName()) >= 0) {
          indexes[j] = that.indexes[i].clone();
          break;
        }
      }
    }
  }

  for (var i = 0; i < indexes.length; i++) {
    var that_index = that.getIndex(indexes[i].getName());
    if (that_index) {
      indexes[i] = indexes[i].hint(that_index);
    }
  }

  return new ydn.db.schema.Store(
    that.name, keyPath, autoIncrement, type, indexes);
};


/**
 *
 * @return {string} store name.
 */
ydn.db.schema.Store.prototype.getName = function() {
  return this.name;
};


/**
 *
 * @return {boolean|undefined} autoIncrement
 */
ydn.db.schema.Store.prototype.getAutoIncrement = function() {
  return this.autoIncrement;
};


/**
 *
 * @return {Array.<string>|string?} keyPath
 */
ydn.db.schema.Store.prototype.getKeyPath = function() {
  return this.keyPath;
};


/**
 *
 * @return {boolean} true if inline key is in used.
 */
ydn.db.schema.Store.prototype.usedInlineKey = function() {
  return !!this.keyPath;
};


/**
 *
 * @return {!Array.<string>} list of index names.
 */
ydn.db.schema.Store.prototype.getIndexNames = function() {
  return this.indexes.map(function(x) {return x.name;});
};


/**
 *
 * @return {ydn.db.schema.DataType|undefined}
 */
ydn.db.schema.Store.prototype.getType = function() {
  return this.type;
};


/**
 *
 * @return {ydn.db.schema.DataType}
 */
ydn.db.schema.Store.prototype.getSqlType = function() {
  return this.keyColumnType_;
};


/**
 *
 * @return {!Array.<string>} list of index keyPath.
 */
ydn.db.schema.Store.prototype.getIndexKeyPaths = function() {
  return this.indexes.map(function(x) {return x.keyPath;});
};


/**
 *
 * @param {string} name column name or keyPath.
 * @param {ydn.db.schema.DataType=} opt_type optional column data type.
 * @param {boolean=} opt_unique unique.
 * @param {boolean=} opt_multiEntry true for array index to index individual
 * element.
 */
ydn.db.schema.Store.prototype.addIndex = function(name, opt_unique, opt_type,
                                                  opt_multiEntry) {
  this.indexes.push(new ydn.db.schema.Index(name, opt_type, opt_unique,
      opt_multiEntry));
};

//
///**
// * Extract value of keyPath from a given object.
// * @see #getKeyValue
// * @param {!Object} obj object to extract from.
// * @return {!Array|number|string|undefined} return key value.
// */
//ydn.db.schema.Store.prototype.getKeyValue = function(obj) {
//  // http://www.w3.org/TR/IndexedDB/#key-construct
//  if (!goog.isObject(obj)) {
//    return undefined;
//  } else if (goog.isArrayLike(this.keyPath)) {
//    var key = [];
//    for (var i = 0, n = this.keyPath.length; i < n; i++) {
//      key[i] = obj[this.keyPath[i]];
//    }
//    return key;
//  } else if (this.usedInlineKey()) {
//    return /** @type {string} */ (goog.object.getValueByKeys(obj,
//      this.keyPaths));
//  }
//};



/**
 * Extract primary key value of keyPath from a given object.
 * @param {!Object} record record value
 * @return {!IDBKey|undefined} extracted primary key
 */
ydn.db.schema.Store.prototype.extractKey = function(record) {
  // http://www.w3.org/TR/IndexedDB/#key-construct
  if (this.isComposite) {
    var arr = [];
    for (var i = 0; i < this.keyPath.length; i++) {
      arr.push(ydn.db.utils.getValueByKeys(record, this.keyPath[i]));
    }
    return arr;
  } else if (this.keyPath) {
    return /** @type {!IDBKey} */ (goog.object.getValueByKeys(
      record, this.keyPaths));
  } else {
    return undefined;
  }
};


/**
 * Extract value of keyPath from a row of SQL results
 * @param {!Object} obj record value.
 * @return {!Array|number|string|undefined} return key value.
 */
ydn.db.schema.Store.prototype.getRowValue = function(obj) {
  if (goog.isDefAndNotNull(this.keyPath)) {
    var value = obj[this.keyPath];
    if (this.type == ydn.db.schema.DataType.DATE) {
      value = Date.parse(value);
    } else if (this.type == ydn.db.schema.DataType.NUMERIC) {
      value = parseFloat(value);
    } else if (this.type == ydn.db.schema.DataType.INTEGER) {
      value = parseInt(value, 10);
    }
    return value;
  } else {
    return undefined;
  }
};


/**
 * Generated a key starting from 0 with increment of 1.
 * NOTE: Use only by simple store.
 * @return {number} generated key.
 */
ydn.db.schema.Store.prototype.generateKey = function() {
  if (!goog.isDef(this.current_key_)) {

    /**
     * @type {number}
     * @private
     */
    this.current_key_ = 0;
  }
  return this.current_key_++;
};


/**
 * Set keyPath field of the object with given value.
 * @see #getKeyValue
 * @param {!Object} obj get key value from its keyPath field.
 * @param {*} value key value to set.
 */
ydn.db.schema.Store.prototype.setKeyValue = function(obj, value) {

  for (var i = 0; i < this.keyPaths.length; i++) {
    var key = this.keyPaths[i];

    if (i == this.keyPaths.length - 1) {
      obj[key] = value;
      return;
    }

    if (!goog.isDef(obj[key])) {
      obj[key] = {};
    }
    obj = obj[key];
  }
};


/**
 * @define {string} default key-value store name.
 */
ydn.db.schema.Store.DEFAULT_TEXT_STORE = 'default_text_store';


/**
 * This is for WebSQL.
 * @param {!Object} obj get values of indexed fields.
 * @param {IDBKey=} opt_key optional key.
 * @return {{
 *    columns: Array.<string>,
 *    slots: Array.<string>,
 *    values: Array.<string>,
 *    key: (IDBKey|undefined)
 *  }} return list of values as it appear on the indexed fields.
 */
ydn.db.schema.Store.prototype.getIndexedValues = function(obj, opt_key) {

  // since corretness of the inline, offline, auto are already checked,
  // here we don't check again. this method should not throw error for
  // these reason. If error must be throw it has to be InternalError.

  var values = [];
  var columns = [];

  var key = goog.isDef(opt_key) ? opt_key : this.extractKey(obj);
  if (goog.isDef(key)) {
    columns.push(this.getSQLKeyColumnNameQuoted());
    values.push(ydn.db.schema.Index.js2sql(key, this.getType()));
  }

  for (var i = 0; i < this.indexes.length; i++) {
    var index = this.indexes[i];
    if (index.isMultiEntry() ||
        index.name === this.keyPath ||
        index.name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
      continue;
    }

    var idx_key = index.extractKey(obj);
    if (goog.isDefAndNotNull(idx_key)) {
      values.push(ydn.db.schema.Index.js2sql(idx_key, index.getType()));
      columns.push(index.getSQLIndexColumnNameQuoted());
    }
  }

  if (!this.fixed) {
    values.push(ydn.json.stringify(obj));
    columns.push(ydn.db.base.DEFAULT_BLOB_COLUMN);
  }

  var slots = [];
  for (var i = values.length - 1; i >= 0; i--) {
    slots[i] = '?';
  }

  return {
    columns: columns,
    slots: slots,
    values: values,
    key: key
  };
};


/**
 * Compare two stores.
 * @see #similar
 * @param {ydn.db.schema.Store} store store schema to test.
 * @return {boolean} true if store schema is exactly equal to this schema.
 */
ydn.db.schema.Store.prototype.equals = function(store) {
  return this.name === store.name &&
      ydn.object.equals(this.toJSON(), store.toJSON());
};


/**
 * Compare two stores.
 * @see #equals
 * @param {ydn.db.schema.Store} store
 * @return {string} explination for difference, empty string for similar.
 */
ydn.db.schema.Store.prototype.difference = function(store) {

  if (!store) {
    return 'missing store: ' + this.name;
  }
  if (this.name != store.name) {
    return 'store name, expect: ' + this.name + ', but: ' + store.name;
  }
  var msg = ydn.db.schema.Index.compareKeyPath(this.keyPath, store.keyPath);
  if (msg) {
    return 'keyPath, ' + msg;
  }
  if (goog.isDef(this.autoIncrement) && goog.isDef(store.autoIncrement) &&
      this.autoIncrement != store.autoIncrement) {
    return 'autoIncrement, expect:  ' + this.autoIncrement + ', but: ' +
        store.autoIncrement;
  }
  if (this.indexes.length != store.indexes.length) {
    return 'indexes length, expect:  ' + this.indexes.length + ', but: ' +
        store.indexes.length;
  }

  if (goog.isDef(this.type) && goog.isDef(store.type) &&
    (goog.isArrayLike(this.type) ? !goog.array.equals(
      /** @type {goog.array.ArrayLike} */ (this.type),
      /** @type {goog.array.ArrayLike} */ (store.type)) :
      this.type != store.type)) {
    return 'data type, expect:  ' + this.type + ', but: ' + store.type;
  }
  for (var i = 0; i < this.indexes.length; i++) {
    var index = store.getIndex(this.indexes[i].name);
    var index_msg = this.indexes[i].difference(index);
    if (index_msg.length > 0) {
      return 'index "' + this.indexes[i].name + '" ' + index_msg;
    }
  }

  return '';
};


/**
 *
 * @param {ydn.db.schema.Store} store schema.
 * @return {boolean} true if given store schema is similar to this.
 */
ydn.db.schema.Store.prototype.similar = function(store) {
  return this.difference(store).length == 0;
};


/**
 * @enum {string}
 */
ydn.db.schema.Store.SyncMethod = {
  ADD: 'add',
  GET: 'get',
  PUT: 'put',
  REMOVE: 'rm',
  LIST: 'li'
};


/**
 * Database hook to call before persisting into the database.
 * Override this function to attach the hook. The default implementation is
 * immediately invoke the given callback with first variable argument.
 * @param {ydn.db.schema.Store.SyncMethod} method
 * @param {{
   *   index: (string?|undefined),
   *   limit: (number|undefined),
   *   offset: (number|undefined),
   *   reverse: (boolean|undefined)
   * }}  opt
 * @param {Function} callback
 * @param {...} varargin
 */
ydn.db.schema.Store.prototype.preHook = function(method, opt, callback,
                                                 varargin) {
  callback(varargin);
};


/**
 * Database hook to call before after retrieval into the database.
 * Override this function to attach the hook. The default implementation is
 * immediately invoke the given callback with first variable argument.
 * @param {ydn.db.schema.Store.SyncMethod} method
 * @param {{
   *   index: (string|undefined),
   *   limit: (number|undefined),
   *   offset: (number|undefined),
   *   reverse: (boolean|undefined)
   * }}  opt
 * @param {Function} callback
 * @param {...} varargin
 */
ydn.db.schema.Store.prototype.postHook = function(method, opt, callback,
                                                  varargin) {
  callback(varargin);
};

