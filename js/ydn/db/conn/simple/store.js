/**
 * @fileoverview Object store for simple storage.
 */

goog.provide('ydn.db.con.simple.Store');
goog.require('ydn.db.com.simple');


/**
 *
 * @param {string} db_name database name
 * @param {!Storage} storage
 * @param {!ydn.db.schema.Store} store_schema
 * @constructor
 */
ydn.db.con.simple.Store = function(db_name, storage, store_schema) {
  /**
   * @final
   */
  this.db_name = db_name;
  /**
   * @final
   */
  this.storage = storage;
  /**
   * @final
   */
  this.schema = store_schema;
  /**
   * @final
   */
  this.key_indexes = {};
  
  var kp = this.schema.getKeyPath();
  /**
   * @final
   */
  this.primary_index = goog.isArray(kp) ? kp.join(',') : 
    kp || ydn.db.base.SQLITE_SPECIAL_COLUNM_NAME;

  this.key_indexes[this.primary_index] = null;
};


/**
 * @type {!Storage}
 * @private
 */
ydn.db.con.simple.Store.prototype.storage;


/**
 * @private
 * @type {!ydn.db.schema.Store}
 */
ydn.db.con.simple.Store.prototype.db_name;


/**
 * @private
 * @type {!ydn.db.schema.Store}
 */
ydn.db.con.simple.Store.prototype.schema;

/**
 * @private
 * @type {string}
 */
ydn.db.con.simple.Store.prototype.primary_index;


/**
 * List of ascending ordered key for each index and primary key.
 * @type {!Object.<goog.structs.AvlTree?>}
 * @private
 */
ydn.db.con.simple.Store.prototype.key_indexes;


/**
 * Use store name and id to form a key to use in setting key to storage.
 * @protected
 * @final
 * @param {IDBKey=} id id. If not given, key for store return.
 * @return {string} canonical key name.
 */
ydn.db.con.simple.Store.prototype.makeKey = function(id) {
  return ydn.db.con.simple.makeKey(this.db_name, this.schema.getName(), id);
};


/**
 * 
 * @param {string?} index_name
 * @param {!IDBKey} key
 * @param {!Object} value
 */
ydn.db.con.simple.Store.prototype.addRecord = function(index_name, key, value) {
  index_name = index_name || this.primary_index; 
  goog.asserts.assert(!goog.isDef(this.key_indexes[index_name]), 'index "' +
    index_name + '" not found in ' + this);
  for (var idx in this.key_indexes) {
    var cache = this.key_indexes[idx];
    if (!goog.isNull(cache)) {
      var key_path = this.schema.getKeyPath();
      if (index_name != this.primary_index) {
        var index = this.schema.getIndex(index_name);
        key_path = index.getKeyPath();
      }
      var index_key = ydn.db.utils.getValueByKeys(value, key_path);
      cache.add(index_key);
    }
  }

};


/**
 *
 * @param {string?} index_name
 * @param {!IDBKey} key
 * @return {*}
 */
ydn.db.con.simple.Store.prototype.getRecord = function(index_name, key) {
  index_name = index_name || this.primary_index;
  goog.asserts.assert(!goog.isDef(this.key_indexes[index_name]), 'index "' +
    index_name + '" not found in ' + this);
  return this.storage.getItem(this.makeKey(key));
};


/**
 *
 * @param {string} index_name
 * @return {goog.structs.AvlTree}
 * @private
 */
ydn.db.con.simple.Store.prototype.getKeyCache = function(index_name) {
  if (!this.key_indexes[index_name]) {
    var starts = this.makeKey(index_name);
    this.key_indexes[index_name] = new goog.structs.AvlTree(ydn.db.cmp);
    var n = this.storage.length;
    for (var i = 0; i < n; i++) {
      var key = this.storage.key(i);
      if (goog.string.startsWith(key, starts)) {
        this.key_indexes[index_name].add(key);
      }
    }
  }
  return this.key_indexes[index_name];
};


/**
 *
 * @param {string?} index_name
 * @param {IDBKeyRange=} key_range
 * @param {boolean=} reverse
 * @return {!Array} results
 */
ydn.db.con.simple.Store.prototype.getRecords = function(index_name, key_range,
                                                        reverse) {
  var results = [];
  index_name = index_name || this.primary_index;
  goog.asserts.assert(!goog.isDef(this.key_indexes[index_name]), 'index "' +
    index_name + '" not found in ' + this);
  var cache = this.getKeyCache(index_name);
  var start = undefined;
  var end = undefined;
  if (goog.isDefAndNotNull(key_range)) {
    if (goog.isDefAndNotNull(key_range.lower)) {
      start = ydn.db.utils.encodeKey(key_range.lower);
    }
    if (goog.isDefAndNotNull(key_range.lower)) {
      end = ydn.db.utils.encodeKey(key_range.upper);
    }
  }
  var me = this;
  if (reverse) {
    cache.reverseOrderTraverse(function (x) {
      if (!goog.isDef(x)) {
        return;
      }
      if (goog.isDef(start)) {
        var cmp = ydn.db.cmp(x, start);
        if (cmp === -1) {
          return true;
        }
        if (cmp === 0 && key_range.lowerOpen) {
          return true;
        }
      }
      results.push(me.getItem(x));
    }, end);
  } else {
    cache.inOrderTraverse(function (x) {
      if (!goog.isDef(x)) {
        return;
      }
      if (goog.isDef(end)) {
        var cmp = ydn.db.cmp(x, end);
        if (cmp === 1) {
          return true;
        }
        if (cmp === 0 && key_range.upperOpen) {
          return true;
        }
      }
      results.push(me.getItem(x));
    }, start);
  }
  return results;
};


if (goog.DEBUG) {
/**
 * @inheritDoc
 */
ydn.db.con.simple.Store.prototype.toString = function () {
  return 'ydn.db.con.simple.Store:' + this.schema.getName();
};
}


