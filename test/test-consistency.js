;(function() {
  // Prevent URL errors caused by trying to call save on models that aren't actually built for it (we're just pretending).
  // We will get errors if it actually tries to save.
  ConsistencyBackbone.Model.prototype.save = function() {};

  var modelCtor = ConsistencyBackbone.Model.prototype.constructor,
      consistModel = ConsistencyBackbone.Model.extend({
        constructor: function() {
          this.dirtyAttributes = {};
          return modelCtor.apply(this, arguments);
        }
      }),

      conflictModel = ConsistencyBackbone.Model.extend({
        _handleConflict: function(attr, parent, remote, local) {
          if(attr == 'attr1') {
            return remote;
          }
        }
      });



  module('Data Consistency', {
    setup: function() {},

    teardown: function() {}
  });

  asyncTest('test set()', 11, function() {
    var testModel1 = new consistModel({id: 123, attr1: 'test'}, {fromServer: true}),
        testModel2 = new conflictModel({id: 123}, {fromServer: true}),
        unresolvedConflicts = 0;

    deepEqual(testModel1.attributes, {id: 123, attr1: 'test'}, 'attributes set correctly');
    deepEqual(testModel1.serverAttributes, {id: 123, attr1: 'test'}, 'serverAttributes set correctly');

    // Test merging
    testModel1.set({attr1: 'testing', attr2: 'hello'});
    //testModel1.dirtyAttributes = {attr1: true, attr2: true};
    deepEqual(testModel1.attributes, {id: 123, attr1: 'testing', attr2: 'hello'}, 'attributes has changed');
    deepEqual(testModel1.serverAttributes, {id: 123, attr1: 'test'}, 'serverAttributes has not changed');
    deepEqual(testModel1.conflicts, {}, 'no conflicts');

    // `attr2` is still 'dirty' but it should not be a conflict since the value is the same
    testModel1.set({id: 123, attr1: 'test2', attr2: 'hello'}, {fromServer: true});
    //testModel1.dirtyAttributes = {attr1: true};
    deepEqual(testModel1.attributes, {id: 123, attr1: 'testing', attr2: 'hello'}, 'attr1 has not changed because it was dirty/changed locally');
    deepEqual(testModel1.serverAttributes, {id: 123, attr1: 'test2', attr2: 'hello'}, 'serverAttributes has changed');
    deepEqual(testModel1.conflicts, {attr1: true}, 'only `attr1` is a conflict');


    // Test conflict handling
    testModel2.attr = true;
    testModel2.set({attr1: 'test1', attr2: 'test2', attr3: 'test3', attr4: 'test4'});
    testModel2.set({attr1: 'test2', attr2: 'test3', attr3: 'test3', attr4: 'test5'}, {fromServer: true});
    //testModel2.dirtyAttributes = {attr1: true, attr2: true, attr4: true};

    // We wrap this in setTimeout() to defer the 'conflict' event binding until after previous 'conflict' events from calls
    // to `set()` have been fired. We don't want previous tests interfering with the results of this test.
    var done = _.debounce(function() {
      equal(unresolvedConflicts, 1, "'conflict' event is only being fired once for each new conflict");
      start();
    }, 100);
    setTimeout(function() {
      testModel2.on('conflict', function(attr, parent, remote, local) {
        if(attr == 'attr2') {
          testModel2.set('attr2', remote, {noConflict: true});

          deepEqual(testModel2.conflicts, {attr4: true}, "`attr2` is handled by the 'conflict' event handler, `attr4` should still be a conflict");
          done();
        } else {
          // This should only be called for `attr4`
          unresolvedConflicts++;
          done();
        }
      });

      testModel2.conflicts = {};
      testModel2.set({attr1: 'test6', attr2: 'test7', attr3: 'test3', attr4: 'test8'}, {fromServer: true});
      deepEqual(testModel2.conflicts, {attr2: true, attr4: true}, 'model defines conflict handler for `attr1`, but `attr2` & `attr4` should be dirty');
    });
  });


  /**
   * Test considerations:
   *
   * - Models should ignore old data (not depend on timestamp option, but should accept it)
   * - Collections should be aware of unsaved models
   * - Collections should ignore old data - test set/reset/add (add calls set, reset calls add)
   * - Collections should freeze server updates, but not local updates, until all models are saved
   * - Collections should fallback to most recent data received if they don't receive a new data set within a timeout from the last model saving
   *   - or if it's simply been too long since they've had an update?
   */
  asyncTest('test model and collection consistency', function() {
    // Models should ignore old data (not depend on timestamp option, but should accept it)
    var testModel1 = new consistModel({attr1: 'test'}, {fromServer: true});
    ok(typeof(testModel1._dataTS) == 'object' && testModel1._dataTS instanceof Date, 'timestamp was generated and set');

    var ts = testModel1._dataTS;
    testModel1.set({attr1: 'test2'}, {fromServer: true, timestamp: ts.getTime() - 1});
    deepEqual(testModel1.attributes, {attr1: 'test'}, 'data should not have changed since new data was old');
    equal(testModel1._dataTS, ts, 'the timestamp should be the same as well');

    testModel1.set({attr1: 'test2'}, {fromServer: true, timestamp: ts.getTime() + 1});
    deepEqual(testModel1.attributes, {attr1: 'test2'}, 'data should have changed since newer data was set');
    equal(testModel1._dataTS.getTime(), ts.getTime() + 1, 'the timestamp should have change as well');

    // Collections should be aware of unsaved models
    var testCol = new ConsistencyBackbone.Collection([{id: 123}, {id: 124, attr2: 'hi'}], {fromServer: true, fallbackDelay: 50}),
        compobj, addedModel;
    ok(typeof(testCol._dataTS) == 'object' && testCol._dataTS instanceof Date, 'timestamp was generated and set');

    testCol.add({attr1: 'hello'});
    (compobj = {}) && (compobj[(addedModel = testCol.at(testCol.length - 1)).cid] = addedModel);
    deepEqual(testCol._unsavedModels, compobj, 'aware of unsaved models');

    // `reset` should work as well as `set` and both should ignore old data
    var colCids = _.pluck(testCol.models, 'cid');
    testCol.reset([{id: 125}, {id: 126}], {fromServer: true, timestamp: testCol._dataTS.getTime() - 1});
    deepEqual(_.pluck(testCol.models, 'cid'), colCids, "models shouldn't have changed");
    equal(testCol._lastData.data, null, 'since data was old it should be ignored, not just delayed');

    // -- Test server update
    testCol.reset([{id: 125}, {id: 126}], {fromServer: true, timestamp: testCol._dataTS.getTime()});
    deepEqual(_.pluck(testCol.models, 'cid'), colCids, "models shouldn't have changed");
    deepEqual(testCol._lastData.data, [{id: 125}, {id: 126}], "data is newer, but there's an unsaved model so it should be delayed");

    // -- Test local update
    testCol.reset([{id: 27}, {id: 28}]);
    deepEqual(_.pluck(testCol.models, 'id'), [27, 28], 'local models should have changed');
    deepEqual(_.keys(testCol._unsavedModels), _.keys(compobj).concat(_.pluck(testCol.models, 'cid')), 'all unsaved models should be tracked');
    deepEqual(testCol._lastData.data, [{id: 125}, {id: 126}], "latest server data still hasn't changed");

    _.each(testCol._unsavedModels, function(model) {
      model.trigger('saveSuccess', model);
    });

    setTimeout(function() {
      equal(testCol._lastData.data, null, 'fallback data from server is cleared');
      start();
    }, 51);
  });
}).call(this);