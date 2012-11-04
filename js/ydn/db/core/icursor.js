/**
 * @fileoverview Transient cursor.
 */


goog.provide('ydn.db.ICursor');


/**
 *
 * @interface
 */
ydn.db.ICursor = function() {
};


/**
 *
 * @param {number=} store index, starting from base to peer stores.
 * @return {*} return store key.
 */
ydn.db.ICursor.prototype.key = goog.abstractMethod;


/**
 *
 * @param {number=} store index, starting from base to peer stores.
 * @return {*} return index key.
 */
ydn.db.ICursor.prototype.indexKey = goog.abstractMethod;


/**
 *
 * @param {number=} store index, starting from base to peer stores.
 * @return {*} return cursor value.
 */
ydn.db.ICursor.prototype.value = goog.abstractMethod;


/**
 * @param {*} cursor value to update.
 * @param {number=} store index, starting from base to peer stores.
 * @return {!goog.async.Deferred} promise for complete.
 */
ydn.db.ICursor.prototype.update = goog.abstractMethod;


/**
 * @param {number=} store index, starting from base to peer stores.
 * @return {!goog.async.Deferred} promise for complete.
 */
ydn.db.ICursor.prototype.clear = goog.abstractMethod;

/**
 * final call to clear references.
 */
ydn.db.ICursor.prototype.dispose = goog.abstractMethod;

