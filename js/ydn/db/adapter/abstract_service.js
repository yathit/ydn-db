/**
 * @fileoverview Helper functions to ease implementation.
 */


goog.provide('ydn.db.AbstractService');
goog.require('ydn.db.Query');
goog.require('ydn.db.io.QueryService');
goog.require('ydn.db.Key');



/**
 * @constructor
 */
ydn.db.AbstractService = function() {};


/**
 * Close the connection.
 *
 * @return {!goog.async.Deferred} return a deferred function.
 */
ydn.db.AbstractService.prototype.close = goog.abstractMethod;


/**
 *
 * @return {string}
 */
ydn.db.AbstractService.prototype.type = goog.abstractMethod;

/**
 *
 * @return {*}
 */
ydn.db.AbstractService.prototype.getDbInstance = goog.abstractMethod;


/**
 *
 * @param {string} store_name
 * @param {string|number} id
 * @return {!goog.async.Deferred} return object in deferred function.
 * @protected
 */
ydn.db.AbstractService.prototype.getById = goog.abstractMethod;


/**
 *
 * @param {string} store_name
 * @param {!Array.<string|number>} ids
 * @return {!goog.async.Deferred} return object in deferred function.
 * @protected
 */
ydn.db.AbstractService.prototype.getByIds = goog.abstractMethod;

//
//
///**
// * Return object
// * @param {(string|!Array.<string>|!ydn.db.Key|!Array.<!ydn.db.Key>)=} arg1 table name.
// * @param {(string|number|!Array.<string>)=} arg2 object key to be retrieved, if not provided,
// * all entries in the store will return.
// * param {number=} start start number of entry.
// * param {number=} limit maximun number of entries.
// * @return {!goog.async.Deferred} return object in deferred function.
// */
//ydn.db.AbstractService.prototype.get = function (arg1, arg2) {
//
//  if (arg1 instanceof ydn.db.Key) {
//    /**
//     * @type {ydn.db.Key}
//     */
//    var k = arg1;
//    return this.getById(k.getStoreName(), k.getId());
//  } else if (goog.isString(arg1)) {
//    if (goog.isString(arg2) || goog.isNumber(arg2)) {
//      /** @type {string} */
//      var store_name = arg1;
//      /** @type {string|number} */
//      var id = arg2;
//      return this.getById(store_name, id);
//    } else if (!goog.isDef(arg2)) {
//      return this.getByStore_(arg1);
//    } else if (goog.isArray(arg2)) {
//      if (goog.isString(arg2[0]) || goog.isNumber(arg2[0])) {
//        return this.getByIds(arg1, arg2);
//      } else {
//        throw new ydn.error.ArgumentException();
//      }
//    } else {
//      throw new ydn.error.ArgumentException();
//    }
//  } else if (goog.isArray(arg1)) {
//    if (arg1[0] instanceof ydn.db.Key) {
//      return this.getByKeys_(arg1);
//    } else {
//      throw new ydn.error.ArgumentException();
//    }
//  } else if (!goog.isDef(arg1) && !goog.isDef(arg2)) {
//    return this.getByStore_();
//  } else {
//    throw new ydn.error.ArgumentException();
//  }
//
//};
