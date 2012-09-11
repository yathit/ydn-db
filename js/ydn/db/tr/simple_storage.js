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

goog.provide('ydn.db.tr.SimpleStorage');
goog.require('ydn.db.adapter.SimpleStorage');
goog.require('ydn.db.tr.Service');


/**
 * @implements {ydn.db.tr.Service}
 * @param {string} dbname dtabase name.
 * @param {!ydn.db.DatabaseSchema} schema table schema contain table
 * name and keyPath.
 * @param {Object=} opt_localStorage
 * @extends {ydn.db.adapter.SimpleStorage}
 * @constructor
 */
ydn.db.tr.SimpleStorage = function(dbname, schema, opt_localStorage) {
  goog.base(this, dbname, schema, opt_localStorage);
};
goog.inherits(ydn.db.tr.SimpleStorage, ydn.db.adapter.SimpleStorage);




/**
 * One database can have only one transaction.
 * @private
 * @final
 * @type {!ydn.db.tr.Mutex}
 */
ydn.db.tr.SimpleStorage.prototype.mu_tx_ = new ydn.db.tr.Mutex();


/**
 * Obtain active consumable transaction object.
 * @final
 * @protected
 * @return {ydn.db.tr.Mutex} transaction object if active and available.
 */
ydn.db.tr.SimpleStorage.prototype.getActiveTx = function() {
  return this.mu_tx_.isActiveAndAvailable() ? this.mu_tx_ : null;
};


/**
 * @final
 */
ydn.db.tr.SimpleStorage.prototype.doTxTransaction = function(trFn, scopes, mode) {
  if (this.mu_tx_.isActive()) {
    this.mu_tx_.down(ydn.db.TransactionEventTypes.COMPLETE, null);
  }
  this.mu_tx_.up(this.cache_);
  trFn(this.mu_tx_);
};


