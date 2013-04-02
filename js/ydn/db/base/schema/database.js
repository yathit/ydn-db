/**
 * @fileoverview Database schema.
 *
 * This data structure is immutable.
 */



goog.provide('ydn.db.schema.Database');


goog.require('ydn.db.schema.Store');
goog.require('ydn.db.Key');



/**
 *
 * @param {DatabaseSchema|number|string=} version version, if string, it must
 * be parse to int.
 * @param {!Array.<!ydn.db.schema.Store>=} opt_stores store schemas.
 * @constructor
 */
ydn.db.schema.Database = function(version, opt_stores) {

  /**
   * @type {number|undefined}
   */
  var ver;
  var stores = opt_stores;
  if (goog.isObject(version)) {
    /**
     * @type {DatabaseSchema}
     */
    var json = version;
    if (goog.DEBUG) {
      var fields = ['version', 'stores'];
      for (var key in json) {
        if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
          throw new ydn.debug.error.ArgumentException('Unknown field: ' + key +
            ' in schema.');
        }
      }
    }
    ver = json['version'];
    stores = [];
    var stores_json = json.stores || [];
    if (goog.DEBUG && !goog.isArray(stores_json)) {
      throw new ydn.debug.error.ArgumentException('stores must be array');
    }
    for (var i = 0; i < stores_json.length; i++) {
      var store = ydn.db.schema.Store.fromJSON(stores_json[i]);
      if (goog.DEBUG) {
        var idx = goog.array.findIndex(stores, function(x) {
          return x.name == store.name;
        });
        if (idx != -1) {
          throw new ydn.debug.error.ArgumentException('duplicate store name "' +
            store.name + '".');
        }

      }
      stores.push(store);
    }
  } else if (goog.isString(version)) {
    ver = version.length == 0 ?
      undefined : parseFloat(version);
  } else if (goog.isNumber(version)) {
    ver = version;
  }


  if (goog.isDef(ver)) {
    if (!goog.isNumber(ver) || ver < 0) {
      throw new ydn.debug.error.ArgumentException('Invalid version: ' + ver + ' (' +
          version + ')');
    }
    if (isNaN(ver)) {
      ver = undefined;
    }
  }
  if (goog.isDef(opt_stores) && (!goog.isArray(opt_stores) ||
      opt_stores.length > 0 && !(opt_stores[0] instanceof ydn.db.schema.Store)))
  {
    throw new ydn.debug.error.ArgumentException('stores');
  }

  /**
   * @type {number|undefined}
   */
  this.version = ver;

  this.is_auto_version_ = !goog.isDef(this.version);

  /**
   * @final
   * @type {!Array.<!ydn.db.schema.Store>}
   */
  this.stores = stores || [];

};


/**
 * @override
 * @return {!Object}
 */
ydn.db.schema.Database.prototype.toJSON = function() {

  var stores = this.stores.map(function(x) {return x.toJSON()});

  return {
    'version': this.version,
    'stores': stores};
};


/**
 *
 * @type {boolean} auto version status.
 * @private
 */
ydn.db.schema.Database.prototype.is_auto_version_ = false;



/**
 * Get schema version.
 * @return {number|undefined} version.
 */
ydn.db.schema.Database.prototype.getVersion = function() {
  return this.version;
};


/**
 * Update database schema for auto schema mode.
 * @param {number} version must be number type.
 */
ydn.db.schema.Database.prototype.setVersion = function(version) {
  goog.asserts.assert(this.is_auto_version_);
  goog.asserts.assertNumber(version);
  this.version = version;
};


/**
 *
 * @return {boolean} true if auto version.
 */
ydn.db.schema.Database.prototype.isAutoVersion = function() {
  return this.is_auto_version_;
};



/**
 *
 * @return {boolean} true if auto schema.
 */
ydn.db.schema.Database.prototype.isAutoSchema = function() {
  return false;
};


/**
 *
 * @return {!Array.<string>} list of store names.
 */
ydn.db.schema.Database.prototype.getStoreNames = function() {
  return this.stores.map(function(x) {return x.name;});
};
//
//
///**
// * @deprecated
// * @param {!DatabaseSchema} json Restore from json stream.
// * @return {!ydn.db.schema.Database} create new database schema from JSON
// * string.
// */
//ydn.db.schema.Database.fromJSON = function(json) {
//  if (goog.DEBUG) {
//    var fields = ['version', 'stores'];
//    for (var key in json) {
//      if (json.hasOwnProperty(key) && goog.array.indexOf(fields, key) == -1) {
//        throw new ydn.debug.error.ArgumentException('Unknown field: ' + key + ' in ' +
//            ydn.json.stringify(json));
//      }
//    }
//  }
//  var stores = [];
//  var stores_json = json.stores || [];
//  for (var i = 0; i < stores_json.length; i++) {
//    stores.push(ydn.db.schema.Store.fromJSON(stores_json[i]));
//  }
//  return new ydn.db.schema.Database(json.version, stores);
//};


/**
 *
 * @param {number} idx index of stores.
 * @return {ydn.db.schema.Store} store schema at the index.
 */
ydn.db.schema.Database.prototype.store = function(idx) {
  return this.stores[idx] || null;
};


/**
 *
 * @return {number} number of store.
 */
ydn.db.schema.Database.prototype.count = function() {
  return this.stores.length;
};



/**
 *
 * @param {string} name store name.
 * @return {ydn.db.schema.Store} store if found.
 */
ydn.db.schema.Database.prototype.getStore = function(name) {
  return /** @type {ydn.db.schema.Store} */ (goog.array.find(this.stores,
      function(x) {
        return x.name == name;
      }));
};


/**
 * Get index of store.
 * @param {string} name store name.
 * @return {number} index of store -1 if not found.
 */
ydn.db.schema.Database.prototype.getIndexOf = function(name) {
  return goog.array.indexOf(this.stores,
      function(x) {
        return x.name == name;
      });
};


/**
 *
 * @param {string} name store name.
 * @return {boolean} return true if name found in stores.
 */
ydn.db.schema.Database.prototype.hasStore = function(name) {

  return goog.array.some(this.stores, function(x) {
    return x.name == name;
  });
};


/**
 * Return an explination what is different between the schemas.
 * @param {ydn.db.schema.Database} schema schema from sniffing.
 * @param {boolean=} hint hint the give schema.
 * @return {string} return empty string if the two are similar.
 */
ydn.db.schema.Database.prototype.difference = function(schema, hint) {
  if (!schema || this.stores.length != schema.stores.length) {
    return 'Number of store: ' + this.stores.length + ' vs ' +
      schema.stores.length;
  }
  for (var i = 0; i < this.stores.length; i++) {
    var store = schema.getStore(this.stores[i].name);
    // hint to sniffed schema, so that some lost info are recovered.
    var hinted_store = (!!store && !!hint) ? store.hint(this.stores[i]) : store;
    var msg = this.stores[i].difference(hinted_store);
    if (msg.length > 0) {
      return 'store: "' + this.stores[i].name + '" ' + msg;
    }
  }

  return '';
};


/**
 *
 * @param {ydn.db.schema.Database} schema schema.
 * @return {boolean} true if given schema is similar to this schema.
 */
ydn.db.schema.Database.prototype.similar = function(schema) {
  return this.difference(schema).length == 0;
};


/**
 *
 * @return {!Array.<string>} Return list of store names.
 */
ydn.db.schema.Database.prototype.listStores = function() {
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
