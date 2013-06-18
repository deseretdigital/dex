;(function() {
  var getTestModel1 = AccessorBackbone.Model.extend({
    // A broken set() can mess up the test so we want to remove as many variables as possible
    set: AccessorBackbone.Model.prototype.set,

    getAttr1: function() {
      this.calledAttr1Getter = true;
      return this.get('attr1');
    },

    getAttr2: function() {
      this.attr2Args = Array.prototype.slice.call(arguments);
    }
  });

  var getTestModel2 = AccessorBackbone.Model.extend({
    // A broken set() can mess up the test so we want to remove as many variables as possible
    set: AccessorBackbone.Model.prototype.set,

    _get: function(attr) {
      if(attr == 'attr1') {
        return 'test4';
      }

      return this.get(attr);
    }
  });


  var setTestModel1 = AccessorBackbone.Model.extend({
    // A broken get() can mess up the test so we want to remove as many variables as possible
    get: AccessorBackbone.Model.prototype.get,

    setAttr1: function(val) {
      this.calledAttr1Setter = true;
      this.set('attr1', val);
    },

    setAttr2: function(val, options) {
      this.set('attr2', 'test1');
      this.attr2Opts = options;
    },

    setAttr3: function(val) {}
  });

  var setTestModel2 = AccessorBackbone.Model.extend({
    // A broken get() can mess up the test so we want to remove as many variables as possible
    get: AccessorBackbone.Model.prototype.get,

    _set: function(attr, val, options) {
      if(attr == 'attr1') {
        this.set(attr, val);
      }
    }
  });


  module('Accessors', {
    setup: function() {},

    teardown: function() {}
  });

  test('test convertAttrName()', function() {
    var convertAttrModel = new AccessorBackbone.Model();

    equal(convertAttrModel.convertAttrName('attrName'), 'AttrName');
    equal(convertAttrModel.convertAttrName('Attr-name'), 'AttrName');
    equal(convertAttrModel.convertAttrName('attr_name'), 'AttrName');

    equal(convertAttrModel.attrNameCache['attr_name'], 'AttrName');
  });

  test('test get()', function() {
    var getModel1 = new getTestModel1({
      attr1: 'test',
      attr2: 'test2'
    });

    // Test that getter is called and that it prevents recursion
    equal(getModel1.get('attr1'), 'test', "Make sure getters can call get() without infinite recursion");
    ok(getModel1.calledAttr1Getter, "Make sure getters are called");

    equal(getModel1.get('undefinedAttr'), undefined, "Non existent attributes should be treated normally");

    // Test extra argument passing
    equal(getModel1.get('attr2', 'extra', 2), undefined, "If a getter is defined and doesn't return a value, it's return value should be used even if the attribute has a value");
    deepEqual(getModel1.attr2Args, ['extra', 2], "Make sure getters can receive extra attributes in case they're desired for some reason");

    // Test cleanup
    equal(getModel1._gettingAttr1, undefined, "Make sure _gettingAttr properties are cleaned up");


    var getModel2 = new getTestModel2({
      attr1: 'test3',
      attr2: 'test5'
    });

    // Make sure the catch-all getter works
    equal(getModel2.get('attr1'), 'test4', "Should return custom value from setter rather than the value set in the model");
    equal(getModel2.get('attr2'), 'test5', "All other values thould be passed through and return their set value");
  });

  test('test set()', function() {
    var setModel1 = new setTestModel1();

    setModel1.set('attr1', 'test');
    equal(setModel1.get('attr1'), 'test', "Make sure setters can call set() without infinite recursion");
    ok(setModel1.calledAttr1Setter, "Make sure setters are called");

    setModel1.set({
      'attr2': 'someval',
      'attr3': 'someotherval'
    });
    equal(setModel1.get('attr2'), 'test1', "Make sure setters value is the one set, not necessarily what we pass");
    deepEqual(setModel1.attr2Opts.setAttrs, {
      'attr2': 'someval',
      'attr3': 'someotherval'
    }, "All attributes being set should be passed to the setter");
    equal(setModel1.get('attr3'), undefined, "No value should be set if the setter ignores the value given");
    equal(setModel1._settingAttr1, undefined, "Temporary property should be cleaned up");

    deepEqual(setModel1.attributes, {
      attr1: 'test',
      attr2: 'test1'
    }, "Ensure all attributes remain set properly");


    // Test catch-all setter
    var setModel2 = new setTestModel2();
    setModel2.set('attr1', 'test');
    setModel2.set('attr2', 'test2');

    equal(setModel2.get('attr1'), 'test', "Set value using catch-all setter");
    equal(setModel2.get('attr2'), undefined, "No other properties are allowed - they are ignored");
  });
}).call(this);