/**
 * @fileoverview adaptor for rich storage mechanism supporting expiration
 * and encryption.
 *
 * @suppress {accessControls}
 */


// Note: intentionally not exported.
// This class is supposed to be inner class of ydn.db.Storage.
goog.provide('ydn.db.RichStorage_');
goog.require('goog.storage.ExpiringStorage');
goog.require('goog.storage.EncryptedStorage');


/**
 * @param {!ydn.db.Storage} parent
 * @param {string} secret
 * @param {number=} opt_default_expiration
 * @constructor
 */
ydn.db.RichStorage = function(parent, secret, opt_default_expiration) {

  /**
   *
   * @type {goog.json.Serializer}
   * @private
   */
  this.cleartextSerializer_ = new goog.json.Serializer();

  /**
   *
   * @type {!ydn.db.Storage}
   */
  this.parent = parent;
  /**
   * Note: this is used in goog.storage.EncryptedStorage as a
   * private class variable.
   * @private
   * @final
   * @type {Array.<number>}
   */
  this.secret_ = goog.crypt.stringToByteArray(secret);
  /**
   * @protected
   * @final
   * @type {number|undefined}
   */
  this.default_expiration = opt_default_expiration;
};


/**
 * Checks if the data item has expired.
 *
 * @param {!Object} wrapper The wrapper.
 * @return {boolean} True if the item has expired.
 */
ydn.db.RichStorage.isExpired = function(wrapper) {
  var creation = goog.storage.ExpiringStorage.getCreationTime(wrapper);
  var expiration = goog.storage.ExpiringStorage.getExpirationTime(wrapper);
  return !!expiration && expiration < goog.now() ||
    !!creation && creation > goog.now();
};


/**
 * @const
 * @type {string}
 */
ydn.db.RichStorage.EXPIRATION_TIME_KEY = goog.storage.ExpiringStorage.EXPIRATION_TIME_KEY;


/**
 * @const
 * @type {string}
 */
ydn.db.RichStorage.CREATION_TIME_KEY = goog.storage.ExpiringStorage.CREATION_TIME_KEY;

/**
 * @const
 * @type {string}
 */
ydn.db.RichStorage.DATA_KEY = goog.storage.RichStorage.DATA_KEY;



/**
 * Hashes a key using the secret.
 *
 * @this {goog.storage.EncryptedStorage}
 * @param {string} key The key.
 * @return {string} The hash.
 * @private
 */
ydn.db.RichStorage.prototype.hashKeyWithSecret_ =
  goog.storage.EncryptedStorage.prototype.hashKeyWithSecret_;

/**
 * Encrypts a value using a key, a salt, and the secret.
 *
 * @this {goog.storage.EncryptedStorage}
 * @param {!Array.<number>} salt The salt.
 * @param {string} key The key.
 * @param {string} value The cleartext value.
 * @return {string} The encrypted value.
 * @private
 */
ydn.db.RichStorage.prototype.encryptValue_ =
  goog.storage.EncryptedStorage.prototype.encryptValue_;



/**
 * Decrypts a value using a key, a salt, and the secret.
 *
 * @this {goog.storage.EncryptedStorage}
 * @param {!Array.<number>} salt The salt.
 * @param {string} key The key.
 * @param {string} value The encrypted value.
 * @return {string} The decrypted value.
 * @private
 */
ydn.db.RichStorage.prototype.decryptValue_ =
  goog.storage.EncryptedStorage.prototype.decryptValue_;


/**
 *
 * @param {string} key
 * @param {string} value
 * @return {string|undefined}
 */
ydn.db.RichStorage.prototype.unwrapValue = function(key, value) {
  var wrapper = JSON.parse(value);
  goog.asserts.assertObject(wrapper, key + ' corrupted: ' + value);

  // get (getWrapper) method in goog.storage.EncryptedStorage
  var salt = wrapper[goog.storage.EncryptedStorage.SALT_KEY];
  if (!goog.isString(value) || !goog.isArray(salt) || !salt.length) {
    throw goog.storage.ErrorCode.INVALID_VALUE;
  }
  var json = this.decryptValue_(salt, key, value);
  /** @preserveTry */
  try {
    wrapper[goog.storage.RichStorage.DATA_KEY] = goog.json.parse(json);
  } catch (e) {
    throw goog.storage.ErrorCode.DECRYPTION_ERROR;
  }

  // set method in goog.storage.ExpiringStorage
  if (goog.storage.ExpiringStorage.isExpired(wrapper)) {
    this.parent.removeItem(key);
    return undefined;
  }

  var data = /** @type {string} */ (wrapper[ydn.db.RichStorage.DATA_KEY]);
  goog.asserts.assertString(data);
  return data;
};


/**
 *
 * @param {string} key
 * @param {string} value
 * @param {number=} opt_expiration
 * @return {string}
 */
ydn.db.RichStorage.prototype.wrapValue = function(key, value, opt_expiration) {

  // set method in goog.storage.EncryptedStorage
  key = this.hashKeyWithSecret_(key);
  var salt = [];
  // 64-bit random salt.
  for (var i = 0; i < 8; ++i) {
    salt[i] = Math.floor(Math.random() * 0x100);
  }
  value = this.encryptValue_(salt, key,
    this.cleartextSerializer_.serialize(value));

  var wrapper = {};
  wrapper[ydn.db.RichStorage.DATA_KEY] = value;
  if (goog.isDef(opt_expiration)) {
    goog.asserts.assert(opt_expiration > 0, 'expiration time must be a number ' +
      ' but ' + opt_expiration + ' found.');
  } else {
    opt_expiration = this.default_expiration;
  }
  if (opt_expiration) {
    wrapper[ydn.db.RichStorage.EXPIRATION_TIME_KEY] =
      opt_expiration;
  }
  wrapper[ydn.db.RichStorage.CREATION_TIME_KEY] = goog.now();
  return ydn.json.stringify(wrapper);
};
