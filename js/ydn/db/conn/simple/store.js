/**
 * @fileoverview Object store for simple storage.
 */

goog.provide('ydn.db.con.simple.Store');
goog.require('ydn.db.con.simple');
goog.require('goog.structs.AvlTree');


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
 * @type {string}
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
 * Key generator for autoIncrement key.
 * @see http://www.w3.org/TR/IndexedDB/#key-generator-concept
 * @return {IDBKey}
 */
ydn.db.con.simple.Store.prototype.generateKey = function() {
  var store_key = this.makeKey();
  var sch = ydn.json.parse(this.storage.getItem(store_key));
  if (!sch['key_count']) {
    sch['key_count'] = 0;
  }
  sch['key_count']++;
  this.storage.setItem(store_key, ydn.json.stringify(sch));
  return sch['key_count'];
};


/**
 *
 * @param {IDBKey|undefined} key
 * @param {!Object} value
 * @return {IDBKey} key
 */
ydn.db.con.simple.Store.prototype.addRecord = function(key, value) {

  var key_path = this.schema.getKeyPath();
  if (!goog.isDefAndNotNull(key)) {
    if (goog.isDefAndNotNull(key_path)) {
      key = ydn.db.utils.getValueByKeys(value, key_path);
    }
    if (this.schema.getAutoIncrement() && !goog.isDefAndNotNull(key)) {
      key = this.generateKey();
    }
  }

  goog.asserts.assert(goog.isDefAndNotNull(key),
    this + 'primary key not provided in ' + ydn.json.toShortString(value));
  this.storage.setItem(this.makeKey(key),
    ydn.json.stringify(value));

  for (var idx in this.key_indexes) {
    var cache = this.key_indexes[idx];
//    if (!goog.isNull(cache)) {
//      if (idx == this.primary_index) {
//        var index = this.schema.getIndex(index_name);
//        key_path = index.getKeyPath();
//        var index_key = ydn.db.utils.getValueByKeys(value, key_path);
//        goog.asserts.assert(goog.isDefAndNotNull(index_key), this +
//          ': index key for ' + index_name + ' not provided in ' +
//          ydn.json.toShortString(value));
//      } else {
//        index_key = key;
//      }
//      cache.add(index_key);
//    }
  }
  return key;
};


/**
 *
 * @param {string?} index_name default to primary index.
 * @param {IDBKey} key
 * @return {number} number deleted.
 */
ydn.db.con.simple.Store.prototype.removeRecord = function(index_name, key) {
  if (!index_name || index_name == this.primary_index) {
    var eKey = this.makeKey(key);
    var del_count = this.storage.getItem(eKey) ? 1 : 0;
    this.storage.removeItem(eKey);
    var cache = this.key_indexes[this.primary_index];
    if (cache) {
      cache.remove(eKey);
    }
    return del_count;
  } else {
    throw 'not implemented';
  }

};


/**
 * Clear all record in stores.
 */
ydn.db.con.simple.Store.prototype.clear = function() {
  var cache = this.getIndexCache(this.primary_index);
  var me = this;
  cache.inOrderTraverse(function (x) {
    me.storage.removeItem(x);
  });
  for (var i in this.key_indexes) {
    if (this.key_indexes[i]) {
      this.key_indexes[i].clear();
    }
  }
  this.key_indexes = {};
};


/**
 *
 * @param {string?=} index_name
 * @param {IDBKeyRange=} key_range
 * @return {Array}
 */
ydn.db.con.simple.Store.prototype.listByKeyRange = function(index_name, key_range) {
  var arr = [];
  if (!index_name || index_name == this.primary_index) {
    var cache = this.getIndexCache(this.primary_index);
    cache.inOrderTraverse(function (x) {
      arr.push(x);
    });
  } else {
    throw 'implementing';
  }
  return arr;
};


/**
 *
 * @param {string?} index_name
 * @param {!IDBKey} key
 * @return {*}
 */
ydn.db.con.simple.Store.prototype.getRecord = function(index_name, key) {
  if (!index_name || index_name == this.primary_index) {
    return ydn.json.parse(this.storage.getItem(this.makeKey(key)));
  } else {
    goog.asserts.assert(this.schema.hasIndex(index_name), 'index "' +
      index_name + '" not found in ' + this);
    throw 'impl';
  }
};


/**
 *
 * @return {string} return store name.
 */
ydn.db.con.simple.Store.prototype.getName = function() {
  return this.schema.getName();
};


/**
 *
 * @param {string} index_name
 * @return {goog.structs.AvlTree}
 * @private
 */
ydn.db.con.simple.Store.prototype.getIndexCache = function(index_name) {
  if (!this.key_indexes[index_name]) {
    var starts = this.makeKey(index_name);
    this.key_indexes[index_name] = new goog.structs.AvlTree(ydn.db.cmp);
    var n = this.storage.length;
    for (var i = 0; i < n; i++) {
      var key = this.storage.key(i);
      if (!goog.isNull(key)) {
        if (goog.string.startsWith(key, starts)) {
          this.key_indexes[index_name].add(key);
        }
      }
    }
  }
  return this.key_indexes[index_name];
};


/**
 *
 * @param {string?=} index_name
 * @param {IDBKeyRange=} key_range
 * @return {number}
 */
ydn.db.con.simple.Store.prototype.countRecords = function(index_name,
     key_range) {
  index_name = index_name || this.primary_index;
  var cache =  this.getIndexCache(index_name);
  if (goog.isDefAndNotNull(key_range)) {
    throw 'impl';
  } else {
    return cache.getCount();
  }
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
  var cache = this.getIndexCache(index_name);
  /**
   * @type {null}
   */
  var start = null;
  /**
   * @type {null}
   */
  var end = null;
  if (goog.isDefAndNotNull(key_range)) {
    if (goog.isDefAndNotNull(key_range.lower)) {
      start = /** @type {null} */ (ydn.db.utils.encodeKey(key_range.lower));
    }
    if (goog.isDefAndNotNull(key_range.upper)) {
      end = /** @type {null} */ (ydn.db.utils.encodeKey(key_range.upper));
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
      results.push(me.storage.getItem(x));
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
      results.push(me.storage.getItem(x));
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


