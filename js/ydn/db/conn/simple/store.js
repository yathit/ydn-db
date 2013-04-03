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
 *
 * @define {boolean}
 */
ydn.db.con.simple.Store.DEBUG = false;


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
  return ydn.db.con.simple.makeKey(this.db_name, this.schema.getName(),
      this.primary_index, id);
};


/**
 * Extract key from encoded form.
 * @final
 * @protected
 * @param {string} eKey key as it stored in the cache.
 * @return {*} the key
 */
ydn.db.con.simple.Store.prototype.extractKey = function (eKey) {
  var tokens = eKey.split(ydn.db.con.simple.SEP);
  goog.asserts.assert(tokens.length == 5, 'the key ' + eKey +
    ' must have 5 tokens but ' + tokens.length + ' found');
  var id = tokens[4];
  return ydn.db.utils.decodeKey(id);
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
 * @param {boolean=} is_add for add method, the key must not already exist.
 * @return {IDBKey?} key in case of unique key constraint, return null
 */
ydn.db.con.simple.Store.prototype.addRecord = function(key, value, is_add) {

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

  if (ydn.db.con.simple.Store.DEBUG) {
    window.console.log('add ' + key);
  }
  if (is_add) {
    if (this.key_indexes[this.primary_index]) {
      var cache = this.key_indexes[this.primary_index];
      if (cache.contains(ydn.db.utils.encodeKey(key))) {
        return null; // primary key constraint
      }
    } else {
      if (!goog.isNull(this.storage.getItem(this.makeKey(key)))) {
        return null;
      }
    }
  }
  this.storage.setItem(this.makeKey(key),
    ydn.json.stringify(value));

  for (var idx in this.key_indexes) {
    var cache = this.key_indexes[idx];
    if (goog.isDefAndNotNull(cache)) {
      if (idx == this.primary_index) {
        cache.add(ydn.db.utils.encodeKey(key));
      } else {
        var index = this.schema.getIndex(idx);
        var index_key = ydn.db.utils.getValueByKeys(value, index.getKeyPath());
        cache.add(ydn.db.utils.encodeKey(index_key));
      }
    }
  }
  return key;
};


/**
 *
 * @param {IDBKey} key
 * @return {number} number deleted.
 */
ydn.db.con.simple.Store.prototype.removeRecord = function (key) {

  var eKey = this.makeKey(key);
  var obj = this.storage.getItem(eKey);
  var value;
  if (goog.isNull(obj)) {
    return 0;
  } else {
    this.storage.removeItem(eKey);
    for (var idx in this.key_indexes) {
      var cache = this.key_indexes[idx];
      if (cache) {
        if (idx == this.primary_index) {
          cache.remove(ydn.db.utils.encodeKey(key));
        } else {
          var index = this.schema.getIndex(idx);
          value = goog.isDef(value) ? value : ydn.json.parse(obj);
          var index_key = ydn.db.utils.getValueByKeys(value, index.getKeyPath());
          cache.remove(ydn.db.utils.encodeKey(index_key));
        }
      }
    }
    return 1;
  }

};


/**
 * Clear all record in stores.
 */
ydn.db.con.simple.Store.prototype.clear = function() {
  this.removeRecords();
};


/**
 *
 * @param {string?} index_name
 * @param {!IDBKey} key
 * @return {*}
 */
ydn.db.con.simple.Store.prototype.getRecord = function(index_name, key) {
  if (!index_name || index_name == this.primary_index) {
    var v = this.storage.getItem(this.makeKey(key));
    return goog.isNull(v) ? undefined : ydn.json.parse(v);
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
    var starts = ydn.db.con.simple.makeKey(this.db_name, this.schema.getName(),
        index_name);
    var len = starts.length + ydn.db.con.simple.SEP.length;
    this.key_indexes[index_name] = new goog.structs.AvlTree(ydn.db.cmp);
    var n = this.storage.length;
    for (var i = 0; i < n; i++) {
      var key = this.storage.key(i);
      if (!goog.isNull(key)) {
        if (goog.string.startsWith(key, starts)) {
          this.key_indexes[index_name].add(key.substr(len));
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
 * @param {IDBKeyRange=} key_range
 * @return {number}
 */
ydn.db.con.simple.Store.prototype.removeRecords = function(key_range) {
  var me = this;
  var cache = this.getIndexCache(this.primary_index);
  var starts = ydn.db.con.simple.makeKey(this.db_name, this.schema.getName(),
    this.primary_index) + ydn.db.con.simple.SEP;
  /**
   * @type {null}
   */
  var start = null;
  /**
   * @type {null}
   */
  var end = null;
  var count = 0;
  var removed_ids = [];
  if (goog.isDefAndNotNull(key_range)) {
    if (goog.isDefAndNotNull(key_range.lower)) {
      start = /** @type {null} */ (ydn.db.utils.encodeKey(key_range.lower));
    }
    if (goog.isDefAndNotNull(key_range.upper)) {
      end = /** @type {null} */ (ydn.db.utils.encodeKey(key_range.upper));
    }
  }
  // console.log([start, end])
  cache.inOrderTraverse(function (x) {
    if (!goog.isDefAndNotNull(x)) {
      return;
    }
    if (goog.isDefAndNotNull(end)) {
      var cmp = ydn.db.cmp(x, end);
      if (cmp === 1) {
        return true;
      }
      if (cmp === 0 && key_range.upperOpen) {
        return true;
      }
    }
    me.storage.removeItem(starts + x);
    count++;
    if (ydn.db.con.simple.Store.DEBUG) {
      window.console.log(count + '. remove ' + ydn.db.utils.decodeKey(x) + ' ' + x);
    }
    if (removed_ids.length < 10) {
      removed_ids.push(x);
    }
  }, start);

  // update tree
  if (removed_ids.length < 10) {
    for (var i = 0; i < removed_ids.length; i++) {
      cache.remove(removed_ids[i]);
    }
  } else {
    // to many node removed, just clear the tree.
    cache.clear();
    this.key_indexes[this.primary_index] = null;
  }

  return count;
};


/**
 *
 * @param {boolean} key_only
 * @param {string?=} index_name
 * @param {IDBKeyRange=} key_range
 * @param {boolean=} reverse
 * @param {number=} limit
 * @param {number=} offset
 * @return {!Array} results
 * @private
 */
ydn.db.con.simple.Store.prototype.getItems_ = function(key_only, index_name,
     key_range, reverse, limit, offset) {
  var starts = ydn.db.con.simple.makeKey(this.db_name, this.schema.getName(),
    this.primary_index) + ydn.db.con.simple.SEP;
  var results = [];
  index_name = index_name || this.primary_index;
  var cache = this.getIndexCache(index_name);
  // FIXME: remove these weired null type and casting.
  /**
   * @type {null}
   */
  var start = null;
  /**
   * @type {null}
   */
  var end = null;
  if (!goog.isDef(offset)) {
    offset = 0;
  }
  var offsetted = -1;
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
      offsetted++;
      if (offsetted < offset) {
        return;
      }
      if (!goog.isDefAndNotNull(x)) {
        return;
      }
      if (key_range.upperOpen && goog.isDefAndNotNull(end) &&
        ydn.db.cmp(x, end) == 0) {
        return;
      }
      if (goog.isDefAndNotNull(start)) {
        var cmp = ydn.db.cmp(x, start);
        if (cmp === -1) {
          return true;
        }
        if (cmp === 0 && key_range.lowerOpen) {
          return true;
        }
      }
      if (key_only) {
        results.push(ydn.db.utils.decodeKey(x));
      } else {
        var v = me.storage.getItem(starts + x);
        results.push(goog.isNull(v) ? undefined : ydn.json.parse(v));
      }
      if (goog.isDef(limit) && results.length >= limit) {
        return true;
      }
    }, end);
  } else {
    cache.inOrderTraverse(function (x) {
      offsetted++;
      if (offsetted < offset) {
        return;
      }
      if (!goog.isDefAndNotNull(x)) {
        return;
      }
      if (key_range.lowerOpen && goog.isDefAndNotNull(start) &&
        ydn.db.cmp(x, start) == 0) {
        return;
      }
      if (goog.isDefAndNotNull(end)) {
        var cmp = ydn.db.cmp(x, end);
        if (cmp === 1) {
          return true;
        }
        if (cmp === 0 && key_range.upperOpen) {
          return true;
        }
      }
      if (key_only) {
        results.push(ydn.db.utils.decodeKey(x));
      } else {
        var v = me.storage.getItem(starts + x);
        results.push(goog.isNull(v) ? undefined : ydn.json.parse(v));
      }
      if (goog.isDef(limit) && results.length >= limit) {
        return true;
      }
    }, start);
  }
  return results;
};



/**
 *
 * @param {string?=} index_name
 * @param {IDBKeyRange=} key_range
 * @param {boolean=} reverse
 * @param {number=} limit
 * @param {number=} offset
 * @return {!Array} results
 */
ydn.db.con.simple.Store.prototype.getRecords = function(index_name, key_range,
    reverse, limit, offset) {
  return this.getItems_(false, index_name, key_range, reverse, limit, offset);
};


/**
 *
 * @param {string?=} index_name
 * @param {IDBKeyRange=} key_range
 * @param {boolean=} reverse
 * @param {number=} limit
 * @param {number=} offset
 * @return {!Array} results
 */
ydn.db.con.simple.Store.prototype.getKeys = function(index_name, key_range,
                                                        reverse, limit, offset) {
  return this.getItems_(true, index_name, key_range, reverse, limit, offset);
};


if (goog.DEBUG) {
/**
 * @inheritDoc
 */
ydn.db.con.simple.Store.prototype.toString = function () {
  return 'ydn.db.con.simple.Store:' + this.schema.getName();
};
}


