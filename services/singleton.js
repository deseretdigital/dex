/**
 * Singleton service for DEX v0.0.1
 *
 * Copyright (c) 2013 Deseret Digital Media - http://deseretdigital.com
 * Released under the MIT license
 *
 * Author: Justin Warkentin
 */

/**
 * NOTE: While not required, things will be much more efficient if this is the last of the service layers loaded. That way there
 *       aren't lots of extra layers of singleton constructors abandoned in the middle of the prototype chain. That just adds
 *       extra useless function calls to the call stack every time you instantiate a new model. There will be one extra call for
 *       every call to `extend()` that defines `constructor` after this layer is applied.
 *
 *       The reason we can't easily work around this is because generally references to the parent constructor must be saved
 *       before calling extend(). By the time extend() is called it's more than likely too late to remove it from the prototype
 *       chain because user code references the (now useless) singleton constructor. If no `constructor` property is defined
 *       by the user then we bypass the top level singleton constructor.
 *
 * TODO:
 *
 *  - This needs to remove items from _insts and _uuidInsts on shutdown/cleanup somehow. That means it needs to be aware of such.
 */

;(function() {
  function load(_) {

    return function(Backbone) {
      var collectionCtor = Backbone.Collection.prototype.constructor,
          collection_prepareModel = Backbone.Collection.prototype._prepareModel,
          collection_removeReference = Backbone.Collection.prototype._removeReference,
          modelExtend = Backbone.Model.extend;

      Backbone.Collection = Backbone.Collection.extend({
        _prepareModel: function() {
          var model = collection_prepareModel.apply(this, arguments);

          if(model) {
            if(!model.collections) model.collections = [];
            if(this != model._insts && model.collections.indexOf(this) == -1) {
              model.collections.push(this);
            }
          }

          return model;
        },

        _removeReference: function(model) {
          var result = collection_removeReference.apply(this, arguments);

          var colLoc = model.collections.indexOf(this);
          if(colLoc != -1) {
            model.collections.splice(colLoc, 1);
          }

          if(!model.collection && model.collections.length) {
            model.collection = model.collections[0];
          }

          return result;
        }
      });

      Backbone.Model.extend = function(protoProps, staticProps) {
        var parentCtor, child;

        if(protoProps && _.has(protoProps, 'constructor')) {
          parentCtor = protoProps.constructor;
        } else {
          parentCtor = this;
        }

        protoProps.constructor = function(attributes, options) {
          // For testing purposes only
          if(QUnit) {
            if(!this._sCtorCallCount) this._sCtorCallCount = 1;
            else this._sCtorCallCount++;
          }

          // This becomes a no-op if it's been left somewhere in the middle of the prototype chain
          if(this._singletonCtor) {
            return parentCtor.apply(this, arguments) || this;
          }

          var model, id;
          attributes || (attributes = {});
          options || (options = {});

          if(!options.forceNew) {
            if(id = attributes[this.idAttribute] || options.cid) {
              model = this._insts.get(id);
            } else if(options.uuid) {
              model = this._uuidInsts[options.uuid];
            }

            if(model) {
              model.set(attributes, options);
              return model;
            }
          }

          if(!model) {
            // Make sure the `collections` property always exists
            this.collections = [];

            this._singletonCtor = true;
            parentCtor.apply(this, arguments);
            delete this._singletonCtor;

            // Add to _insts and _uuidInsts
            this._insts.add(this, {silent: true});
            if(options.uuid) {
              this.uuid = options.uuid;
              this._uuidInsts[this.uuid] = this;
            }

            // Just to keep things clean we don't want this collection to be the primary collection the model belongs to.
            // If we don't do this then this collection will ALWAYS be this.collection on every model.
            if(this.collection == this._insts) {
              delete this.collection;
            }
          }
        };
        protoProps.constructor._isSingletonCtor = true;

        // If we're extending a singleton constructor, just bypass it
        if(parentCtor._isSingletonCtor) {
          parentCtor = parentCtor.__super__.constructor;
        }

        child = modelExtend.call(this, protoProps, staticProps);
        child.prototype._insts = new collectionCtor(); // We don't want this collection to show up in the model's collections prop
        child.prototype._uuidInsts = {};

        return child;
      };
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
    this.addSingleton = load(this._);
  }
}).call(this);