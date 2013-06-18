;(function() {
  var Backbone = UtilBackbone;

  module('Utilities', {
    setup: function() {},

    teardown: function() {}
  });

  test('parse()', function() {
    var testCol = new Backbone.Collection();

    deepEqual(testCol.parse({key: 'val'}), {key: 'val'}, "plain object");
    deepEqual(testCol.parse({data: {key: 'val'}}), {key: 'val'}, "object with `data` property");
    deepEqual(testCol.parse('non object'), {}, "non object");
  });

  test('move()', function() {
    var testCol = new Backbone.Collection([
      {id: 123},
      {id: 124},
      {id: 125},
      {id: 126},
      {id: 127}
    ]);

    deepEqual(testCol.pluck('id'), [123, 124, 125, 126, 127], "initial order is correct");

    testCol.move(testCol.get(125), 0);
    deepEqual(testCol.pluck('id'), [125, 123, 124, 126, 127], "move to beginning worked");

    testCol.move(testCol.get(126), testCol.length);
    deepEqual(testCol.pluck('id'), [125, 123, 124, 127, 126], "move to end worked");

    testCol.move(testCol.at(0), 1);
    deepEqual(testCol.pluck('id'), [123, 125, 124, 127, 126], "move from beginning worked");

    testCol.move(testCol.at(testCol.length - 1), 1);
    deepEqual(testCol.pluck('id'), [123, 126, 125, 124, 127], "move from end worked");
  });
}).call(this);