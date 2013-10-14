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
 * @fileoverview Install events.
 *
 * @author kyawtun@yathit.com (Kyaw Tun)
 */
goog.provide('ydn.db.tr.events');
goog.require('goog.events.EventTarget');
goog.require('ydn.db.tr.Storage');




/**
 * @inheritDoc
 */
ydn.db.tr.Storage.prototype.addEventListener = function(type, handler,
                                                         opt_capture, opt_handlerScope) {
  if (type == 'ready') {
    // remove callback reference since 'ready' event is invoked only once.
    goog.events.listenOnce(this, type, handler, opt_capture, opt_handlerScope);
  } else {
    if (goog.DEBUG) {// don't allow to added non existing event type
      var event_types = this.getEventTypes();
      var checkType = function(type) {
        if (!goog.array.contains(event_types,
            type)) {
          throw new ydn.debug.error.ArgumentException('Invalid event type "' +
              type + '"');
        }
      };
      if (goog.isArrayLike(type)) {
        for (var i = 0; i < type.length; i++) {
          checkType(type[i]);
        }
      } else {
        checkType(type);
      }
    }
    goog.base(this, 'addEventListener', type, handler, opt_capture,
        opt_handlerScope);
  }
};

goog.exportProperty(goog.events.EventTarget.prototype, 'addEventListener',
    goog.events.EventTarget.prototype.addEventListener);
