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

goog.provide('ydn.db.index.req.SimpleStore');
goog.require('ydn.db.core.req.SimpleStore');
goog.require('ydn.db.index.req.IRequestExecutor');


/**
 * @extends {ydn.db.core.req.SimpleStore}
 * @param {string} dbname database name.
 * @param {!ydn.db.schema.Database} schema schema.
 * @constructor
 * @implements {ydn.db.index.req.IRequestExecutor}
 */
ydn.db.index.req.SimpleStore = function(dbname, schema) {
  goog.base(this, dbname, schema);
};
goog.inherits(ydn.db.index.req.SimpleStore, ydn.db.core.req.SimpleStore);


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.getByIterator = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.executeSql = goog.abstractMethod;


/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.explainSql = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.getIndexKeysByKeys = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.getKeysByIndexKeyRange = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.listByIterator = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.open = goog.abstractMethod;

/**
 * @inheritDoc
 */
ydn.db.index.req.SimpleStore.prototype.scan = goog.abstractMethod;