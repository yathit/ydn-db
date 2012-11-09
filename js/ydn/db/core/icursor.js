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
 * final call to clear references.
 */
ydn.db.ICursor.prototype.dispose = goog.abstractMethod;

