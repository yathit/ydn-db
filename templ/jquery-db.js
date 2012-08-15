/**
 * @fileoverview Database plugin for jQuery.
 *
 * In jquery, this plugin bereave like single database instance.
 */


(function( $ ) {

  $.fn.db = {

    // inject ydn.db.Storage here.

    /** Open database */
    open: function(db_name, schema) {
      var db = ydn.db.Storage(db_name, schema);

      // copy all methods
      for (var method in db) {
        if (db.isPrototypeOf(method)) {
          $.fn.db[method] = function(var_args) {
            // bound to db instance.
            return method.apply(db, arguments);
          };
        }
      }
    }
  }



})( jQuery );
