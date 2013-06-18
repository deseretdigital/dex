If you are planning to extend the `Model` it is very important that you also extend the `Collection` with the following, at a minimum:

```js
// Bare minimum required to avoid errors and make sure order of layers being loaded doesn't matter
Backbone.Collection = Backbone.Collection.extend({
  model: Backbone.Model
});
```

If you don't do that then you will likely run into errors since models created by passing POJO's into the `Collection` constructor or `add`/`set` will cause it to instantiate the wrong model. Note that you don't have to set the `model` property if you are not extending the `Model`; however, it is harmless since it's a no-op otherwise and it makes your code future proof.

-----

Here is a basic template that you can copy for creating a new layer:

```js
;(function() {
  function load(_) {

    return function(Backbone) {
      Backbone.Model = Backbone.Model.extend({
        // Your extension here
      });

      Backbone.Collection = Backbone.Collection.extend({
        model: Backbone.Model,
        
        // Your extension here
      });
    };

  }

  // Support AMD loaders
  if(typeof define !== 'undefined' && define.amd) {
    define(['underscore'], function(_) {
      return load(_);
    });
  } else if(typeof exports !== 'undefined') {
    var _ = require('_');
    if(!module) module = {};
    exports = module.exports = load(_);
  } else {
    // NOTE: You'll want to change `addExtension` here to some other unique global name to describe your service layer
    this.addExtension = load(this._);
  }
}).call(this);
```