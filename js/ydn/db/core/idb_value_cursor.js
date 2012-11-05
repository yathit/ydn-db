/**
 * @fileoverview Transient cursor.
 */


goog.provide('ydn.db.IDBValueCursor');
goog.require('ydn.db.ICursor');


/**
 *
 * @param {IDBCursorWithValue} cursor cursor.
 * @param {!Array.<IDBCursorWithValue>} peerCursors peer cursors.
 * @param {boolean} readonly true for readonly.
 * @constructor
 * @implements {ydn.db.ICursor}
 */
ydn.db.IDBValueCursor = function(cursor, peerCursors, readonly) {
  this.cursor_ = cursor;
  this.peerCursors_ = peerCursors;
  this.readonly_ = readonly;
};


/**
 * @private
 * @type {IDBCursorWithValue}
 */
ydn.db.IDBValueCursor.prototype.cursor_ = null;


/**
 * @private
 * @type {Array.<IDBCursorWithValue>}
 */
ydn.db.IDBValueCursor.prototype.peerCursors_ = null;


/**
 * @private
 * @type {boolean}
 */
ydn.db.IDBValueCursor.prototype.readonly_ = true;


/**
 * Release references.
 */
ydn.db.IDBValueCursor.prototype.dispose = function() {
  this.cursor_ = null;
  this.peerCursors_ = null;
};


/**
 * @inheritDoc
 */
ydn.db.IDBValueCursor.prototype.key = function(i) {
  if (!this.cursor_) {
    throw new ydn.error.InvalidOperationException();
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
ydn.db.IDBValueCursor.prototype.indexKey = function(i) {
  if (!this.cursor_) {
    throw new ydn.error.InvalidOperationException();
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


/**
 * @inheritDoc
 */
ydn.db.IDBValueCursor.prototype.value = function(i) {
  if (!this.cursor_) {
    throw new ydn.error.InvalidOperationException();
  }
  if (!goog.isDef(i) || i == 0) {
    return this.cursor_.value;
  } else {
    i--;
    if (i > 0 && i < this.peerCursors_.length) {
      return this.peerCursors_[i].value;
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
};


/**
 * @inheritDoc
 */
ydn.db.IDBValueCursor.prototype.update = function(value, i) {
  if (this.readonly_) {
    throw new ydn.error.ArgumentException();
  }
  if (!this.cursor_) {
    throw new ydn.error.InvalidOperationException();
  }
  var cur;
  if (!goog.isDef(i) || i == 0) {
    cur = this.cursor_;
  } else {
    i--;
    if (i > 0 && i < this.peerCursors_.length) {
      cur = this.peerCursors_[i];
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
  var req = cur.update(value);
  var del_df = new goog.async.Deferred();
  req.onerror = function(e) {
    del_df.errback(e);
  };
  req.onsuccess = function(x) {
    del_df.callback(x);
  };
  return del_df;
};


/**
 * @inheritDoc
 */
ydn.db.IDBValueCursor.prototype.clear = function(i) {
  if (this.readonly_) {
    throw new ydn.error.ArgumentException();
  }
  if (!this.cursor_) {
    throw new ydn.error.InvalidOperationException();
  }
  var cur;
  if (!goog.isDef(i) || i == 0) {
    cur = this.cursor_;
  } else {
    i--;
    if (i > 0 && i < this.peerCursors_.length) {
      cur = this.peerCursors_[i];
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
  var req = cur['delete']();
  var del_df = new goog.async.Deferred();
  req.onerror = function(e) {
    del_df.errback(e);
  };
  req.onsuccess = function(x) {
    del_df.callback(x);
  };
  return del_df;
};
