/**
 * Loading service for DEX v0.0.1
 *
 * Copyright (c) 2013 Deseret Digital Media - http://deseretdigital.com
 * Released under the MIT license
 *
 * Author: Justin Warkentin
 */


/**
 * Scenarios to consider
 *
 * Scenario 1:
 * - Collection receives data, creates models and adds deferred load callbacks so it knows when it's done loading
 * - While loading the collection is reset again and one of the models is no longer part of the collection
 * - Collection maintains the same deferred object since it was never resolved or rejected, but must ignore calls
 *   to its deferred callback when the model that is no longer needed finally resolves or rejects it's deferred object
 * - If nothing else is using the model it may be cleaned up even though it never finished loading. On shutdown the loading
 *   deferred object should be rejected. It's data handler callback will never be called and thus the data will never finish
 *   loading. Even though we could wait for it to timeout, we want things to be responsive.
 *
 * TODO:
 *   What should be done when a model load is reset? Should it reset the collection loaders? Should a model and collection
 *   event be triggered?
 */


;(function() {
  function load(_) {

    function resetDeferred(def) {
      if(!def || def.state() != 'pending') {
        return $.Deferred();
      }
      return def;
    }

    return function(Backbone) {
      var collectionCtor = Backbone.Collection.prototype.constructor,
          collectionAdd = Backbone.Collection.prototype.add,
          modelCtor = Backbone.Model.prototype.constructor,
          modelFetch = Backbone.Model.prototype.fetch,
          modelSet = Backbone.Model.prototype.set;

      Backbone.Model = Backbone.Model.extend({
        constructor: function() {
          var that = this,
              result;

          this._resetLoader();
          result = modelCtor.apply(this, arguments);

          // If the model is still considered "new" after the call stack has cleared then we'll just call it loaded.
          // This should be safe because it defers the loading, thus acting like a normal asynchronous load.
          setTimeout(function() {
            if(that.isNew()) {
              that._dataLoader.resolve();
            }
          });

          return result;
        },

        _load: function(loadDef) {
          loadDef.resolve();
        },

        _resetLoader: function() {
          var that = this;

          this.loaded = false;

          // Reset deferreds and promises
          this._dataLoader = resetDeferred(this._dataLoader);
          this._extraLoader = resetDeferred(this._extraLoader);
          this._loader = resetDeferred(this._loader);

          this.dataLoader = this._dataLoader.promise();
          this.loader = this._loader.promise();

          // Call the extra loader function
          // Wait until after the current call stack has cleared to ensure it runs after the constructor or whatever else.
          // We don't want `_load()` getting called before the constructor even finishes - that is likely to create errors.
          setTimeout(function() { that._load(that._extraLoader); });

          // 10 second timeout for now
          setTimeout(function mLoaderTimeout() {
            that._dataLoader.reject(that, "Timed out trying to load model (id: " + that.id + ", cid: " + that.cid + ")");
            that._loader.reject(that, "Timed out trying to load model (id: " + that.id + ", cid: " + that.cid + ")");
          }, 10000);

          // Wait for both loaders to be resolved before saying we're done
          $.when(this.dataLoader, this._extraLoader.promise()).done(function() {
            that.loaded = true;
            that._loader.resolve();
          });
        },

        fetch: function(options) {
          options = options ? _.clone(options) : {};
          options.fromServer = true;
          return modelFetch.apply(this, options);
        },

        set: function(key, val, options) {
          var attrs, result, id;
          // -- COPIED FROM BACKBONE --
          if (key == null) return this;

          // Handle both `"key", value` and `{key: value}` -style arguments.
          if (typeof key === 'object') {
            attrs = key;
            options = val;
          } else {
            (attrs = {})[key] = val;
          }

          options || (options = {});
          // -- END BACKBONE COPY --

          if(options.fromServer) {
            this._dataLoader.resolve();
          } else if((id = attrs[this.idAttribute]) && id != this.id) {
            this._resetLoader();
          }

          result = modelSet.apply(this, arguments);

          return result;
        }
      });

      Backbone.Collection = Backbone.Collection.extend({
        model: Backbone.Model,

        constructor: function() {
          this._resetLoader();

          return collectionCtor.apply(this, arguments);
        },

        /**
         * This function can be overridden to do anything else necessary to be considered 'loaded' before resolving
         * the 'loader' deferred. Don't forget to call 'resolve' or 'reject' on the deferred that is passed to it!
         *
         * @param  {Deferred} loadDef The deferred object to resolve or reject when data is loaded or fails, respectively.
         */
        _load: function(loadDef) {
          loadDef.resolve();
        },

        _resetLoader: function(loadingModels) {
          var that = this, modelLoaders = [];

          this.loaded = false;

          if(!loadingModels) {
            loadingModels = this.models;
          }

          // Reset deferreds and promises
          this._modelLoader = resetDeferred(this._modelLoader);
          this._extraLoader = resetDeferred(this._extraLoader);
          this._loader = resetDeferred(this._loader);

          this.modelLoader = this._modelLoader.promise();
          this.loader = this._loader.promise();

          // Call the extra loader function
          // Wait until after the current call stack has cleared to ensure it runs after the constructor or whatever else.
          // We don't want `_load()` getting called before the constructor even finishes - that is likely to create errors.
          setTimeout(function() { that._load(that._extraLoader); });

          // Create an array of model loaders to watch for completion
          _.each(loadingModels, function(model) {
            modelLoaders.push(model.loader);
          });

          $.when.apply($, modelLoaders).done(function() {
            that._modelLoader.resolve();
          }).fail(function(model, reason) {
            that._modelLoader.reject(that, model, "A model failed to load: " + reason);
            that._loader.reject(that, model, "A model failed to load: " + reason);
          });

          // Wait for both loaders to be resolved before saying we're done
          $.when(this.modelLoader, this._extraLoader.promise()).done(function() {
            that.loaded = true;
            that._loader.resolve();
          });
        },

        add: function(models, options) {
          this._resetLoader(models);

          return collectionAdd.apply(this, arguments);
        }
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
    this.addLoaders = load(this._);
  }
}).call(this);