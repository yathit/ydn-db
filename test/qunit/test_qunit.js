

        var dbName = "TestDatabase";
        var objectStoreName = "objectStore";
        var anOtherObjectStoreName = "anOtherObjectStoreName";
        var indexProperty = "name";
        var insertData = { test: "insertData", name: "name", Id: 1 };
      var msgCreatingInitialSituationFailed = "Creating initial situation failed";

      function initionalSituation(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          callBack();
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationDatabase(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationDatabaseVersion(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName, 2).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStore(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName).then(function () {
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituation2ObjectStore(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName).then(function () {
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      linq2indexedDB.prototype.core.createObjectStore(args[0], anOtherObjectStoreName).then(function () {
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreNoAutoIncrement(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, {autoIncrement: false}).then(function () {
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreKeyPath(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, { autoIncrement: false, keyPath: "Id" }).then(function () {
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreKeyPathAutoIncrement(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, { autoIncrement: true, keyPath: "Id" }).then(function () {
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreWithData(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName).then(function (objectStoreArgs) {
        linq2indexedDB.prototype.core.insert(objectStoreArgs[1], insertData);
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreNoAutoIncrementWithData(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, { autoIncrement: false }).then(function (objectStoreArgs) {
        linq2indexedDB.prototype.core.insert(objectStoreArgs[1], insertData, insertData.Id);
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreKeyPathWithData(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, { autoIncrement: false, keyPath: "Id" }).then(function (objectStoreArgs) {
        linq2indexedDB.prototype.core.insert(objectStoreArgs[1], insertData);
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreKeyPathAutoIncrementWithData(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, { autoIncrement: true, keyPath: "Id" }).then(function (objectStoreArgs) {
        linq2indexedDB.prototype.core.insert(objectStoreArgs[1], insertData);
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationObjectStoreIndexUniqueWithData(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName).then(function (objectStoreArgs) {
        linq2indexedDB.prototype.core.createIndex(objectStoreArgs[1], indexProperty, { unique: true }).then(function () {
        linq2indexedDB.prototype.core.insert(objectStoreArgs[1], insertData);
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });

      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      function initionalSituationIndex(callBack) {
        linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            args[0].close();
            callBack();
          }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createIndex(linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName), indexProperty).then(function () {
        }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }
      });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      }

      module("Database");
      asyncTest("Opening/Creating Database", 3, function () {
        initionalSituation(function() {
          linq2indexedDB.prototype.core.db(dbName).then(function(args) {
            equal(args[0].name, dbName, "Database opened/created");
            // Necessary for indexeddb who work with setVersion
            equal(parseInt(args[0].version), 1, "Database opened/created");
            args[0].close();
            start();
          }, function() {
        ok(false, "Creating database failed");
        start();
        }, function(args) {
        equal(args[1].type, "upgradeneeded", "Upgrading database");
        });
      });
      });
      asyncTest("Opening/Creating Database with version", 5, function () {
        var version = 2;
        initionalSituation(function() {
        linq2indexedDB.prototype.core.db(dbName, version).then(function(args) {
        equal(args[0].name, dbName, "Database opened/created");
        equal(args[0].version, version, "Database version");
        args[0].close();
        start();
        }, function() {
        ok(false, "Creating/Opening database failed");
        start();
        }, function(args) {
        equal("upgradeneeded", args[1].type, "Upgrading database");
        equal(args[1].oldVersion, 0, "Old version");
        equal(args[1].newVersion, version, "New version");
        });
      });
      });
      asyncTest("Opening existing Database", 1, function () {
        initionalSituationDatabase(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            equal(args[0].name, dbName, "Database opened/created");
            args[0].close();
            start();
          }, function () {
        ok(false, "Creating/Opening database failed");
        start();
        }, function () {
        ok(false, "Upgrading database");
        });
      });
      });
      asyncTest("Opening existing Database with current version", 2, function () {
        var version = 1;
        initionalSituationDatabase(function () {
        linq2indexedDB.prototype.core.db(dbName, version).then(function (args) {
        equal(args[0].name, dbName, "Database opened/created");
        equal(args[0].version, version, "Database version");
        args[0].close();
        start();
        }, function () {
        ok(false, "Creating/Opening database failed");
        start();
        }, function () {
        ok(false, "Upgrading database");
        });
      });
      });
      asyncTest("Opening existing Database with lower version", 1, function () {
        var version = 1;
        initionalSituationDatabaseVersion(function () {
        linq2indexedDB.prototype.core.db(dbName, version).then(function (args) {
        ok(false, "Database opened/created");
        args[0].close();
        start();
        }, function (args) {
        equal(args.type, "VersionError", "Creating/Opening database failed");
        start();
        }, function () {
        ok(false, "Upgrading database");
        });
      });
      });
      asyncTest("Opening existing Database with higher version", 5, function () {
        var version = 2;
        initionalSituationDatabase(function () {
        linq2indexedDB.prototype.core.db(dbName, version).then(function (args) {
        equal(args[0].name, dbName, "Database opened/created");
        equal(args[0].version, version, "Database version");
        args[0].close();
        start();
        }, function () {
        ok(false, "Creating/Opening database failed");
        start();
        }, function (args) {
        equal("upgradeneeded", args[1].type, "Upgrading database");
        equal(args[1].oldVersion, 1, "Old version");
        equal(args[1].newVersion, version, "New version");
        });
      });
      });
      asyncTest("Deleting existing Database", 1, function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          args[0].close();
          linq2indexedDB.prototype.core.deleteDb(dbName).then(function () {
            ok(true, "Database removed");
            start();
          }, function () {
        ok(false, "Deleting database failed: ");
        start();
        });
      }, function () {
        ok(false, msgCreatingInitialSituationFailed);
        start();
        });
      });
      asyncTest("Deleting non existing Database", 1, function () {
        initionalSituation(function() {
          linq2indexedDB.prototype.core.deleteDb(dbName).then(function() {
            ok(true, "Database removed");
            start();
          }, function() {
        ok(false, "Deleting database failed");
        start();
        });
      });
      });

      module("Transaction");
      asyncTest("Opening transaction", 3, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName]).then(function (transArgs) {
              ok(true, "Transaction commited");
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        args[0].close();
        start();
        }, function (transArgs) {
        ok(true, "Transaction open");
        // Work around for chrome, if nothing gets queried, the transaction gets aborted.
        if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
        equal(transArgs[0].mode, "readonly");
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
        objArgs[1].get(1);
        });
      } else {
        equal(transArgs[0].mode, linq2indexedDB.prototype.core.transactionTypes.READ_ONLY);
        }
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening readonly transaction", 3, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              ok(true, "Transaction commited");
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        args[0].close();
        start();
        }, function (transArgs) {
        ok(true, "Transaction open");
        // Work around for chrome, if nothing gets queried, the transaction gets aborted.
        if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
        equal(transArgs[0].mode, "readonly");
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
        objArgs[1].get(1);
        });
      } else {
        equal(transArgs[0].mode, linq2indexedDB.prototype.core.transactionTypes.READ_ONLY);
        }
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening readwrite transaction", 3, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              ok(true, "Transaction commited");
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        args[0].close();
        start();
        }, function (transArgs) {
        ok(true, "Transaction open");
        // Work around for chrome, if nothing gets queried, the transaction gets aborted.
        if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
        equal(transArgs[0].mode, "readwrite");
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
        objArgs[1].get(1);
        });
      } else {
        equal(transArgs[0].mode, linq2indexedDB.prototype.core.transactionTypes.READ_WRITE);
        }
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Aborting transaction", 2, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName]).then(function (transArgs) {
              ok(false, "Transaction commited");
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted.");
        args[0].close();
        start();
        }, function (transArgs) {
        ok(true, "Transaction open");
        transArgs[0].abort();
        });
      start();
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening transaction - without objectStore", 1, function () {
        initionalSituation(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], []).then(function (transArgs) {
              ok(false, "Transaction commited");
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "InvalidAccessError", "Transaction error");
        args[0].close();
        start();
        }, function () {
        ok(false, "Transaction open");
        });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening transaction - non existing objectStore", 1, function () {
        var anOtherObjectStore = "anOtherObjectStore";
        initionalSituation(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
        linq2indexedDB.prototype.core.transaction(args[0], [anOtherObjectStore]).then(function (transArgs) {
        ok(false, "Transaction commited");
        transArgs[0].db.close();
        start();
        }, function (transArgs) {
        equal(transArgs.type, "NotFoundError", "Transaction error");
        args[0].close();
        start();
        }, function () {
        ok(false, "Transaction open");
        });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening transaction - non existing objectStore - autoGenerateAllowed", 3, function () {
        var anOtherObjectStore = "anOtherObjectStore";
        initionalSituation(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
        linq2indexedDB.prototype.core.transaction(args[0], [anOtherObjectStore], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY, true).then(function (transArgs) {
        ok(true, "Transaction commited");
        transArgs[0].db.close();
        start();
        }, function () {
        ok(false, "Transaction error");
        args[0].close();
        start();
        }, function (transArgs) {
        ok(true, "Transaction open");

        if (transArgs[0].db.objectStoreNames.contains(anOtherObjectStore)) {
        ok(true, "Object store present");
        }

      // Work around for chrome, if nothing gets queried, the transaction gets aborted.
      if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], anOtherObjectStore).then(function(objArgs) {
          objArgs[1].get(1);
        });
      }
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });

      module("ObjectStores");
      asyncTest("Creating ObjectStore", 3, function () {
        initionalSituation(function() {
          linq2indexedDB.prototype.core.db(dbName).then(function(args) {
            if (args[0].objectStoreNames.contains(objectStoreName)) {
              ok(true, "Object store present");
            }
      args[0].close();
      start();
      }, function() {
        ok(false, "Database error");
        start();
        }, function(args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName).then(function(objArgs) {
        ok(true, "Object store created");
        equals(objArgs[1].name, objectStoreName);
        }, function() {
        ok(false, "Creating object store failed");
        });
      }
      });
      });
      });
      asyncTest("Creating ObjectStore with options", 5, function () {
        var keyPath = "Id";
        var autoIncrement = true;
        initionalSituation(function() {
        linq2indexedDB.prototype.core.db(dbName).then(function(args) {
        if (args[0].objectStoreNames.contains(objectStoreName)) {
        ok(true, "Object store present");
        }
      args[0].close();
      start();
      }, function() {
        ok(false, "Database error");
        start();
        }, function(args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, { keyPath: keyPath, autoIncrement: autoIncrement }).then(function(objArgs) {
        ok(true, "Object store created");
        equals(objArgs[1].name, objectStoreName, "Object store name");
        equals(objArgs[1].keyPath, keyPath, "Object store keyPath");
        if (objArgs[1].autoIncrement) {
        equals(objArgs[1].autoIncrement, autoIncrement, "Object store autoIncrement");
        } else {
        ok(true, "Object store autoIncrement: attribute not implemented");
        }
      }, function() {
        ok(false, "Creating object store failed");
        });
      }
      });
      });
      });
      asyncTest("Creating ObjectStore in readwrite transaction", 1, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function(transArgs) {
              linq2indexedDB.prototype.core.createObjectStore(transArgs[0], "obj").then(function () {
                ok(false, "object store created");
              }, function(objArgs) {
        equal(objArgs.type, "InvalidStateError", objArgs.message);
        transArgs[0].db.close();
        start();
        });
      }, function() {
        ok(false, "transaction error");
        start();
        });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Creating ObjectStore with autoIncrement and array with empty string as keyPath", 2, function () {
        initionalSituation(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            if (args[0].objectStoreNames.contains(objectStoreName)) {
              ok(true, "Object store present");
            }
      args[0].close();
      start();
      }, function (args) {
        equal(args.type, "AbortError", args.message);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createObjectStore(args[0], objectStoreName, { keyPath: [""], autoIncrement: true }).then(function () {
        ok(false, "Object store created");
        }, function (objArgs) {
        equal(objArgs.type, "InvalidAccessError", objArgs.message);
        });
      }
      });
      });
      });
      asyncTest("Opening ObjectStore", 1, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          ok(true, "Object store open");
          // Work around for chrome, if nothing gets queried, the transaction gets aborted.
          if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
            objArgs[1].get(1);
          }
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening non existing ObjectStore", 2, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], "anOtherObjectStore").then(function () {
          ok(false, "Object store open");
        }, function (objArgs) {
        equal(objArgs.type, "NotFoundError", objArgs.message);
        });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening ObjectStore not in transaction scope", 2, function () {
        initionalSituation2ObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], anOtherObjectStoreName).then(function () {
          ok(false, "Object store open");
        }, function (objArgs) {
        equal(objArgs.type, "NotFoundError", objArgs.message);
        });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Deleting ObjectStore", 2, function () {
        initionalSituationObjectStore(function() {
          // Delete database if existing
          linq2indexedDB.prototype.core.db(dbName, 2).then(function(args) {
            if (!args[0].objectStoreNames.contains(objectStoreName)) {
              ok(true, "Object store is no longer present.");
            }
      args[0].close();
      start();
      }, function() {
        ok(false, "Database error");
        start();
        }, function(args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.deleteObjectStore(args[0], objectStoreName).then(function() {
        ok(true, "Object store deleted");
        }, function() {
        ok(false, "Deleting object store failed");
        });
      }
      });
      });
      });
      asyncTest("Deleting Non existing objectStore", 2, function () {
        initionalSituation(function () {
          // Delete database if existing
          linq2indexedDB.prototype.core.db(dbName, 2).then(function (args) {
            if (!args[0].objectStoreNames.contains(objectStoreName)) {
              ok(true, "Object store is no longer present.");
            }
      args[0].close();
      start();
      }, function (args) {
        equal(args.type, "AbortError", args.message);
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.deleteObjectStore(args[0], objectStoreName).then(function () {
        ok(false, "Object store deleted");
        }, function (objArgs) {
        equal(objArgs.type, "NotFoundError", objArgs.message);
        });
      }
      });
      });
      });
      asyncTest("Deleting ObjectStore in readwrite transaction", 1, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              linq2indexedDB.prototype.core.deleteObjectStore(transArgs[0], "obj").then(function () {
                ok(false, "object store created");
              }, function (objArgs) {
        equal(objArgs.type, "InvalidStateError", objArgs.message);
        transArgs[0].db.close();
        start();
        });
      }, function () {
        ok(false, "transaction error");
        start();
        });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });

      module("Indexes");
      asyncTest("Creating Index", 4, function () {
        initionalSituationObjectStore(function () {
          linq2indexedDB.prototype.core.db(dbName, 2).then(function(args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function(transArgs) {
              transArgs[0].db.close();
              start();
            }, function() {
        ok(false, "Transaction error");
        start();
        }, function(transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          // Work around for chrome, if nothing gets queried, the transaction gets aborted.
          if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
            objArgs[1].get(1);
          }
      if (objArgs[1].indexNames.contains(indexProperty + linq2indexedDB.prototype.core.indexSuffix)) {
        ok(true, "Index present");
        }
      });
      });
      }, function() {
        ok(false, "Database error");
        start();
        }, function(args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createIndex(linq2indexedDB.prototype.core.objectStore(args[0], objectStoreName), indexProperty).then(function(indexArgs) {
        ok(true, "Index created");
        equals(indexArgs[1].name, indexProperty + linq2indexedDB.prototype.core.indexSuffix);
        equals(indexArgs[1].keyPath, indexProperty);
        }, function() {
        ok(false, "Creating index failed");
        });
      }
      });
      });
      });
      asyncTest("Creating Index with options", 6, function () {
        var unique = true;
        var multiEntry = true;
        initionalSituationObjectStore(function () {
        linq2indexedDB.prototype.core.db(dbName, 2).then(function (args) {
        linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
        transArgs[0].db.close();
        start();
        }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          // Work around for chrome, if nothing gets queried, the transaction gets aborted.
          if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
            objArgs[1].get(1);
          }
      if (objArgs[1].indexNames.contains(indexProperty + linq2indexedDB.prototype.core.indexSuffix)) {
        ok(true, "Index present");
        }
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.createIndex(linq2indexedDB.prototype.core.objectStore(args[0], objectStoreName), indexProperty, {unique: unique, multiEntry: multiEntry}).then(function (indexArgs) {
        ok(true, "Index created");
        equals(indexArgs[1].name, indexProperty + linq2indexedDB.prototype.core.indexSuffix, "index name");
        equals(indexArgs[1].keyPath, indexProperty , "index keyPath");
        if (indexArgs[1].unique) {
        equals(indexArgs[1].unique, unique, "index unique attribute");
        }
      else {
        ok(true, "Index unique: attribute not implemented");
        }
      if (indexArgs[1].multiEntry || indexArgs[1].multiRow) {
        equals(indexArgs[1].multiEntry || indexArgs[1].multiRow, multiEntry, "index multiEntry attribute");
        }
      else {
        ok(true, "Index multiEntry: attribute not implemented");
        }
      }, function () {
        ok(false, "Creating index failed");
        });
      }
      });
      });
      });
      asyncTest("Opening Index", 1, function () {
        initionalSituationIndex(function () {
          // Delete database if existing
          linq2indexedDB.prototype.core.db(dbName, 2).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.index(objArgs[1], indexProperty).then(function (indexArgs) {
            ok(true, "Index open");
            if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
              indexArgs[1].get(1);
            }
      }, function () {
        ok(false, "Index error");
        start();
        });
      }, function () {
        ok(false, "Object store error");
        start();
        });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening Index - non existing index", 2, function () {
        var anotherIndex = "anotherIndex";
        initionalSituationIndex(function () {
        // Delete database if existing
        linq2indexedDB.prototype.core.db(dbName, 2).then(function (args) {
        linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
        transArgs[0].db.close();
        start();
        }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.index(objArgs[1], anotherIndex).then(function () {
            ok(false, "Index open");
            start();
          }, function () {
        ok(true, "Index error");
        start();
        });
      }, function () {
        ok(false, "Object store error");
        start();
        });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Opening Index - non existing index - autoGenerateAllowed", 1, function () {
        var anotherIndex = "anotherIndex";
        initionalSituationIndex(function () {
        // Delete database if existing
        linq2indexedDB.prototype.core.db(dbName, 2).then(function (args) {
        linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function () {
        }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.index(objArgs[1], anotherIndex, true).then(function (indexArgs) {
            ok(true, "Index open");

            if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
              indexArgs[1].get(1);
            }

      indexArgs[0].db.close();
      start();
      }, function () {
        ok(false, "Index error");
        start();
        });
      }, function () {
        ok(false, "Object store error");
        start();
        });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Deleting Index", 2, function () {
        initionalSituationIndex(function () {
          // Delete database if existing
          linq2indexedDB.prototype.core.db(dbName, 2).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          // Work around for chrome, if nothing gets queried, the transaction gets aborted.
          if (linq2indexedDB.prototype.core.implementation == linq2indexedDB.prototype.core.implementations.GOOGLE) {
            objArgs[1].get(1);
          }
      if (!objArgs[1].indexNames.contains(indexProperty + linq2indexedDB.prototype.core.indexSuffix)) {
        ok(true, "Index is no longer present");
        }
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        }, function (args) {
        if (args[1].type == "upgradeneeded") {
        linq2indexedDB.prototype.core.deleteIndex(linq2indexedDB.prototype.core.objectStore(args[0], objectStoreName), indexProperty).then(function () {
        ok(true, "Index deleted");
        }, function () {
        ok(false, "Deleting index failed");
        });
      }
      });
      });
      });

      module("Insert");
      asyncTest("Inserting data", 2, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreNoAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with external key", 3, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreNoAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data, key).then(function (insertArgs) {
            ok(true, "data inserted");
            equal(insertArgs[0], data, "Data ok");
            equal(insertArgs[1], key, "Key ok");
          }, function () {
        ok(false, "insert error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data - objectstore autoincrement", 2, function () {
        var data = { test: "test" };
      initionalSituationObjectStore(function () {

        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data).then(function (insertArgs) {
            ok(true, "data inserted");
            equal(insertArgs[0], data, "Data ok");
          }, function () {
        ok(false, "insert error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with external key- objectstore autoincrement", 3, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStore(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data, key).then(function (insertArgs) {
            ok(true, "data inserted");
            equal(insertArgs[0], data, "Data ok");
            equal(insertArgs[1], key, "Key ok");
          }, function () {
        ok(false, "insert error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data - objectstore keyPath", 2, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreKeyPath(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with inline key - objectstore keyPath", 3, function () {
        var data = { test: "test", Id: 1 };
      initionalSituationObjectStoreKeyPath(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data).then(function (insertArgs) {
            ok(true, "data inserted");
            equal(insertArgs[0], data, "Data ok");
            equal(insertArgs[1], data.Id, "Key ok");
          }, function () {
        ok(false, "insert error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with external key - objectstore keyPath", 2, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreKeyPath(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data, key).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data - objectstore keyPath autoIncrement", 3, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreKeyPathAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data).then(function (insertArgs) {
            ok(true, "data inserted");
            equal(insertArgs[0], data, "Data ok");
            equal(insertArgs[1], insertArgs[0].Id, "Key ok (key inserted into the object)");
          }, function () {
        ok(false, "insert error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with inline key - objectstore keyPath autoincrement", 3, function () {
        var data = { test: "test", Id: 1 };
      initionalSituationObjectStoreKeyPathAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data).then(function (insertArgs) {
            ok(true, "data inserted");
            equal(insertArgs[0], data, "Data ok");
            equal(insertArgs[1], data.Id, "Key ok");
          }, function () {
        ok(false, "insert error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with external key - objectstore keyPath autoincrement", 2, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreKeyPath(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data, key).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with existing external key", 2, function () {
        initionalSituationObjectStoreNoAutoIncrementWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "ConstraintError", "Insert failed");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], insertData, insertData.Id).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "ConstraintError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with existing inline key", 2, function () {
        initionalSituationObjectStoreKeyPathWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "ConstraintError", "Insert failed");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], insertData).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "ConstraintError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with existing index key - index unique", 2, function () {
        initionalSituationObjectStoreIndexUniqueWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "ConstraintError", "Insert failed");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], insertData).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "ConstraintError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data with invalid key", 2, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreNoAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data, data).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data - readonly transaction", 2, function () {
        initionalSituationObjectStoreKeyPathWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], insertData).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "ReadOnlyError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Inserting data - DataCloneError", 2, function () {
        var data = {
        test: "test", Id: 1, toString: function () {
        return true;
        }
      };
      initionalSituationObjectStoreKeyPath(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transactionArgs) {
        equal(transactionArgs.type, "abort", transactionArgs.message);
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], data).then(function (insertArgs) {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataCloneError", insertArgs.message);
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });

      module("Update");
      asyncTest("Updating data", 2, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreNoAutoIncrementWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data).then(function () {
            ok(false, "data updated");
          }, function (updateArgs) {
        equal(updateArgs.type, "DataError", updateArgs.message);
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with external key", 6, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreNoAutoIncrementWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data, key).then(function (updateArgs) {
            ok(true, "data updated");
            equal(updateArgs[1], insertData.Id, "Key of the original data");
            notEqual(updateArgs[0], insertData, "Original data deferres from the current data");
            equal(updateArgs[0], data, "Data ok");
            equal(updateArgs[1], key, "Key ok");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function(countArgs) {
              equal(countArgs[0], 1, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data - objectstore autoincrement", 3, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data).then(function (updateArgs) {
            ok(true, "data inserted");
            equal(updateArgs[0], data, "Data ok");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function(countArgs) {
              equal(countArgs[0], 2, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with external key - objectstore autoincrement", 6, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data, key).then(function (updateArgs) {
            ok(true, "data updated");
            equal(updateArgs[1], insertData.Id, "Key of the original data");
            notEqual(updateArgs[0], insertData, "Original data deferres from the current data");
            equal(updateArgs[0], data, "Data ok");
            equal(updateArgs[1], key, "Key ok");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function(countArgs) {
              equal(countArgs[0], 1, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data - objectstore keyPath", 2, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreKeyPathWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data).then(function () {
            ok(false, "data updated");
          }, function (updateArgs) {
        equal(updateArgs.type, "DataError", updateArgs.message);
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with inline key - objectstore keyPath", 6, function () {
        var data = { test: "test", Id: 1 };
      initionalSituationObjectStoreKeyPathWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data).then(function (updateArgs) {
            ok(true, "data updated");
            equal(updateArgs[1], insertData.Id, "Key of the original data");
            notEqual(updateArgs[0], insertData, "Original data deferres from the current data");
            equal(updateArgs[0], data, "Data ok");
            equal(updateArgs[1], data.Id, "Key ok");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
              equal(countArgs[0], 1, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with external key - objectstore keyPath", 2, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreKeyPathWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data, key).then(function () {
            ok(false, "data updated");
          }, function (updateArgs) {
        equal(updateArgs.type, "DataError", updateArgs.message);
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data - objectstore keyPath autoincrement", 4, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreKeyPathAutoIncrementWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data).then(function (updateArgs) {
            ok(true, "data inserted");
            equal(updateArgs[0], data, "Data ok");
            equal(updateArgs[1], updateArgs[0].Id, "Key ok (key inserted into the object)");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
              equal(countArgs[0], 2, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with inline key - objectstore keyPath autoincrement", 6, function () {
        var data = { test: "test", Id: 1 };
      initionalSituationObjectStoreKeyPathAutoIncrementWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data).then(function (updateArgs) {
            ok(true, "data updated");
            equal(updateArgs[1], insertData.Id, "Key of the original data");
            notEqual(updateArgs[0], insertData, "Original data deferres from the current data");
            equal(updateArgs[0], data, "Data ok");
            equal(updateArgs[1], data.Id, "Key ok");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
              equal(countArgs[0], 1, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with external key - objectstore keyPath autoincrement", 2, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreKeyPathWithData(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data, key).then(function () {
            ok(false, "data updated");
          }, function (updateArgs) {
        equal(updateArgs.type, "DataError", updateArgs.message);
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with non existing external key", 4, function () {
        var data = { test: "test" };
      var key = 1;
      initionalSituationObjectStoreNoAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data, key).then(function (updateArgs) {
            ok(true, "data inserted");
            equal(updateArgs[0], data, "Data ok");
            equal(updateArgs[1], key, "Key ok");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
              equal(countArgs[0], 1, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with non existing inline key", 4, function () {
        var data = { test: "test", Id: 1 };
      initionalSituationObjectStoreKeyPath(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data).then(function (updateArgs) {
            ok(true, "data inserted");
            equal(updateArgs[0], data, "Data ok");
            equal(updateArgs[1], data.Id, "Key ok");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
              equal(countArgs[0], 1, "Count ok");
            });
      }, function () {
        ok(false, "update error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data with invalid key", 2, function () {
        var data = { test: "test" };
      initionalSituationObjectStoreNoAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.update(objArgs[1], data, data).then(function () {
            ok(false, "data updated");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataError", insertArgs.message);
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Updating data - readonly transaction", 2, function () {
        initionalSituationObjectStoreKeyPathWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], insertData).then(function () {
            ok(false, "data inserted");
          }, function (insertArgs) {
        equal(insertArgs.type, "ReadOnlyError", "Insert failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });

      module("remove");
      asyncTest("Remove data", 2, function () {
        initionalSituationObjectStoreWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.remove(objArgs[1], insertData.Id).then(function () {
            ok(true, "data removed");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
              equal(countArgs[0], 0, "Count ok");
            });
      }, function () {
        ok(false, "remove error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Remove data - non existing key", 2, function () {
        var nonExistingKey = 9999;
        initionalSituationObjectStoreWithData(function() {
        linq2indexedDB.prototype.core.db(dbName).then(function(args) {
        linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function(transArgs) {
        transArgs[0].db.close();
        start();
        }, function() {
        ok(false, "Transaction error");
        start();
        }, function(transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function(objArgs) {
          linq2indexedDB.prototype.core.remove(objArgs[1], nonExistingKey).then(function() {
            ok(true, "remove success");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function(countArgs) {
              equal(countArgs[0], 1, "Count ok");
            });
      }, function() {
        ok(false, "remove error");
        });
      });
      });
      }, function() {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Remove data - key range", 2, function () {
        var keyRange = IDBKeyRange.only(insertData.Id);
        initionalSituationObjectStoreWithData(function() {
        linq2indexedDB.prototype.core.db(dbName).then(function(args) {
        linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function(transArgs) {
        transArgs[0].db.close();
        start();
        }, function() {
        ok(false, "Transaction error");
        start();
        }, function(transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function(objArgs) {
          linq2indexedDB.prototype.core.remove(objArgs[1], keyRange).then(function() {
            ok(true, "remove success");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function(countArgs) {
              equal(countArgs[0], 0, "Count ok");
            });
      }, function() {
        ok(false, "remove error");
        });
      });
      });
      }, function() {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("Remove data with invalid key", 2, function () {
        var invalidKey = { test: "test" };
      initionalSituationObjectStoreNoAutoIncrement(function () {
        linq2indexedDB.prototype.core.db(dbName).then(function (args) {
          linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
            transArgs[0].db.close();
            start();
          }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], invalidKey).then(function () {
            ok(false, "data removed");
          }, function (insertArgs) {
        equal(insertArgs.type, "DataError", "Remove failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("removing data - readonly transaction", 2, function () {
        initionalSituationObjectStoreKeyPathWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.insert(objArgs[1], insertData.Id).then(function () {
            ok(false, "data removed");
          }, function (insertArgs) {
        equal(insertArgs.type, "ReadOnlyError", "Remove failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });

      module("clear");
      asyncTest("Clear data", 2, function () {
        initionalSituationObjectStoreWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.clear(objArgs[1]).then(function () {
            ok(true, "data cleared");
            linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
              equal(countArgs[0], 0, "Count ok");
            });
      }, function () {
        ok(false, "Clear error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
      asyncTest("removing data - readonly transaction", 2, function () {
        initionalSituationObjectStoreKeyPathWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_ONLY).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function (transArgs) {
        equal(transArgs.type, "abort", "Transaction aborted");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.clear(objArgs[1]).then(function () {
            ok(false, "data cleared");
          }, function (insertArgs) {
        equal(insertArgs.type, "ReadOnlyError", "Clear failed");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });

      module("count");
      asyncTest("Count data", 1, function () {
        initionalSituationObjectStoreWithData(function () {
          linq2indexedDB.prototype.core.db(dbName).then(function (args) {
            linq2indexedDB.prototype.core.transaction(args[0], [objectStoreName], linq2indexedDB.prototype.core.transactionTypes.READ_WRITE).then(function (transArgs) {
              transArgs[0].db.close();
              start();
            }, function () {
        ok(false, "Transaction error");
        start();
        }, function (transArgs) {
        linq2indexedDB.prototype.core.objectStore(transArgs[0], objectStoreName).then(function (objArgs) {
          linq2indexedDB.prototype.core.count(objArgs[1]).then(function (countArgs) {
            equal(countArgs[0], 1, "Count ok");
          }, function () {
        ok(false, "Count error");
        });
      });
      });
      }, function () {
        ok(false, "Database error");
        start();
        });
      });
      });
