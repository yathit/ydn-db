/**
 * @fileoverview Database schema.
 */


goog.provide('ydn.db.DatabaseSchema');
goog.provide('ydn.db.DataType');
goog.provide('ydn.db.IndexSchema');
goog.provide('ydn.db.TableSchema');



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
 */
ydn.db.IndexSchema = function (name, opt_unique, opt_type) {
  /**
   *
   * @type {string}
   */
  this.name = name;
  /**
   *
   * @type {ydn.db.DataType}
   */
  this.type = opt_type || ydn.db.DataType.TEXT;
  this.unique = !!opt_unique;
};


/**
 *
 * @param {string} name table name.
 * @param {string} keyPath indexedDB keyPath, like 'feed.id.$t'.
 * @constructor
 */
ydn.db.TableSchema = function(name, keyPath) {
  /**
   * @final
   * @type {string}
   */
  this.name = name;
  /**
   * @final
   * @type {string}
   */
  this.keyPath = keyPath;

  /**
   * @final
   * @type {Array.<string>}
   */
  this.keyPaths = keyPath.split('.');
  /**
   *
   * @type {!Array.<!ydn.db.IndexSchema>}
   */
  this.indexes = [];
};


/**
 *
 * @param {string} name index name.
 * @return {ydn.db.IndexSchema} index if found.
 */
ydn.db.TableSchema.prototype.getIndex = function(name) {
  return /** @type {ydn.db.IndexSchema} */ (goog.array.find(this.indexes, function(x) {
    return x.name == name;
  }));
};


/**
 *
 * @return {string} return quoted keyPath.
 */
ydn.db.TableSchema.prototype.getQuotedKeyPath = function() {
  return goog.string.quote(this.keyPath);
};


/**
 *
 * @return {string} return quoted name.
 */
ydn.db.TableSchema.prototype.getQuotedName = function() {
  return goog.string.quote(this.name);
};


/**
 * @return {Array.<string>} return name of indexed. It is used as column name in WebSql.
 */
ydn.db.TableSchema.prototype.getColumns = function() {
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
ydn.db.TableSchema.prototype.addIndex = function(name, opt_unique, opt_type) {
  this.indexes.push(new ydn.db.IndexSchema(name, opt_unique, opt_type));
};


/**
 *
 * @param {Object} obj get key value from its keyPath field.
 * @return {string|undefined} return key value.
 */
ydn.db.TableSchema.prototype.getKey = function(obj) {
  return goog.object.getValueByKeys(obj, this.keyPaths);
};

/**
 *
 * @param {Object} obj get key value from its keyPath field.
 * @param {string} value key value to set.
 */
ydn.db.TableSchema.prototype.setKey = function(obj, value) {


  for (var i = 0; i < this.keyPaths.length; i++) {
    var key = obj[this.keyPaths[i]];

    if (i = this.keyPaths.length - 1) {
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
 * @param {number} version
 * @param {number=} size estimated database size. Default to 5 MB.
 * @constructor
 */
ydn.db.DatabaseSchema = function(version, size) {
  /**
   *
   * @type {number}
   */
  this.version = version;

  this.size = size || 5 * 1024 * 1024; // 5 MB

  /**
   *
   * @type {!Array.<!ydn.db.TableSchema>}
   */
  this.stores = [];
};


/**
 *
 * @param {!ydn.db.TableSchema} table
 */
ydn.db.DatabaseSchema.prototype.addStore = function(table) {
  this.stores.push(table);
};


/**
 *
 * @param {string} name store name.
 * @return {ydn.db.TableSchema} store if found.
 */
ydn.db.TableSchema.prototype.getStore = function(name) {
  return /** @type {ydn.db.TableSchema} */ (goog.array.find(this.stores, function(x) {
    return x.name == name;
  }));
};
