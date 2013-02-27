/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 24/2/13
 */

goog.provide('ydn.db.schema.Store');

goog.require('ydn.db.schema.Index');




/**
 *
 * @param {string} name table name.
 * @param {string=} keyPath indexedDB keyPath, like 'feed.id.$t'. Default to.
 * @param {boolean=} autoIncrement If true, the object store has a key
 * generator. Defaults to false.
 * @param {!Array.<ydn.db.schema.DataType>|string|ydn.db.schema.DataType=} opt_type data type for keyPath. Default to
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
  if (!goog.isNull(this.keyPath) &&
      !goog.isString(this.keyPath) && !goog.isArrayLike(this.keyPath)) {
    throw new ydn.debug.error.ArgumentException('keyPath must be a string or array');
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
  }

  /**
   * @final
   */
  this.type = goog.isDef(type) ? type : this.autoIncrement ?
      ydn.db.schema.DataType.INTEGER : undefined;

  if (this.autoIncrement) {
    var sqlite_msg = 'AUTOINCREMENT is only allowed on an INTEGER PRIMARY KEY';
    goog.asserts.assert(this.type == ydn.db.schema.DataType.INTEGER,
        sqlite_msg);
  }

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
  ydn.db.schema.Store.FetchStrategy.DESCENDING_KEY];


/**
 * @type {string}
 */
ydn.db.schema.Store.prototype.name;

/**
 * @type {string?}
 */
ydn.db.schema.Store.prototype.keyPath;

/**
 * @type {boolean|undefined}
 */
ydn.db.schema.Store.prototype.autoIncrement;

/**
 * @type {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined} //
 */
ydn.db.schema.Store.prototype.type;

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
 *
 * @param {ydn.db.schema.Store.FetchStrategy|ydn.db.schema.Store.SyncMethod} strategy
 * @param {{
   *   index: (string?|undefined),
   *   offset: number,
   *   reverse: boolean
   * }=}  opt
 * @return {boolean}
 */
ydn.db.schema.Store.prototype.toSync = function(strategy, opt) {
  return false;
};


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
      'dispatchEvents', 'fixed', 'sync'];
    for (var key in json) {
      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
        throw new ydn.debug.error.ArgumentException('Unknown attribute "' + key + '"');
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
      json.sync);
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
 *
 * @param {string} name index name.
 * @return {boolean} return true if name is found in the index, including
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
 * @return {string|undefined} return quoted keyPath.
 */
ydn.db.schema.Store.prototype.getQuotedKeyPath = function() {
  return goog.isString(this.keyPath) ?
      goog.string.quote(this.keyPath) : undefined;
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath.
 */
ydn.db.schema.Store.prototype.getSQLKeyColumnName = function() {
  return goog.isString(this.keyPath) ?
      goog.string.quote(this.keyPath) : ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
};


/**
 * Return keyPath. In case undefined return default key column.
 * @return {string} return keyPath or default key column name.
 */
ydn.db.schema.Store.prototype.getColumnName = function() {
  return goog.isString(this.keyPath) ?
      this.keyPath : ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;
};


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
 * @return {string?} keyPath
 */
ydn.db.schema.Store.prototype.getKeyPath = function() {
  return this.keyPath;
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
 * @return {!Array.<ydn.db.schema.DataType>|ydn.db.schema.DataType|undefined}
 */
ydn.db.schema.Store.prototype.getType = function() {
  return this.type;
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


/**
 * Extract value of keyPath from a given object.
 * @see #getKeyValue
 * @param {!Object} obj object to extract from.
 * @return {!Array|number|string|undefined} return key value.
 */
ydn.db.schema.Store.prototype.getKeyValue = function(obj) {
  // http://www.w3.org/TR/IndexedDB/#key-construct
  return /** @type {string} */ (goog.object.getValueByKeys(obj, this.keyPaths));
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
 * @param {(!Array|string|number)=} opt_key optional key.
 * @return {{
 *    columns: Array.<string>,
 *    slots: Array.<string>,
 *    values: Array.<string>,
 *    key: (!Array|string|number|undefined)
 *  }} return list of values as it appear on the indexed fields.
 */
ydn.db.schema.Store.prototype.getIndexedValues = function(obj, opt_key) {

  // since corretness of the inline, offline, auto are already checked,
  // here we don't check again. this method should not throw error for
  // these reason. If error must be throw it has to be InternalError.

  var key_column;
  var values = [];

  var normalized_key;
  var key = goog.isDef(opt_key) ? opt_key :
      goog.isString(this.keyPath) ? this.getKeyValue(obj) : undefined;
  var columns = [];
  if (goog.isDef(key)) {
    columns = goog.isDefAndNotNull(this.keyPath) ? [this.getQuotedKeyPath()] :
        [ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME];
    values = [ydn.db.schema.Index.js2sql(key, this.type)];
  }

  for (var i = 0; i < this.indexes.length; i++) {
    var index = this.indexes[i];
    if (index.name == this.keyPath ||
        index.name == ydn.db.base.DEFAULT_BLOB_COLUMN) {
      continue;
    }

    var key_path = index.keyPath;
    if (goog.isDef(key_path)) {
      var type = index.type;
      if (goog.isArray(key_path)) {
        for(var j = 0; j < key_path.length; j++) {
          if (goog.isDef(obj[key_path[j]])) {
            if (index.isMultiEntry()) {
              values.push(ydn.db.schema.Index.js2sql(obj[key_path[j]], [type[j]]));
            } else {
              values.push(ydn.db.schema.Index.js2sql(obj[key_path[j]], type[j]));
            }
            columns.push(goog.string.quote(key_path[j]));
          }
        }
      } else {
        if (goog.isDef(obj[key_path])) {
          if (index.isMultiEntry()) {
            values.push(ydn.db.schema.Index.js2sql(obj[key_path], [type]));
          } else {
            values.push(ydn.db.schema.Index.js2sql(obj[key_path], type));
          }
          columns.push(goog.string.quote(key_path));
        }
      }
    }

  }

  if (!this.fixed) {
    var data = {};
    for (var item in obj) {
      if (obj.hasOwnProperty(item) && !this.hasIndex(item)) {
        data[item] = obj[item];
      }
    }

    values.push(ydn.json.stringify(data));
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
  if (this.keyPath != store.keyPath) {
    return 'keyPath, expect:  ' + this.keyPath + ', but: ' + store.keyPath;
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
      this.type != store.type) {
    return 'data type, expect:  ' + this.type + ', but: ' + store.type;
  }
  for (var i = 0; i < this.indexes.length; i++) {
    var index = store.getIndex(this.indexes[i].name);
    var msg = this.indexes[i].difference(index);
    if (msg.length > 0) {
      return 'index "' + this.indexes[i].name + '" ' + msg;
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
  CLEAR: 'cl',
  LIST_BY_ASCENDING_KEY: 'la',
  LIST_BY_DESCENDING_KEY: 'ld',
  LIST_BY_UPDATED: 'lu'
};

