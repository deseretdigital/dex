;(function() {
  var sModel = SingletonBackbone.Model.extend({}),

      sModelCtor = sModel.prototype.constructor,

      // Used to test extending a singleton model without specifying a constructor
      singleExtension1 = sModel.extend({}),

      // Used to test extending a singleton model while overriding the constructor
      singleExtension2 = sModel.extend({
        constructor: function() {
          this.calledConstructor = true;

          sModelCtor.apply(this, arguments);
        }
      }),

      testCollection = SingletonBackbone.Collection.extend();


  module('Singleton', {
    setup: function() {},

    teardown: function() {}
  });

  test('test constructor()', function() {
    var model1 = new sModel({id: 123}),
        model2 = new sModel({id: 123}, {forceNew: true}),
        model3 = new singleExtension2({id: 123});

    equal(model1, new sModel({id: 123}), 'get singleton by id');
    equal(model1, new sModel(null, {cid: model1.cid}), 'get singleton by cid');
    equal(new sModel(null, {uuid: 'uuid-test'}), new sModel(null, {uuid: 'uuid-test'}), 'get singleton by uuid');

    notEqual(model2, model1, '`forceNew` option');

    notEqual(model1, model3, 'model types are different, but id is same - should be different model');
    ok(model3.calledConstructor, 'extended singleton model constructor was called');
    equal(model3, new singleExtension2({id: 123}), 'extended singleton model with constructor works');
    equal(new singleExtension1({id: 123}), new singleExtension1({id: 123}), 'extended singleton model without constructor works');
    equal((new singleExtension1())._sCtorCallCount, 1, 'if extending without a constructor, bypass parent singleton constructor');
  });

  test('test `collections` property', function() {
    var col1 = new testCollection(),
        col2 = new testCollection(),
        model = new sModel();

    ok(_.isArray(model.collections), '`collections` property exists and is an array');

    col1.add(model);
    deepEqual(model.collections, [col1], 'model is in collection 1 only');

    col2.add(model);
    deepEqual(model.collections, [col1, col2], 'model is in both collections');
    equal(model.collection, col1, '`collection` property reflects correct collection');

    col1.remove(model);
    deepEqual(model.collections, [col2], "model is removed from collection 1, it's now in collection 2 only");
    equal(model.collection, col2, '`collection` property reflects correct collection');

    col2.remove(model);
    deepEqual(model.collections, [], "model is removed from collection 2, `collections` is an empty array");
    equal(model.collection, undefined, '`collection` property is deleted by Backbone');
  });
}).call(this);