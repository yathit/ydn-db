// Copyright 2013 YDN Authors. All Rights Reserved.
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
 * @fileoverview Interface for CRUD service provider.
 *
 * Backend service will implement this service provider for Entity data source.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */


goog.provide('ydn.db.sync.IService');



/**
 * Restful HTTP service.
 * @interface
 */
ydn.db.sync.IService = function() {

};


/**
 * Get resource by its name.
 * Get resource from server using given name to build resource URI and return
 * resource object.
 * If object with validator token already exists in the database and the token
 * will be provided. HTTP requester should use the token as in 'If-Match' or
 * 'If-Modified-Since' header. Server should return 304 if not modified.
 * Returning status code 200 or 201 will update the resource.
 * If navigator is not online, callback should invoke with 503 status.
 * @param {function(number, Object, *)} callback invokes with HTTP status code,
 * resource object and validator token.
 * @param {string} name entity name
 * @param {IDBKey} id entity id
 * @param {*} token validator token
 */
ydn.db.sync.IService.prototype.get = function(callback, name, id, token) {

};


/**
 * Add resource to backend service.
 * @param {function(number, Object, IDBKey, *)} callback with status code,
 * resource body, resource key and validation token after persisting to
 * backend service.
 * @param {string} name entity name.
 * @param {Object} obj resource to persist.
 */
ydn.db.sync.IService.prototype.add = function(callback, name, obj) {

};


/**
 * Update resource to backend service.
 * @param {function(number, Object, IDBKey, *)} callback status code and result
 * @param {string} name entity name.
 * @param {Object} obj resource object.
 * @param {IDBKey} id resource name.
 * @param {*} token validator token
 */
ydn.db.sync.IService.prototype.put = function(callback, name, obj, id, token) {

};


/**
 * Remove resource to backend service.
 * @param {function(number)} callback status code.
 * @param {string} name entity name.
 * @param {IDBKey} id resource name.
 * @param {*} token validator token.
 */
ydn.db.sync.IService.prototype.remove = function(callback, name, id, token) {

};


/**
 * List resource collection to be update into the database.
 * This method is used only when entity is synchronized by queue method.
 * @param {function(number, !Array.<Object>, !Array.<IDBKey>, !Array.<*>, *)} callback
 * return list of entities with its keys and validation tokens. The last is
 * next paging token. If paging token is is not `null`, list method will be
 * invoked again with given paging token.
 * @param {string} name entity name
 * @param {*} token paging token. If paging token is not provided, paging token should be
 * read from the database.
 */
ydn.db.sync.IService.prototype.list = function(callback, name, token) {

};


