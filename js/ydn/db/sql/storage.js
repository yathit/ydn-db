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
 * @fileoverview Provide SQL service.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */

goog.provide('ydn.db.sql');
goog.require('ydn.db.Sql');



/**
 * @param {!ydn.db.Iterator|!ydn.db.Sql} q query.
 * @return {!goog.async.Deferred} return result as list.
 */
ydn.db.Storage.prototype.execute = function(q) {
  return this.default_tx_queue_.execute(q);
};



/**
 * @param {!ydn.db.Iterator|!ydn.db.Sql} q query.
 * @return {!goog.async.Deferred} return result as list.
 */
ydn.db.TxStorage.prototype.execute = function(q) {

  var df = ydn.db.base.createDeferred();


  if (q instanceof ydn.db.Sql) {
    var sql = q;
    this.exec(function(executor) {
      executor.executeSql(df, sql);
    }, sql.stores(), ydn.db.base.TransactionMode.READ_ONLY);

  } else {
    throw new ydn.error.ArgumentException();
  }

  return df;
};

