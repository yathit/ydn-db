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
 * @fileoverview Data store in memory.
 */

// TODO: in memory indexing.

goog.provide('ydn.db.con.SimpleStorage');
goog.require('goog.Timer');
goog.require('goog.asserts');
goog.require('goog.async.Deferred');
goog.require('ydn.db.Key');
goog.require('ydn.db.con.IDatabase');
goog.require('ydn.db.req.InMemoryStorage');


/**
 * @implements {ydn.db.con.IDatabase}
 * @param {!Storage=} opt_localStorage storage provider.
 * @constructor
 */
ydn.db.con.SimpleStorage = function(opt_localStorage) {

  /**
   * @final
   * @type {!Storage}
   * @private
   */
  this.cache_ = opt_localStorage ||
      /** @type {!Storage} */ (new ydn.db.req.InMemoryStorage());

};


/**
 * @protected
 * @type {goog.debug.Logger} logger.
 */
ydn.db.con.SimpleStorage.prototype.logger =
  goog.debug.Logger.getLogger('ydn.db.con.SimpleStorage');


/**
 * @const
 * @type {string}
 */
ydn.db.con.SimpleStorage.TYPE = 'memory';

//
///**
// * @deprecated
// * @return {!Object} return memory store object.
// */
//ydn.db.con.SimpleStorage.getInMemoryStorage = function() {
//
//  var memoryStorage = {};
//  memoryStorage.setItem = function(key, value) {
//    memoryStorage[key] = value;
//  };
//  memoryStorage.getItem = function(key) {
//    return memoryStorage[key] || null; // window.localStorage return null
//    // if the key don't exist.
//  };
//  memoryStorage.removeItem = function(key) {
//    delete memoryStorage[key];
//  };
//  memoryStorage.clear = function() {
//    for (var key in memoryStorage) {
//      if (memoryStorage.hasOwnProperty(key)) {
//        delete memoryStorage[key];
//      }
//    }
//  };
//  return memoryStorage;
//};


/**
 *
 * @return {boolean} true if memory is supported.
 */
ydn.db.con.SimpleStorage.isSupported = function() {
  return true;
};


/**
 *
 * @type {boolean} debug flag. should always be false.
 */
ydn.db.con.SimpleStorage.DEBUG = false;


/**
 * Storage key namespace.
 * @const
 * @type {string}  Storage key namespace.
 */
ydn.db.con.SimpleStorage.NAMESPACE = 'ydn.db';


/**
 *
 * @const
 * @type {string} seperator.
 */
ydn.db.con.SimpleStorage.SEP = '^|';

/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getVersion = function() {
  return 1;
};


/**
 * @typedef {{
 *   name: string,
 *   indexes: Object,
 *   autoIncrement: boolean,
 *   keyPath: string?,
 *   autoIncrementNo: number
 * }}
 */
ydn.db.con.SimpleStorage.StoreSchema;


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.connect = function(dbname, schema) {

  /**
   * @final
   * @type {string}
   */
  this.dbname = dbname;

  /**
   * @protected
   * @final
   * @type {!ydn.db.schema.Database}
   */
  this.schema = schema; // TODO: remove referencing to schema.

  /**
   *
   * @type {!Object.<StoreSchema>}
   * @final
   * @private
   */
  this.storeSchema_ = {};
  for (var i = 0; i < schema.count(); i++) {
    var store = schema.store(i);
    this.storeSchema_[store.getName()] = store.toJSON();
  }

  /**
   * Array of ordered key indexes.
   * @type {Object}
   */
  this.indexes = {};

  var db_key = this.makeKey();
  /**
   *
   * @type {DatabaseSchema}
   */
  var ex_schema = /** @type {DatabaseSchema} */
    (ydn.json.parse(this.cache_.getItem(db_key)));
  var stores = schema.getStoreNames();
  if (ex_schema) {
    for (var store_name in ex_schema) {
      if (ex_schema.hasOwnProperty(store_name)) {
        if (!schema.hasStore(store_name)) {
          var store_json = ex_schema[store_name];
          if (schema.isAutoSchema()) {
            // recover existing data
            this.logger.finer('Adding existing store: ' + store_name);
            this.storeSchema_[store_name] = store_json;
          } else {
            this.logger.finer('Deleting old store: ' + store_name);
            this.removeItemInternal(store_name);
          }
        } else {
          // TODO: recover auto generated keys
        }
      }
    }
  } else {
    this.cache_.setItem(db_key, ydn.json.stringify(this.storeSchema_));
  }

  return goog.async.Deferred.succeed(1);
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.isReady = function() {
  return !!this.dbname;
};



/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getDbInstance = function() {
  return this.cache_ || null;
};




/**
 * Column name of key, if keyPath is not specified.
 * @const {string}
 */
ydn.db.con.SimpleStorage.DEFAULT_KEY_PATH = '_id_';



/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getType = function() {
  return 'memory';
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.close = function() {

};


/**
 *
 * @return {!Object}
 */
ydn.db.con.SimpleStorage.prototype.getStorage = function() {
  return this.cache_;
};


/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.doTransaction = function(trFn, scopes, mode,
                                                            oncompleted) {
  trFn(this);
  oncompleted(ydn.db.base.TransactionEventTypes.COMPLETE, {});
};



/**
 * @inheritDoc
 */
ydn.db.con.SimpleStorage.prototype.getSchema = function (callback) {
  goog.Timer.callOnce(function () {
    var stores = [];
    var db_value = this.cache_.getItem(this.makeKey());
    var store_names = db_value['stores'];
    for (var i = 0; i < store_names.length; i++) {
      var store_obj = this.cache_.getItem(this.makeKey(store_names[i]));
      stores[i] = new ydn.db.schema.Store(store_names[i],
        store_obj['keyPath'], store_obj['autoIncrement']);
    }
    var schema = new ydn.db.schema.Database(this.dbname, stores);
    callback(schema);
  }, 0, this);
};


/**
 * Extract inline key from the object, out-of-line key as provided or generate
 * from the store key generator.
 * @final
 * @protected
 * @param {ydn.db.schema.Store} store table name.
 * @param {!Object} value object having key in keyPath field.
 * @return {string} key as seen by user.
 */
ydn.db.con.SimpleStorage.prototype.extractKey = function (store, value, opt_key) {

  var key = goog.isDef(opt_key) ? opt_key :
    goog.isDefAndNotNull(store.keyPath) ? store.getKeyValue(value) : undefined;

  if (!goog.isDef(key)) {
    if (store.getAutoIncrement()) {
      var store_key = this.makeKey(store.name);
      var store_obj = this.storeSchema_[store.name];
      if (!goog.isDef(store_obj['autoIncrementNo'])) {
        store_obj['autoIncrementNo'] = this.getKeys(store.name, null).length;
      }
      store_obj['autoIncrementNo']++;
      key = store_obj['autoIncrementNo'];
    } else {
      if (ydn.db.con.SimpleStorage.DEBUG) {
        window.console.log([store, value, opt_key]);
      }
      throw new ydn.db.InvalidKeyException();
    }
  }

  return key;
};


/**
 * Use store name and id to form a key to use in setting key to storage.
 * @protected
 * @final
 * @param {string=} store_name table name.
 * @param {(string|number|Date|!Array)=} id id.
 * @return {string} canonical key name.
 */
ydn.db.con.SimpleStorage.prototype.makeKey = function(store_name, id) {
  var parts = [ydn.db.con.SimpleStorage.NAMESPACE, this.dbname];
  if (goog.isDef(store_name)) {
    parts.push(store_name);
    if (goog.isDef(id)) {
      parts.push(ydn.db.utils.encodeKey(id));
    }
  }
  return parts.join(ydn.db.con.SimpleStorage.SEP);
};


/**
 *
 * @param {!ydn.db.schema.Store|string} store_name store schema or name.
 * @param {(string|number|Date|!Array)} id id.
 * @return {*} the value obtained.
 * @final
 */
ydn.db.con.SimpleStorage.prototype.getItemInternal = function(store_name, id) {
  var store = store_name instanceof ydn.db.schema.Store ?
      store_name.name : store_name;
  var key = this.makeKey(store, id);
  var value = this.cache_.getItem(key);
  if (!goog.isNull(value)) {
    value = ydn.json.parse(/** @type {string} */ (value));
  } else {
    value = undefined; // localStorage return null for not existing value
  }
  return value;
};


/**
 *
 * @param {!Object} value the value.
 * @param {string} store_name store name.
 * @param {*=} id optional out-of-line key.
 * @return {string} key key as seen by user.
 * @final
 */
ydn.db.con.SimpleStorage.prototype.setItemInternal = function(
    value, store_name, id) {
  var store = this.schema.getStore(store_name);
  var index_name = store.getKeyPath() ||
      ydn.db.con.SimpleStorage.DEFAULT_KEY_PATH;
  goog.asserts.assertObject(value);
  var obj_id = this.extractKey(store, value, id);
  var key = this.makeKey(store_name, obj_id);
  var str = ydn.json.stringify(value);
  if (ydn.db.con.SimpleStorage.DEBUG) {
    window.console.log(['setItemInternal', store_name, id, obj_id, key, str]);
  }
  this.cache_.setItem(key, str);
  var idx_arr = this.storeSchema_[store_name]['Keys'];
  if (idx_arr) {
    goog.asserts.assertArray(idx_arr);
    for (var i = 0, n = idx_arr.length; i < n; i++) {
      if (obj_id == idx_arr[i]) {
        break;
      } else if (obj_id > idx_arr[i]) {
        goog.array.insertAt(idx_arr, obj_id, i);
        break;
      }
    }
  }

  return obj_id;
};


/**
 *
 * @param {string=} store_name store name or key.
 * @param {(!Array|string|number)=} id  id.
 * @final
 */
ydn.db.con.SimpleStorage.prototype.removeItemInternal = function(
    store_name, id){

  if (goog.isDef(id)) {
    this.cache_.removeItem(this.makeKey(store_name, id));
    var idx_arr = this.storeSchema_[store_name]['Keys'];
    if (goog.isDef(idx_arr)) {
      goog.array.remove(idx_arr, id);
    }
  } else if (goog.isDef(store_name)) {
    if (this.storeSchema_[store_name]) {
      this.storeSchema_[store_name]['Keys'] = null;
    }
    var base = this.makeKey(store_name) + ydn.db.con.SimpleStorage.SEP;
    for (var i = this.cache_.length - 1; i >= 0; i--) {
      var k = this.cache_.key(i);
      goog.asserts.assertString(k);
      if (goog.string.startsWith(k, base)) {
        this.cache_.removeItem(k);
      }
    }
  } else {
    var base = this.makeKey() + ydn.db.con.SimpleStorage.SEP;
    for (var i = this.cache_.length - 1; i >= 0; i--) {
      var k = this.cache_.key(i);
      goog.asserts.assertString(k);
      if (goog.string.startsWith(k, base)) {
        this.cache_.removeItem(k);
      }
    }
  }
};


/**
 * Index a given store.
 * @param {string} store_name store name.
 * @param {string=} index_name index name. Default to primary key.
 * @return {!Array.<string>} list of keys in the store.
 */
ydn.db.con.SimpleStorage.prototype.index = function(store_name, index_name) {
  /**
   *
   * @type {StoreSchema}
   */
  var store_json = this.storeSchema_[store_name];
  var keys = store_json['Keys'];
  if (!goog.isDefAndNotNull(keys)) {
    keys = [];
    var indexes = {};
    var base = this.makeKey(store_name);
    base += ydn.db.con.SimpleStorage.SEP;
    //console.log(['base', store_name, base]);
    for (var i = 0, n = this.cache_.length; i < n; i++) {
      var key = this.cache_.key(i);
      goog.asserts.assertString(key);
      if (goog.string.startsWith(key, base)) {
        //console.log(['key ' + keys.length, key]);
        keys.push(key);
        for (var j = 0, m = store_json.indexes.length; j < m; j++) {
          var idxKeyPath = store_json.indexes[i];
          // TODO: indexing
        }
      }
    }
    goog.array.sort(keys);
    store_json['Keys'] = keys;
    store_json['indexes'] = indexes;
  }
  return keys;
};


/**
 * Get list of primary key between given range.
 * @param {string} store_name store name.
 * @param {string?} index_name index name.
 * @param {string=} lower lower bound of key range.
 * @param {string=} upper upper bound of key range.
 * @param {boolean=} lowerOpen true if lower bound is open.
 * @param {boolean=} upperOpen true if upper bound is open.
 * @return {!Array.<string>} keys.
 * @final
 */
ydn.db.con.SimpleStorage.prototype.getKeys = function(store_name, index_name,
    lower, upper, lowerOpen, upperOpen) {
  if (goog.isDefAndNotNull(index_name)) {
    throw new ydn.error.NotImplementedException();
  }
  var keys = this.index(store_name);

  var cmp_upper = function () {
    if (upperOpen) {
      return function (x) {
        return x <= upper;
      }
    } else {
      return function (x) {
        return x < upper;
      }
    }
  };

  var cmp_lower = function () {
    if (lowerOpen) {
      return function (x) {
        return x > lower;
      }
    } else {
      return function (x) {
        return x >= lower;
      }
    }
  };

  if (!goog.isDef(lower) && !goog.isDef(upper)) {
    return keys;
  } else if (!goog.isDef(lower)) {
    var idx = goog.array.findIndex(keys, cmp_upper());
    return keys.slice(0, idx);
  } else if (!goog.isDef(upper)) {
    var idx = goog.array.findIndex(keys, cmp_lower());
    return keys.slice(idx);
  } else {
    var idx1 = goog.array.findIndex(keys, cmp_upper());
    var idx2 = goog.array.findIndex(keys, cmp_lower());
    return keys.slice(idx1, idx2);
  }
};



