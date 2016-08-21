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
 * @fileoverview Checkvist content renderer.
 */



/**
 * Checkvist content renderer.
 * @param {string} service_id service id.
 * @param {JsonClient} service Checkvist resource service.
 * @constructor
 */
var Checkvist = function(service_id, service) {
  this.ul_checklists = document.getElementById('checklists');
  var schema = {
    stores: [{
      name: 'checklists',
      keyPath: 'id',
      Sync: {
        format: 'json',
        transport: service,
        Options: {
          baseUri: '/',
          delimiter: '/'
        }
      }
    }]
  };
  this.db = new ydn.db.Storage(service_id, schema);
};


/**
 * Render checklist.
 * @param {Array} list list of checklist.
 * @private
 */
Checkvist.prototype.render_ = function(list) {
  var fg = document.createDocumentFragment();
  for (var i = 0; i < list.length; i++) {
    var li = document.createElement('LI');
    li.textContent = list[i].name;
    li.value = list[i].id;
    fg.appendChild(li);
  }
  this.ul_checklists.innerHTML = '';
  this.ul_checklists.appendChild(fg);
};


/**
 * Refresh UI.
 */
Checkvist.prototype.refresh = function() {
  var me = this;
  var req = this.db.values('checklists').then(function(list) {
    console.log(list); // from server
    setTimeout(function() {
      me.render_(list);
    }, 4);
  }, function(e) {
    throw e;
  }, this);
};


/**
 * Dispose this.
 */
Checkvist.prototype.dispose = function() {
  // console.log('dispose')
  this.service = null;
  this.ul_checklists.innerHTML = '';
  var db_name = this.db.getName();
  var type = this.db.getType();
  this.db.close();
  this.db = null;
  ydn.db.deleteDatabase(db_name, type);
};
