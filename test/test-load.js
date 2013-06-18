;(function() {
  var extraLoadModel = LoaderBackbone.Model.extend({
    _load: function(loadDef) {
      this.markLoaded = function() {
        loadDef.resolve();
      };
    }
  });


  module('Loading', {
    setup: function() {},

    teardown: function() {}
  });

  asyncTest('test loading', function() {
    var newModel = new LoaderBackbone.Model(),
        setModel = new LoaderBackbone.Model({id: 123});

    expect(4);
    stop();

    setTimeout(function() {
      // Models without a subscription or that are new should already be 'loaded'
      equal(newModel.loaded, true, 'new model is loaded');
      start();
    });

    // When data is set, but not from the server, it should not be 'loaded'
    setTimeout(function() {
      setModel.set({attr1: 'test1', attr2: 'test2'});
      setTimeout(function() {
        deepEqual([setModel.get('attr1'), setModel.get('attr2')], ['test1', 'test2'], 'data was set successfully');
        equal(setModel.loaded, false, 'data was set, but not from the server');

        // When data is set from the server it should be 'loaded'
        setModel.set({attr3: 'test3'}, {fromServer: true});
        setTimeout(function() {
          equal(setModel.loaded, true, 'data was successfully set from the server');
          start();
        });
      });
    });
  });

  asyncTest('reset loading', function() {
    var testModel = new LoaderBackbone.Model();

    expect(4);

    setTimeout(function() {
      equal(testModel.loaded, true, 'model is loaded');
      equal(testModel.loader.state(), 'resolved', 'deferred is done')

      testModel._resetLoader();
      equal(testModel.loaded, false, 'loading was reset');
      equal(testModel.loader.state(), 'pending', 'deferred was reset');

      start();
    }, 2);
  });

  test('extra loading work', function() {
    var extraModel = new extraLoadModel();

    expect(4);
    stop();

    // Make sure that data set from the server resolves its deferred properly, but doesn't say the model is loaded
    setTimeout(function() {
      equal(extraModel.dataLoader.state(), 'resolved', 'Data is loaded');
      equal(extraModel.loaded, false, 'Model is not fully loaded');

      // After the extra load actions finish, then we should be "loaded"
      extraModel.markLoaded();
      equal(extraModel._extraLoader.state(), 'resolved', 'Extra loader is resolved');
      equal(extraModel.loaded, true, 'Model is fully loaded');

      start();
    });
  });
}).call(this);