/**
 * @license Copyright 2012 YDN Authors, Yathit. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");.
 */
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
 * @fileoverview Checkvist API to Google cloud storage like adaptor.
 */



/**
 * @param {gapi.client} RESTful HTTP client.
 * @constructor
 */
var JsonClient = function(service) {
  /**
   * @type {gapi.client}
   */
  this.service = service;
};


/**
 * Send HTTP request for making RESTful requests.
 * @link https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiclientrequest
 * @param {Object} args
 */
JsonClient.prototype.request = function(args) {
  var callback = args.callback;
  /**
   * Convert Checkvist API to Google Cloud Storage like API.
   * @link https://developers.google.com/storage/docs/json_api/v1/objects
   * @param json
   * @param raw
   */
  var checklists_callback = function(list, raw) {
    var json = {
      kind: 'checklists#objects',
      contentType: 'application/json',
      prefixes: ['/checklists'],
      items: []
    };
    for (var i = 0; i < list.length; i++) {
      json.items[i] = {
        kind: 'checklists#object',
        contentType: 'application/json',
        id: list[i].id,
        updated: list[i].updated_at
      };
    }
    callback(json, raw);
  };
  args.callback = args.path == '/checklists' ?
      checklists_callback : args.callback;
  this.service.request(args);
};
