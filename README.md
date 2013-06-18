## DEX (Data EXtensions for Backbone)

DEX is a collection of data extensions and services for [Backbone](http://backbonejs.org/) models and collections. The different service layers include things that provide accessors (getters/setters), memory management, auto-saving, data consistency, singleton model instances, the ability to know when your models and collections have finished loading data from your server or other data source, and more.

You have the option to use the provided [RequireJS](http://requirejs.org/) loader and get all the services or load and apply each layer in any way you want. They are written in such a way that you can apply most layers entirely independent of any other and in any order. The only exception is that the `consistency` and `autosave` layers have a dependency on each other; but the order they are applied in does not matter.

If you have any other great ideas for services you can [create your own](docs/CREATE_LAYER.md) layers to add more functionality.

### Usage

Using the RequireJS loader:

```js
require(['dex'], function(dex) {
    var col = new dex.Collection();

    // `dex` is an extended version of Backbone. Do what you want with it here. In fact, you could do this:
    Backbone = dex;
    col.add(new Backbone.Model({attr1: 'val1', attr2: 'val2'}));

    var customModel = Backbone.Model.extend({
        urlRoot: '/some/place'
    });

    // etc...
});
```

Without the loader but with RequireJS:

```js
require([
    'underscore',
    'backbone',
    'services/accessors',
    'services/autosave',
    'services/consistency'
], function(_, Backbone, addAccessors, addAutosave, addConsistency) {

    var bb1 = _.extend({}, Backbone);
    var bb2 = _.extend({}, Backbone);

    // NOTE: The functions modify the object passed in

    // Modify bb1 to add accessors
    addAccessors(bb1);

    // Modify bb2 to add auto-saving and data consistency
    // NOTE: These two depend on each other and must always be applied together - at least for right now
    addAutosave(bb2);
    addConsistency(bb2);

});
```

You can do the same as above but without RequireJS (just using `<script>` tags) as it is not a hard dependency. If you don't use RequireJS then you don't get to choose what the service layer functions are called or whether they are added to the global scope. They will be added globally and named `addAccessors`, `addAutosave`, `addConsistency`, `addMemory`, `addLoaders`, `addMemory`, `addSingleton` and `addUtils` for the current set of layers provided.