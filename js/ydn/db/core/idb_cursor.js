/**
 * @fileoverview Transient cursor.
 */


goog.provide('ydn.db.IDBCursor');
goog.require('ydn.db.ICursor');


/**
 *
 * @param {IDBCursor} cursor cursor.
 * @param {!Array.<IDBCursor>} peerCursors peer cursors.
 * @constructor
 * @implements {ydn.db.ICursor}
 */
ydn.db.IDBCursor = function(cursor, peerCursors) {
  this.cursor_ = cursor;
  this.peerCursors_ = peerCursors;
};


/**
 * @private
 * @type {IDBCursor}
 */
ydn.db.IDBCursor.prototype.cursor_ = null;


/**
 * @private
 * @type {Array.<IDBCursor>}
 */
ydn.db.IDBCursor.prototype.peerCursors_ = null;


/**
 * Release references.
 */
ydn.db.IDBCursor.prototype.dispose = function() {
  this.cursor_ = null;
  this.peerCursors_ = null;
};


/**
 * @inheritDoc
 */
ydn.db.IDBCursor.prototype.key = function(i) {
  if (!this.cursor_) {
    throw new ydn.db.InvalidStateError();
  }
  if (!goog.isDef(i) || i == 0) {
    return this.cursor_.key;
  } else {
    i--;
    if (i > 0 && i < this.peerCursors_.length) {
      return this.peerCursors_[i].key;
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
};


/**
 * @inheritDoc
 */
ydn.db.IDBCursor.prototype.indexKey = function(i) {
  if (!this.cursor_) {
    throw new ydn.db.InvalidStateError();
  }
  if (!goog.isDef(i) || i == 0) {
    return this.cursor_.primaryKey;
  } else {
    i--;
    if (i > 0 && i < this.peerCursors_.length) {
      return this.peerCursors_[i].primaryKey;
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
};

