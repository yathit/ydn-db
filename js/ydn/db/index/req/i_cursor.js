/**
 * @fileoverview cursor interface.
 */


goog.provide('ydn.db.index.req.ICursor');


/**
 * @interface
 */
ydn.db.index.req.ICursor = function() {};


/**
 * Callback to receive requested cursor value.
 *
 * Requester must handle the cursor value synchronously and decide the
 * next move by invoking forward.
 * @param {*} key
 * @param {*} primary_key
 * @param {(*|undefined)} value
 */
ydn.db.index.req.ICursor.prototype.onNext = goog.abstractMethod;


/**
 *
 * @param {Error} error
 */
ydn.db.index.req.ICursor.prototype.onError = goog.abstractMethod;

/**
 * Callback for cursor onsuccess event.
 *
 * @param {*} key
 * @param {*} primary_key
 */
ydn.db.index.req.ICursor.prototype.onSuccess = goog.abstractMethod;


/**
 * Move cursor to next position.
 * @param {*} next position by giving index key. if no key is given, this
 * will move next cursor position. If end of cursor is reach, this will
 * invoke empty onNext callback.
 */
ydn.db.index.req.ICursor.prototype.forward = goog.abstractMethod;


/**
 * Move cursor to a given position by primary key.
 *
 * This will iterate the cursor records until the primary key is found without
 * changing index key. If index has change during iteration, this will invoke
 * onNext callback with resulting value. If given primary key is in wrong
 * direction, this will rewind and seek.
 * @param {*} primary key.
 */
ydn.db.index.req.ICursor.prototype.seek = goog.abstractMethod;