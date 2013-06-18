;(function() {
  var Backbone = MemoryBackbone;

  module('Memory Management', {
    setup: function() {},

    teardown: function() {}
  });

  asyncTest('test memory management', 8, function() {
    var testModel = new Backbone.Model(),
        active1;

    deepEqual(testModel.countCallbacks(), {total: 0, passive: 0}, "no errors should be thrown when there are no events bound");

    testModel.on('change', active1 = function() {});
    deepEqual(testModel.countCallbacks(), {total: 1, passive: 0}, "bindings are active by default");

    testModel.on('change', function() {}, testModel);
    testModel.on('shutdown error', function() {});
    deepEqual(testModel.countCallbacks(), {total: 4, passive: 3}, "when an object is bound to itself or is of certain event types it should always be passive by default");

    testModel.off('change', active1);
    deepEqual(testModel.countCallbacks(), {total: 3, passive: 3}, "no more active bindings");
    equal(testModel._isShutdown, undefined, "model isn't cleaned up - should wait a second");

    testModel.on('shutdown', function() {
      // This should always happen before the model is shutdown, which means the setTimeout below should always run after this
      // so we don't need to worry about timing here
      ok(true, "shutdown event was called");
    });

    setTimeout(function() {
      equal(testModel._isShutdown, true, "model should be shutdown");
      deepEqual(testModel.countCallbacks(), {total: 0, passive: 0}, "when model is shutdown all bindings should be cleaned up")
      start();
    }, 1001);
  });
}).call(this);