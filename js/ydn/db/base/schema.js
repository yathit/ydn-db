/**
 * @fileoverview Database schema.
 *
 * This data structure is immutable.
 */


goog.provide('ydn.db.DataType');
goog.provide('ydn.db.DatabaseSchema');
goog.provide('ydn.db.IndexSchema');
goog.provide('ydn.db.StoreSchema');


/**
 * Data type for field in object store. This is required to compatible between
 * IndexedDB and SQLite.
 * SQLite mandate COLUMN field specified data type.
 * IndexedDB allow Array as data type in key, while SQLite is not to use.
 * @see http://www.w3.org/TR/IndexedDB/#key-construct
 * @see http://www.sqlite.org/lang_expr.html
 * @enum {string}
 */
ydn.db.DataType = {
  TEXT: 'TEXT',
  FLOAT: 'REAL',
  INTEGER: 'INTEGER',
  ARRAY: 'ARRAY' // out of tune here
};


/**
 *
 * @param {string} name store (table) name.
 * @param {boolean=} opt_unique unique.
 * @param {ydn.db.DataType=} opt_type default to TEXT.
 * @constructor
 */
ydn.db.IndexSchema = function(name, opt_unique, opt_type) {
  /**
   * @final
   * @type {string}
   */
  this.name = name;
  /**
   * @final
   * @type {ydn.db.DataType}
   */
  this.type = opt_type || ydn.db.DataType.TEXT;
  /**
   * @final
   * @type {boolean}
   */
  this.unique = !!opt_unique;
};


/**
 * @inheritDoc
 */
ydn.db.IndexSchema.prototype.toJSON = function() {
  return {
    'name': this.name,
    'type': this.type,
    'unique': this.unique
  };
};


/**
 *
 * @param {Object} json object in json format.
 * @return {ydn.db.IndexSchema} created from input json string.
 */
ydn.db.IndexSchema.fromJSON = function(json) {
  return new ydn.db.IndexSchema(json['name'], json['unique'], json['type']);
};


/**
 *
 * @param {string} name table name.
 * @param {string=} keyPath indexedDB keyPath, like 'feed.id.$t'. Default to.
 * @param {boolean=} opt_autoIncrement If true, the object store has a key
 * generator. Defaults to false.
 * @param {ydn.db.DataType=} opt_type data type for keyPath. Default to
 * <code>ydn.db.DataType.INTEGER</code> if opt_autoIncrement is
 * <code>true</code>
 * @param {!Array.<!ydn.db.IndexSchema>=} opt_indexes list of indexes.
 * @constructor
 */
ydn.db.StoreSchema = function(name, keyPath, opt_autoIncrement, opt_type, opt_indexes) {

  /**
   * @final
   * @type {string}
   */
  this.name = name;
  if (!goog.isString(this.name)) {
    throw new ydn.error.ArgumentException('store name must be a string');
  }
  /**
   * @final
   * @type {string|undefined}
   */
  this.keyPath = keyPath;
  if (goog.isDef(this.keyPath) && !goog.isString(this.name)) {
    throw new ydn.error.ArgumentException('keyPath must be a string');
  }

  /**
   * @final
   * @type {boolean}
   */
  this.autoIncrement = !!opt_autoIncrement;

  /**
   * @final
   * @type {ydn.db.DataType}
   */
  this.type = opt_type ? opt_type : this.autoIncrement ?
    ydn.db.DataType.INTEGER : ydn.db.DataType.TEXT;
  if (!goog.isString(this.type)) {
    throw new ydn.error.ArgumentException('type invalid in store: ' + this.name);
  }

  /**
   * @final
   * @type {!Array.<string>}
   */
  this.keyPaths = goog.isDef(this.keyPath) ? this.keyPath.split('.') : [];
  /**
   * @final
   * @type {!Array.<!ydn.db.IndexSchema>}
   */
  this.indexes = opt_indexes || [];
};


/**
 * @inheritDoc
 */
ydn.db.StoreSchema.prototype.toJSON = function() {

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
 * @param {!Object} json Restore from json stream.
 * @return {!ydn.db.StoreSchema} create new store schema from JSON string.
 */
ydn.db.StoreSchema.fromJSON = function(json) {
  var indexes = [];
  var indexes_json = json['indexes'] || [];
  if (goog.isArray(indexes_json)) {
    for (var i = 0; i < indexes_json.length; i++) {
      indexes.push(ydn.db.IndexSchema.fromJSON(indexes_json[i]));
    }
  }
  return new ydn.db.StoreSchema(json['name'], json['keyPath'],
    json['autoIncrement'], json['type'], indexes);
};


/**
 *
 * @param {string} name index name.
 * @return {ydn.db.IndexSchema} index if found.
 */
ydn.db.StoreSchema.prototype.getIndex = function(name) {
  return /** @type {ydn.db.IndexSchema} */ (goog.array.find(this.indexes,
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
ydn.db.StoreSchema.prototype.hasIndex = function(name) {
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
ydn.db.StoreSchema.prototype.getQuotedKeyPath = function() {
  return goog.isDef(this.keyPath) ? goog.string.quote(this.keyPath) : undefined;
};


/**
 * Return quoted keyPath. In case undefined return default key column.
 * @return {string} return quoted keyPath.
 */
ydn.db.StoreSchema.prototype.getSQLKeyColumnName = function() {
  return goog.isDef(this.keyPath) ?
    goog.string.quote(this.keyPath) : ydn.db.SQLITE_SPECIAL_COLUNM_NAME;
};


/**
 *
 * @return {string} return quoted name.
 */
ydn.db.StoreSchema.prototype.getQuotedName = function() {
  return goog.string.quote(this.name);
};


/**
 * @return {Array.<string>} return name of indexed. It is used as column name
 * in WebSql.
 */
ydn.db.StoreSchema.prototype.getColumns = function() {
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
 * @param {string} name store (table) name.
 * @param {boolean=} opt_unique unique.
 * @param {ydn.db.DataType=} opt_type default to TEXT.
 */
ydn.db.StoreSchema.prototype.addIndex = function(name, opt_unique, opt_type) {
  this.indexes.push(new ydn.db.IndexSchema(name, opt_unique, opt_type));
};


/**
 *
 * @param {!Object} obj get key value from its keyPath field.
 * @return {!Array|number|string|undefined} return key value.
 */
ydn.db.StoreSchema.prototype.getKey = function(obj) {
  // http://www.w3.org/TR/IndexedDB/#key-construct
  return /** @type {string} */ (goog.object.getValueByKeys(obj, this.keyPaths));
};


/**
 * Generated a key starting from 0 with increment of 1.
 * NOTE: Use only by simple store.
 * @return {number} generated key.
 */
ydn.db.StoreSchema.prototype.generateKey = function() {
  if (!goog.isDef(this.current_key_)) {

    /**
     * @type {number}
     * @private
     */
    this.current_key_ = 0;
  }
  return this.current_key_ ++;
};


/**
 *
 * @param {!Object} obj get key value from its keyPath field.
 * @param {string|number} value key value to set.
 */
ydn.db.StoreSchema.prototype.setKey = function(obj, value) {

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
 * Separator between subset of key in array type. This is used in SQLite,
 * since it cannot handle array data type.
 * @const
 * @type {string}
 */
ydn.db.StoreSchema.KEY_SEP = ydn.db.Key.SEP_PARENT;


/**
 * This is for WebSQL.
 * @param {!Object} obj get values of indexed fields.
 * @param {(!Array|string|number)=} opt_key
 * @return {{
 *    columns: Array.<string>,
 *    slots: Array.<string>,
 *    values: Array.<string>,
 *    key: (!Array|string|number|undefined),
 *    normalized_key: (string|number|undefined)
 *  }} return list of values as it appear on the indexed fields.
 */
ydn.db.StoreSchema.prototype.getIndexedValues = function(obj, opt_key) {

  var key_column;
  var values = [];
  var slots = [];
  var columns = [];
  var key, normalized_key;
  if (goog.isDef(this.keyPath) || goog.isDef(opt_key)) {
    if (goog.isDef(this.keyPath)) {
      key = this.getKey(obj);
      columns = [this.getQuotedKeyPath()];
    } else if (goog.isDef(opt_key)) {
      key = opt_key;
      columns = [ydn.db.SQLITE_SPECIAL_COLUNM_NAME];
    }
    if (goog.isArray(key)) {
      // SQLite do not support Array as key
      normalized_key = key.join(ydn.db.StoreSchema.KEY_SEP);
    } else {
      normalized_key = key;
    }
    values = [normalized_key];
    slots = ['?'];
  }

  for (var i = 0; i < this.indexes.length; i++) {
    if (this.indexes[i].name == this.keyPath ||
      this.indexes[i].name == ydn.db.DEFAULT_BLOB_COLUMN) {
      continue;
    }
    var v = obj[this.indexes[i].name];
    if (goog.isDef(v)) {
      if (this.indexes[i].type == ydn.db.DataType.INTEGER) {
        if (!goog.isNumber(v)) {
          v = parseInt(v, 10);
        }
      } else if (this.indexes[i].type == ydn.db.DataType.FLOAT) {
        if (!goog.isNumber(v)) {
          v = parseFloat(v);
        }
      } else {
        if (!goog.isString(v)) {
          v = ydn.json.stringify(v);
        }
      }
      values.push(v);
      slots.push('?');
      columns.push(goog.string.quote(this.indexes[i].name));
    }
  }

  var data = {};
  for (var item in obj) {
    if (obj.hasOwnProperty(item) && !this.hasIndex(item)) {
      data[item] = obj[item];
    }
  }

  values.push(ydn.json.stringify(data));
  slots.push('?');
  columns.push(ydn.db.DEFAULT_BLOB_COLUMN);

  return {
    columns: columns,
    slots: slots,
    values: values,
    key: key,
    normalized_key: normalized_key
  };
};


/**
 * Compare two stores.
 * @param {!ydn.db.StoreSchema} store
 * @return {boolean}
 */
ydn.db.StoreSchema.prototype.equals = function(store) {
  return this.name === store.name &&
    ydn.object.isSame(this.toJSON(), store.toJSON());
};


/**
 *
 * @param {number} version version.
 * @param {number=} opt_size estimated database size. Default to 5 MB.
 * @param {!Array.<!ydn.db.StoreSchema>=} opt_stores store schemas.
 * @constructor
 */
ydn.db.DatabaseSchema = function(version, opt_size, opt_stores) {
  /**
   * @final
   * @type {number}
   */
  this.version = version || 1;

  /**
   * @final
   * @type {number}
   */
  this.size = opt_size || 5 * 1024 * 1024; // 5 MB

  /**
   * @final
   * @type {!Array.<!ydn.db.StoreSchema>}
   */
  this.stores = opt_stores || [];
};


/**
 * @inheritDoc
 */
ydn.db.DatabaseSchema.prototype.toJSON = function() {

  var stores = this.stores.map(function(x) {return x.toJSON()});

  return {
    'version': this.version,
    'size': this.size,
    'stores': stores};
};


/**
 *
 * @return {!Array.<string>}
 */
ydn.db.DatabaseSchema.prototype.getStoreNames = function() {
  return this.stores.map(function(x) {return x.name;});
};


/**
 * @param {*} json Restore from json stream.
 * @return {!ydn.db.DatabaseSchema} create new database schema from JSON string.
 */
ydn.db.DatabaseSchema.fromJSON = function(json) {
  var stores = [];
  var stores_json = json['stores'] || [];
  for (var i = 0; i < stores_json.length; i++) {
    stores.push(ydn.db.StoreSchema.fromJSON(stores_json[i]));
  }
  return new ydn.db.DatabaseSchema(json['version'], json['size'], stores);
};


/**
 *
 * @param {!ydn.db.StoreSchema} table store.
 */
ydn.db.DatabaseSchema.prototype.addStore = function(table) {
  this.stores.push(table);
};


/**
 *
 * @param {string} name store name.
 * @return {ydn.db.StoreSchema} store if found.
 */
ydn.db.DatabaseSchema.prototype.getStore = function (name) {
  return /** @type {ydn.db.StoreSchema} */ (goog.array.find(this.stores,
      function (x) {
        return x.name == name;
      }));
};


/**
 * Get index of store.
 * @param {string} name store name.
 * @return {number} index of store -1 if not found.
 */
ydn.db.DatabaseSchema.prototype.getIndexOf = function (name) {
  return goog.array.indexOf(this.stores,
      function (x) {
        return x.name == name;
      });
};


/**
 *
 * @param {string} name store name.
 * @return {boolean} return true if name found in stores.
 */
ydn.db.DatabaseSchema.prototype.hasStore = function(name) {

  return goog.array.some(this.stores, function(x) {
    return x.name == name;
  });
};


/**
 *
 * @return {!Array.<string>} Return list of store names.
 */
ydn.db.DatabaseSchema.prototype.listStores = function() {
  if (!this.store_names) {
    /**
     * @final
     * @type {!Array.<string>}
     */
    this.store_names = goog.array.map(this.stores, function(x) {
      return x.name;
    });
  }
  return this.store_names;
};
