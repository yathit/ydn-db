/**
 * @fileoverview Exports for dev-ydn-db module.
 *
 */

goog.require('goog.debug.Console');
goog.require('goog.debug.Logger');
goog.require('goog.debug.LogManager');
goog.require('ydn.db.con.Storage');


(function() {
  var c = new goog.debug.Console();
  c.setCapturing(true);
  goog.debug.LogManager.getRoot().setLevel(goog.debug.Logger.Level.WARNING);
})();


/**
 *
 * @param {string=} scope
 * @param {string|number=} level
 */
ydn.db.log = function (scope, level) {

  scope = scope || 'ydn.db';
  var log_level = goog.isNumber(level) ? new goog.debug.Logger.Level('log', level) :
    goog.debug.Logger.Level.FINE;
  goog.debug.Logger.getLogger(scope).setLevel(log_level);

};

goog.exportSymbol('ydn.db.log', ydn.db.log);