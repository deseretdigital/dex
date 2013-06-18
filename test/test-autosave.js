;(function() {
  var modelCtor = AutosaveBackbone.Model.prototype.constructor;

  var saveModel = AutosaveBackbone.Model.extend({
    constructor: function() {
      this.serverAttributes = {};
      return modelCtor.apply(this, arguments);
    },

    save: function() {
      // We want to assert that save was called but we don't actually want to call it
      this.calledSave = true;
    }
  });


  module('Autosave', {
    setup: function() {},

    teardown: function() {}
  });

  test('test _findDirtyAttrs()', function() {
    var testModel = new saveModel();

    // Make sure it only checks the attributes passed to it and that it accepts an array or object
    testModel.attributes.id = 123;
    testModel._findDirtyAttrs(['notid']);
    deepEqual(testModel.dirtyAttributes, {}, 'Only look at attributes requested');

    testModel.attributes.attr1 = 'abc';
    testModel._findDirtyAttrs(['id']);
    ok(!testModel.dirtyAttributes.attr1, "Shoudn't know attribute is dirty");
    testModel._findDirtyAttrs({attr1: 'test'});
    ok(testModel.dirtyAttributes.attr1, 'Should know attribute is dirty');

    // Find all dirty attributes
    testModel.dirtyAttributes = {};
    testModel._findDirtyAttrs();
    deepEqual(_.keys(testModel.dirtyAttributes).sort(), ['attr1', 'id'], 'All dirty attributes found');
  });

  test('test isDirty()', function() {
    var testModel = new saveModel({id: 123}, {fromServer: true});
    testModel.serverAttributes = {id: 123};
    testModel._findDirtyAttrs();

    // Make sure the model knows when it's dirty
    equal(testModel.isDirty(), false, 'data is not diry');

    testModel.set({attr1: 'test'});
    equal(testModel.isDirty(), true, 'data is dirty');
    equal(testModel.isDirty('attr1'), true, 'specific attribute is dirty');
    equal(testModel.isDirty('attr2'), false, 'specific attribute is not dirty');
  });

  asyncTest('test autosave', function() {
    var testModel = new saveModel({id: 123}, {fromServer: true});
    testModel.serverAttributes = {id: 123};

    expect(1);

    testModel.set({attr1: 'dirty'});
    setTimeout(function() {
      ok(testModel.calledSave, 'save was called');
      start();
    }, 501);
  });
}).call(this);