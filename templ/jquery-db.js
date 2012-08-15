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
      var db = new ydn.db.Storage(db_name, schema);

      // copy all methods and bind to db.
      for (var method in db) {
        if (typeof db[method] == 'function') {
          $.fn.db[method] = db[method].bind(db);
        }
      }
    }

  }
})( jQuery );
