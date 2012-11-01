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
 * @fileoverview Base database service provider.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.tr.Storage');
goog.require('ydn.db.con.Storage');
goog.require('ydn.db.tr.IStorage');
goog.require('ydn.db.tr.TxStorage');



/**
 * Create storage providing method to run in transaction.
 *
 * @param {string=} opt_dbname database name.
 * @param {!ydn.db.schema.Database|DatabaseSchema=} opt_schema database schema
 * or its configuration in JSON format. If not provided, default empty schema
 * is used.
 * schema used in chronical order.
 * @param {!StorageOptions=} opt_options options.
 * @implements {ydn.db.tr.IStorage}
 * @extends {ydn.db.con.Storage}
 * @constructor
 */
ydn.db.tr.Storage = function(opt_dbname, opt_schema, opt_options) {
  goog.base(this, opt_dbname, opt_schema, opt_options);
  this.ptx_no = 0;
};
goog.inherits(ydn.db.tr.Storage, ydn.db.con.Storage);



/**
 *
 * @type {number}
 * @protected
 */
ydn.db.tr.Storage.prototype.ptx_no = 0;



/**
 * @inheritDoc
 */
ydn.db.tr.Storage.prototype.getTxNo = function() {
  return this.ptx_no;
};


/**
 * @protected
 * @param {string} scope_name scope name.
 * @return {!ydn.db.tr.TxStorage} new transactional storage.
 */
ydn.db.tr.Storage.prototype.newTxInstance = function(scope_name) {
  return new ydn.db.tr.TxStorage(this, this.ptx_no++, scope_name);
};



/**
 * @inheritDoc
 */
ydn.db.tr.Storage.prototype.run = function(trFn, store_names, opt_mode,
                                                    oncompleted, opt_args) {

  var scope_name = trFn.name || '';
  var tx_queue = this.newTxInstance(scope_name);
  if (arguments.length > 4) {
    var args = Array.prototype.slice.call(arguments, 4);
    var outFn = function() {
      // Postpend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      //newArgs.unshift.apply(newArgs, args);
      newArgs = newArgs.concat(args);
      return trFn.apply(this, newArgs);
    };
    outFn.name = trFn.name;
    tx_queue.run(outFn, store_names, opt_mode, oncompleted);
  } else { // optional are strip
    tx_queue.run(trFn, store_names, opt_mode, oncompleted);
  }

};


