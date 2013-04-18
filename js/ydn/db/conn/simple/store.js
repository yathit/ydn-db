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
 * @fileoverview Object store for simple storage.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.con.simple.Store');
goog.require('ydn.db.Buffer');
goog.require('ydn.db.base');
goog.require('ydn.db.con.simple');
goog.require('ydn.db.con.simple.Node');



/**
 *
 * @param {string} db_name database name.
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

  /**
   * @final
   */
  this.key_prefix = ydn.db.con.simple.makeKey(this.db_name,
      this.schema.getName(), this.primary_index) + ydn.db.con.simple.SEP;

};


/**
 *
 * @define {boolean} debug flag.
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
 * @type {!Object.<!ydn.db.Buffer>}
 * @private
 */
ydn.db.con.simple.Store.prototype.key_indexes;


/**
 * Use store name and id to form a key to use in setting key to storage.
 * @protected
 * @final
 * @param {IDBKey=} opt_id id. If not given, key for store return.
 * @return {string} canonical key name.
 */
ydn.db.con.simple.Store.prototype.makeKey = function(opt_id) {
  return this.key_prefix + ydn.db.utils.encodeKey(opt_id);
};


/**
 * @type {string}
 * @private
 */
ydn.db.con.simple.Store.prototype.key_prefix;


/**
 * Extract key from encoded form.
 * @final
 * @protected
 * @param {string} eKey key as it stored in the storage.
 * @return {!IDBKey} the key.
 */
ydn.db.con.simple.Store.prototype.extractKey = function(eKey) {
  var key = ydn.db.utils.decodeKey(eKey.substr(this.key_prefix.length));
  return /** @type  {!IDBKey} */ (key);
};


/**
 * Key generator for autoIncrement key.
 * @see http://www.w3.org/TR/IndexedDB/#key-generator-concept
 * @return {!IDBKey}
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
 * @param {string=} opt_index_name index name, default to primary key index.
 * @return {!ydn.db.Buffer}
 */
ydn.db.con.simple.Store.prototype.getIndexCache = function(opt_index_name) {
  var index_name = opt_index_name || this.primary_index;
  if (!this.key_indexes[index_name]) {
    this.key_indexes[index_name] =
        new ydn.db.Buffer(ydn.db.con.simple.Node.cmp);
    var n = this.storage.length;
    for (var i = 0; i < n; i++) {
      var key_str = this.storage.key(i);
      if (!goog.isNull(key_str)) {
        if (goog.string.startsWith(key_str, this.key_prefix)) {
          var key = this.extractKey(key_str);
          if (index_name == this.primary_index) {
            var node = new ydn.db.con.simple.Node(key);
            this.key_indexes[index_name].add(node);
          } else {
            var obj_str = this.storage.getItem(key_str);
            if (!goog.isNull(obj_str)) {
              var index = this.schema.getIndex(index_name);
              var obj = ydn.json.parse(obj_str);
              var index_key = /** @type {IDBKey} */ (index.extractKey(obj));
              var index_node = new ydn.db.con.simple.Node(index_key, key);
              this.key_indexes[index_name].add(index_node);
            }
          }
        }
      }
    }
    if (ydn.db.con.simple.Store.DEBUG) {
      window.console.log('index ' + index_name + ' of ' +
          this.schema.getName() + ' for ' +
          this.key_indexes[index_name].getCount() + ' records.');
    }
  }
  return this.key_indexes[index_name];
};


/**
 *
 * @param {!IDBKey} key  primary key.
 * @param {!Object} value  record value.
 */
ydn.db.con.simple.Store.prototype.updateIndex = function(key, value) {
  for (var idx in this.key_indexes) {
    var cache = this.key_indexes[idx];
    if (cache) {
      if (ydn.db.con.simple.Store.DEBUG) {
        window.console.log('updating ' + key + ' in index ' + idx + ' of ' +
            this.schema.getName());
      }
      if (idx == this.primary_index) {
        cache.add(new ydn.db.con.simple.Node(key));
      } else {
        var index = this.schema.getIndex(idx);
        var index_key = ydn.db.utils.getValueByKeys(value, index.getKeyPath());
        if (goog.isDefAndNotNull(index_key)) {
          var node = new ydn.db.con.simple.Node(key, index_key);
          cache.add(node);
        }
      }
    }
  }
};


/**
 *
 * @param {!IDBKey} key primary key.
 * @param {!Object} value record value.
 */
ydn.db.con.simple.Store.prototype.removeIndex = function(key, value) {
  for (var idx in this.key_indexes) {
    var cache = this.key_indexes[idx];
    if (cache) {
      if (ydn.db.con.simple.Store.DEBUG) {
        window.console.log('removing ' + key + ' in index ' + idx + ' of ' +
            this.schema.getName());
      }
      if (idx == this.primary_index) {
        cache.remove(new ydn.db.con.simple.Node(key));
      } else {
        var index = this.schema.getIndex(idx);
        var index_key = ydn.db.utils.getValueByKeys(value, index.getKeyPath());
        var node = new ydn.db.con.simple.Node(key, index_key);
        cache.remove(node);
      }
    }
  }
};


/**
 * @protected
 */
ydn.db.con.simple.Store.prototype.clearIndexCache = function() {
  for (var idx in this.key_indexes) {
    var cache = this.key_indexes[idx];
    if (cache) {
      cache.clear();
      if (ydn.db.con.simple.Store.DEBUG) {
        window.console.log('index ' + idx + ' of ' +
            this.schema.getName() + ' cleared.');
      }
    }
  }
  this.key_indexes = {};
};


/**
 *
 * @param {IDBKey|undefined} key
 * @param {!Object} value
 * @param {boolean=} opt_is_add for add method, the key must not already exist.
 * @return {IDBKey?} key in case of unique key constraint, return null.
 */
ydn.db.con.simple.Store.prototype.addRecord = function(key, value, opt_is_add) {

  if (!goog.isDefAndNotNull(key)) {
    if (this.schema.usedInlineKey()) {
      key = this.schema.extractKey(value);
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
  if (opt_is_add) {
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

  this.updateIndex(key, value);
  return key;
};


/**
 *
 * @param {IDBKey} key
 * @return {number} number deleted.
 */
ydn.db.con.simple.Store.prototype.removeRecord = function(key) {

  var eKey = this.makeKey(key);
  var obj = this.storage.getItem(eKey);

  if (goog.isNull(obj)) {
    return 0;
  } else {
    this.storage.removeItem(eKey);
    var value = ydn.json.parse(obj);
    this.removeIndex(key, value);
    return 1;
  }

};


/**
 * Clear all record in stores.
 */
ydn.db.con.simple.Store.prototype.clear = function() {
  this.clearIndexCache();
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
 * @param {string?=} opt_index_name index name.
 * @param {IDBKeyRange=} opt_key_range key range.
 * @return {number}
 */
ydn.db.con.simple.Store.prototype.countRecords = function(opt_index_name,
    opt_key_range) {
  opt_index_name = opt_index_name || this.primary_index;

  var me = this;
  var cache = this.getIndexCache(opt_index_name);

  /**
   * @type {ydn.db.con.simple.Node}
   */
  var start = null;
  /**
   * @type {ydn.db.con.simple.Node}
   */
  var end = null;
  var count = 0;
  var lowerOpen = false;
  var upperOpen = false;
  if (goog.isDefAndNotNull(opt_key_range)) {
    if (goog.isDefAndNotNull(opt_key_range.lower)) {
      start = new ydn.db.con.simple.Node(
          /** @type {!IDBKey} */ (opt_key_range.lower));
    }
    if (goog.isDefAndNotNull(opt_key_range.upper)) {
      end = new ydn.db.con.simple.Node(
          /** @type {!IDBKey} */ (opt_key_range.upper));
    }
    lowerOpen = opt_key_range.lowerOpen;
    upperOpen = opt_key_range.upperOpen;
  }

  /**
   *
   * @param {goog.structs.AvlTree.Node} node
   * @return {boolean|undefined}
   */
  var tr_fn = function(node) {
    if (!goog.isDefAndNotNull(node)) {
      return;
    }
    var x = /** @type {ydn.db.con.simple.Node} */ (node.value);
    if (lowerOpen && goog.isDefAndNotNull(start) &&
        ydn.db.con.simple.Node.cmp(x, start) == 0) {
      return;
    }
    if (goog.isDefAndNotNull(end)) {
      var cmp = ydn.db.con.simple.Node.cmp(x, end);
      if (cmp === 1) {
        return true;
      }
      if (cmp === 0 && upperOpen) {
        return true;
      }
    }
    count++;

  };
  cache.traverse(tr_fn, start);

  return count;
};


/**
 *
 * @param {IDBKeyRange=} opt_key_range
 * @return {number}
 */
ydn.db.con.simple.Store.prototype.removeRecords = function(opt_key_range) {
  var me = this;
  var cache = this.getIndexCache(this.primary_index);
  /**
   * @type {ydn.db.con.simple.Node}
   */
  var start = null;
  /**
   * @type {ydn.db.con.simple.Node}
   */
  var end = null;
  var count = 0;
  var removed_ids = [];
  var removed_objs = [];
  var lowerOpen = false;
  var upperOpen = false;
  if (goog.isDefAndNotNull(opt_key_range)) {
    if (goog.isDefAndNotNull(opt_key_range.lower)) {
      start = new ydn.db.con.simple.Node(
          /** @type {!IDBKey} */ (opt_key_range.lower));
    }
    if (goog.isDefAndNotNull(opt_key_range.upper)) {
      end = new ydn.db.con.simple.Node(
          /** @type {!IDBKey} */ (opt_key_range.upper));
    }
    lowerOpen = opt_key_range.lowerOpen;
    upperOpen = opt_key_range.upperOpen;
  }

  /**
   *
   * @param {goog.structs.AvlTree.Node} node
   * @return {boolean|undefined}
   */
  var tr_fn = function(node) {
    if (!goog.isDefAndNotNull(node)) {
      return;
    }
    var x = /** @type {ydn.db.con.simple.Node} */ (node.value);
    if (lowerOpen && goog.isDefAndNotNull(start) &&
        ydn.db.con.simple.Node.cmp(x, start) == 0) {
      return;
    }
    if (goog.isDefAndNotNull(end)) {
      var cmp = ydn.db.con.simple.Node.cmp(x, end);
      if (cmp === 1) {
        return true;
      }
      if (cmp === 0 && upperOpen) {
        return true;
      }
    }
    var key = me.makeKey(x.getKey());
    var obj = me.storage.getItem(key);
    if (!goog.isNull(obj)) {
      me.storage.removeItem(key);
      count++;
      if (ydn.db.con.simple.Store.DEBUG) {
        window.console.log(count + '. remove ' + x.getKey() + ' ' + key);
      }
      if (removed_ids.length < 10) {
        removed_ids.push(x.getKey());
        removed_objs.push(ydn.json.parse(obj));
      }
    }

  };
  cache.traverse(tr_fn, start);

  // update tree
  if (removed_ids.length < 10) {
    for (var i = 0; i < removed_ids.length; i++) {
      this.removeIndex(removed_ids[i], removed_objs[i]);
    }
  } else {
    // to many node removed, just clear the tree.
    this.clearIndexCache();
  }

  return count;
};


/**
 *
 * @param {boolean} is_key_cursor
 * @param {boolean} is_value_query false for effective key (false),
 * true for reference value query.
 * @param {string?=} opt_index_name
 * @param {IDBKeyRange=} opt_key_range
 * @param {boolean=} opt_reverse
 * @param {number=} opt_limit
 * @param {number=} opt_offset
 * @return {!Array} results.
 */
ydn.db.con.simple.Store.prototype.getItems = function(is_key_cursor,
    is_value_query, opt_index_name, opt_key_range, opt_reverse, opt_limit,
    opt_offset) {
  var results = [];
  opt_index_name = opt_index_name || this.primary_index;
  var is_index = opt_index_name != this.primary_index;
  var cache = this.getIndexCache(opt_index_name);
  /**
   * @type {ydn.db.con.simple.Node}
   */
  var start = null;
  /**
   * @type {ydn.db.con.simple.Node}
   */
  var end = null;
  if (!goog.isDef(opt_offset)) {
    opt_offset = 0;
  }
  var offsetted = -1;
  var lowerOpen = false;
  var upperOpen = false;
  if (goog.isDefAndNotNull(opt_key_range)) {
    if (goog.isDefAndNotNull(opt_key_range.lower)) {
      if (is_index && opt_reverse) {
        start = new ydn.db.con.simple.Node(
            /** @type {!IDBKey} */ (opt_key_range.lower), '\uffff');
      } else {
        start = new ydn.db.con.simple.Node(
            /** @type {!IDBKey} */ (opt_key_range.lower));
      }
    }
    if (goog.isDefAndNotNull(opt_key_range.upper)) {
      if (is_index && !opt_reverse) {
        end = new ydn.db.con.simple.Node(
            /** @type {!IDBKey} */ (opt_key_range.upper), '\uffff');
      } else {
        end = new ydn.db.con.simple.Node(
            /** @type {!IDBKey} */ (opt_key_range.upper));
      }
    }
    lowerOpen = opt_key_range.lowerOpen;
    upperOpen = opt_key_range.upperOpen;
  }
  var me = this;

  /**
   * @param {goog.structs.AvlTree.Node} node
   * @return {boolean|undefined}
   */
  var tr_fn = function(node) {
    if (!node) {
      return;
    }
    offsetted++;
    if (offsetted < opt_offset) {
      return;
    }
    var x = /** @type {ydn.db.con.simple.Node} */ (node.value);
    if (opt_reverse) {
      if (upperOpen && goog.isDefAndNotNull(end) &&
          ydn.db.cmp(x.getKey(), end.getKey()) == 0) {
        return;
      }
      if (goog.isDefAndNotNull(start)) {
        var cmp = ydn.db.cmp(x.getKey(), start.getKey());
        if (cmp === -1) {
          return true;
        }
        if (cmp === 0 && lowerOpen) {
          return true;
        }
      }
    } else {
      if (lowerOpen && goog.isDefAndNotNull(start) &&
          ydn.db.cmp(x.getKey(), start.getKey()) == 0) {
        return;
      }
      if (goog.isDefAndNotNull(end)) {
        var cmp = ydn.db.cmp(x.getKey(), end.getKey());
        if (cmp === 1) {
          return true;
        }
        if (cmp === 0 && upperOpen) {
          return true;
        }
      }
    }
    var key = x.getKey();
    var primary_key = /** @type {!IDBKey} */ (is_index ?
        x.getPrimaryKey() : key);

    var push_value = function() {
      var v = me.storage.getItem(me.makeKey(primary_key));
      results.push(goog.isNull(v) ? undefined : ydn.json.parse(v));
    };

    if (is_value_query) {
      if (is_index) {
        if (is_key_cursor) {
          results.push(primary_key);
        } else {
          push_value();
        }
      } else {
        if (is_key_cursor) {
          results.push(primary_key);
        } else {
          push_value();
        }
      }
    } else {
      results.push(key);
    }

    if (goog.isDef(opt_limit) && results.length >= opt_limit) {
      return true;
    }
  };

  if (opt_reverse) {
    cache.reverseTraverse(tr_fn, end);
  } else {
    cache.traverse(tr_fn, start);
  }
  return results;
};


/**
 *
 * @param {string?=} opt_index_name
 * @param {IDBKeyRange=} opt_key_range
 * @param {boolean=} opt_reverse
 * @param {number=} opt_limit
 * @param {number=} opt_offset
 * @return {!Array} results.
 */
ydn.db.con.simple.Store.prototype.getRecords = function(opt_index_name,
    opt_key_range, opt_reverse, opt_limit, opt_offset) {
  return this.getItems(false, true, opt_index_name, opt_key_range, opt_reverse,
      opt_limit, opt_offset);
};


/**
 *
 * @param {string?=} opt_index_name
 * @param {IDBKeyRange=} opt_key_range
 * @param {boolean=} opt_reverse
 * @param {number=} opt_limit
 * @param {number=} opt_offset
 * @return {!Array} results.
 */
ydn.db.con.simple.Store.prototype.getKeys = function(opt_index_name,
    opt_key_range, opt_reverse, opt_limit, opt_offset) {
  return this.getItems(true, true, opt_index_name, opt_key_range, opt_reverse,
      opt_limit, opt_offset);
};


if (goog.DEBUG) {
  /**
   * @inheritDoc
   */
  ydn.db.con.simple.Store.prototype.toString = function() {
    return 'ydn.db.con.simple.Store:' + this.db_name + ':' +
        this.schema.getName();
  };
}


