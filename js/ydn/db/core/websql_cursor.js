/**
 * @fileoverview Transient cursor.
 */


goog.provide('ydn.db.WebsqlCursor');
goog.require('ydn.db.ICursor');


/**
 *
 * @param {SQLTransaction} tx tx.
 * @param {*} key cursor key.
 * @param {*} value cursor value.
 * @param {!Array} peerKeys peer cursor keys.
 * @param {!Array} peerValues peer cursor values.
 * @constructor
 * @implements {ydn.db.ICursor}
 */
ydn.db.WebsqlCursor = function(tx, key, indexKey, value,
                               peerKeys, peerIndexKeys, peerValues) {
  this.tx_ = tx;
  this.key_ = key;
  this.indexKey_ = indexKey;
  this.value_ = value;
  this.peerKeys_ = peerKeys;
  this.peerIndexKeys_ = peerIndexKeys;
  this.peerValues_ = peerValues;
};


/**
 * @private
 * @type {SQLTransaction}
 */
ydn.db.WebsqlCursor.prototype.tx_ = null;


/**
 * @private
 * @type {*}
 */
ydn.db.WebsqlCursor.prototype.key_ = null;



/**
 * @private
 * @type {*}
 */
ydn.db.WebsqlCursor.prototype.indexKey_ = null;


/**
 * @private
 * @type {*}
 */
ydn.db.WebsqlCursor.prototype.value_ = null;


/**
 * @private
 * @type {Array}
 */
ydn.db.WebsqlCursor.prototype.peerKeys_ = null;


/**
 * @private
 * @type {Array}
 */
ydn.db.WebsqlCursor.prototype.peerIndexKeys_ = null;


/**
 * @private
 * @type {Array}
 */
ydn.db.WebsqlCursor.prototype.peerValues_ = null;


/**
 * Release references.
 */
ydn.db.WebsqlCursor.prototype.dispose = function() {
  this.tx_ = null;
  this.key_ = null;
  this.indexKey_ = null;
  this.value_ = null;
  this.peerKeys_ = null;
  this.peerIndexKeys_ = null;
  this.peerValues_ = null;
};


/**
 * @inheritDoc
 */
ydn.db.WebsqlCursor.prototype.key = function(i) {
  if (!goog.isDefAndNotNull(this.key_)) {
    throw new ydn.db.InvalidStateError();
  }
  if (!goog.isDef(i) || i == 0) {
    return this.key_;
  } else {
    i--;
    if (i > 0 && i < this.peerKeys_.length) {
      return this.peerKeys_[i];
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
};


/**
 * @inheritDoc
 */
ydn.db.WebsqlCursor.prototype.indexKey = function(i) {
  if (!goog.isDefAndNotNull(this.key_)) {
    throw new ydn.db.InvalidStateError();
  }
  if (!goog.isDef(i) || i == 0) {
    return this.indexKey_;
  } else {
    i--;
    if (i > 0 && i < this.peerIndexKeys_.length) {
      return this.peerIndexKeys_[i];
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
};


/**
 * @inheritDoc
 */
ydn.db.WebsqlCursor.prototype.value = function(i) {
  if (!goog.isDefAndNotNull(this.key_)) {
    throw new ydn.db.InvalidStateError();
  }
  if (!goog.isDef(i) || i == 0) {
    return this.value_;
  } else {
    i--;
    if (i > 0 && i < this.peerValues_.length) {
      return this.peerValues_[i];
    } else {
      throw new ydn.error.ArgumentException();
    }
  }
};

/**
 * @inheritDoc
 */
ydn.db.WebsqlCursor.prototype.clear = function(i) {
  throw new ydn.error.InvalidOperationException();
};


/**
 * @inheritDoc
 */
ydn.db.WebsqlCursor.prototype.update = function(value, i) {
  throw new ydn.error.InvalidOperationException();
};