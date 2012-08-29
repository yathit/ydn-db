/**
 * @fileoverview Database schema.
 */


goog.provide('ydn.db.DataType');
goog.provide('ydn.db.DatabaseSchema');
goog.provide('ydn.db.IndexSchema');
goog.provide('ydn.db.StoreSchema');


/**
 * Store field data type following Web Sql definition.
 * @see http://www.sqlite.org/lang_expr.html
 * @enum {string}
 */
ydn.db.DataType = {
  TEXT: 'TEXT',
  FLOAT: 'REAL',
  INTEGER: 'INTEGER'
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
 * 'id'.
 * @param {!Array.<!ydn.db.IndexSchema>=} opt_indexes list of indexes.
 * @constructor
 */
ydn.db.StoreSchema = function(name, keyPath, opt_autoIncrement, opt_indexes) {

  /**
   * @final
   * @type {string}
   */
  this.name = name;
  /**
   * @final
   * @type {string|undefined}
   */
  this.keyPath = keyPath;

  /**
   * @final
   * @type {!Array.<string>}
   */
  this.keyPaths = goog.isDef(this.keyPath) ? this.keyPath.split('.') : [];

  /**
   * @final
   * @type {boolean}
   */
  this.autoIncrement = !!opt_autoIncrement;
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
    'indexes': indexes};
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
    json['autoIncrement'], indexes);
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
 *
 * @return {string|undefined} return quoted keyPath.
 */
ydn.db.StoreSchema.prototype.getQuotedKeyPath = function() {
  return goog.isDef(this.keyPath) ? goog.string.quote(this.keyPath) : undefined;
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
 * @return {string|undefined} return key value.
 */
ydn.db.StoreSchema.prototype.getKey = function(obj) {
  return /** @type {string} */ (goog.object.getValueByKeys(obj, this.keyPaths));
};


/**
 * Generated a key starting from 0 with increment of 1.
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
 *
 * @param {!Object} obj get values of indexed fields.
 * @return {{columns: Array.<string>, slots: Array.<string>, values:
 * Array.<string>, key: (string|number)}} return list of values as it appear on the indexed fields.
 */
ydn.db.StoreSchema.prototype.getIndexedValues = function(obj) {

  var key;
  var key_column;
  if (goog.isDef(this.keyPath)) {
    key_column = this.getQuotedKeyPath();
    key = this.getKey(obj);
  } else {
    key_column = ydn.db.DEFAULT_KEY_COLUMN;
    key = this.generateKey();
  }
  goog.asserts.assert(goog.isDefAndNotNull(key), 'no key in ' + ydn.json.stringify(obj));
  var columns = [key_column];
  var values = [key];
  var slots = ['?'];

  for (var i = 0; i < this.indexes.length; i++) {
    if (this.indexes[i].name == this.keyPath ||
      this.indexes[i].name == ydn.db.DEFAULT_KEY_COLUMN ||
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

  return {columns: columns, slots: slots, values: values, key: key};
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
 * @param {!Object} json Restore from json stream.
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
ydn.db.DatabaseSchema.prototype.getStore = function(name) {
  return /** @type {ydn.db.StoreSchema} */ (goog.array.find(this.stores,
    function(x) {
    return x.name == name;
  }));
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
