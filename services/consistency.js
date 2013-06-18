/**
 * Data Consistency service for DEX v0.0.1
 *
 * Copyright (c) 2013 Deseret Digital Media - http://deseretdigital.com
 * Released under the MIT license
 *
 * Author: Justin Warkentin
 */
;(function() {
  function load(_) {

    // Unfortunately, the logic for getting this just right got too complicated, so now it gets it's own function.
    //  1) Passing 'null' or 'undefined' to the `Date` constructor gives bad date values
    //  2) You CAN'T use `call` or `apply` on the `Date` constructor. See http://stackoverflow.com/questions/1090815/how-to-clone-a-date-object-in-javascript#1090817
    //  3) Passing a Date object to the Date constructor doesn't copy it exactly - it gets the milliseconds wrong. `getTime()` is required.
    function getTimestamp(timestamp) {
      var ts;
      if(timestamp) {
        ts = timestamp instanceof Date ? (new timestamp.getTime()) : new Date(+timestamp);
      } else {
        ts = new Date;
      }

      return ts;
    }

    return function(Backbone) {
      var modelCtor = Backbone.Model.prototype.constructor,
          modelSet = Backbone.Model.prototype.set,
          modelFetch = Backbone.Model.prototype.fetch,

          colCtor = Backbone.Collection.prototype.constructor,
          colSet = Backbone.Collection.prototype.set,
          colReset = Backbone.Collection.prototype.reset,
          colRemove = Backbone.Collection.prototype.remove,
          colFetch = Backbone.Collection.prototype.fetch,

          bbSync = Backbone.sync;

      // Trigger needed events around saving to provide data consistency
      Backbone.sync = function(method, model, options) {
        var xhr = bbSync.apply(this, arguments),
            removedCollections = [];

        if(method != 'read') {
          model.saving = true;
          model.trigger('saveStart', model, xhr, options);

          // If a model is added to a collection while it's saving, the new collection needs to know
          model.on('add', function triggerSave(model, collection, options) {
            collection.trigger('saveStart', model, xhr, options);
          });

          // If the model is removed from a collection while it's saving and the removal didn't happen due to getting
          // a new set of models from the server, the collection still needs to remain frozen until the save is successful.
          model.on('remove', function triggerDone(model, collection, options) {
            if(!options.fromServer) {
              removedCollections.push(collection);
            }
          });

          $.when(xhr).always(function() {
            delete model.saving;
            model.off('add', triggerSave);
            model.off('remove', triggerDone);
          }).done(function() {
            model.trigger('saveSuccess', model, xhr, options);

            _.each(removedCollections, function(collection) {
              collection.trigger('saveSuccess', model, xhr, options);
            });
          }).fail(function() {
            model.trigger('saveFail', model, xhr, options);

            _.each(removedCollections, function(collection) {
              collection.trigger('saveFail', model, xhr, options);
            });
          });
        }
      };

      Backbone.Model = Backbone.Model.extend({
        constructor: function() {
          this._dataTS = 0;
          this.serverAttributes = {};
          this.conflicts = {};

          return modelCtor.apply(this, arguments);
        },

        fetch: function() {
          options || (options = {});
          options.fromServer = true;
          options.timestamp = new Date;

          modelFetch.call(this, options);
        },

        set: function(key, val, options) {
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


          var that = this,
              attrs, attr,
              serverDelta = {},
              newAttrs = {},
              newConflicts = [],
              ts = getTimestamp(options.timestamp);

          if(options.fromServer) {
            // We can safely ignore data that's older than the data we've already received
            if(ts < this._dataTS) {
              return;
            }

            for(attr in attrs) {
              if(!_.isEqual(this.serverAttributes[attr], attrs[attr])) {
                serverDelta[attr] = this.serverAttributes[attr];
              }
            }
            this.serverAttributes = attrs;
            this._dataTS = ts;
          }

          for(attr in attrs) {
            var val = attrs[attr];

            if(options.noConflict) {
              delete this.conflicts[attr];
            }

            // Don't call set on attributes that haven't actually changed
            // Without this it would be possible below to have a conflict when the value is changed on both the client and server
            // but they are both equal.
            if(_.isEqual(val, this.attributes[attr])) {
              delete this.conflicts[attr];
              continue;
            }

            // If we're setting data from the server, only set the attributes that have actually changed
            if(options.fromServer && _.has(this.serverAttributes, attr)) {
              var changedOnServer = _.has(serverDelta, attr);
              var changedOnClient = _.has(this.dirtyAttributes, attr);

              // Check for merge conflict - value has changed on both client and server. User may have to decide which to use - or how to merge.
              // Conflicts should be resolved by binding to the 'conflict[:attribute]' event(s) and using model.isDirty([attr]) to determine
              // which have conflicts. Any that are dirty on that event have a merge conflict.
              if(changedOnServer && changedOnClient) {
                // Callback signature: _handleConflict(attr, oldSrvVal, newSrvVal, localVal) -> a.k.a (parent, remote, local)
                if(!this._handleConflict ||
                    (val = this._handleConflict(attr, serverDelta[attr], val, this.attributes[attr])) == undefined) {
                  if(!this.conflicts[attr]) {
                    this.conflicts[attr] = true;
                    newConflicts.push(attr);

                    console.warn("Unresolved merge conflict on '" + attr + "' attribute", this);
                  }
                }
              }

              // When setting data from the server, only set attributes that have changed on the server and not on the client
              if(!changedOnServer || changedOnClient) {
                continue;
              }
            }

            // If we've made it this far, then set the attribute!
            //newAttrs[attr] = _.clone(attrs[attr], true);
            newAttrs[attr] = val;
          }

          var result = modelSet.call(this, newAttrs, options);
          setTimeout(function() {
            for(var i = 0; i < newConflicts.length; i++) {
              var attr = newConflicts[i];
              that.trigger('conflict', attr, serverDelta[attr], attrs[attr], that.attributes[attr]);
            }
          });
          return result;
        }
      });


      function getReSetFn(fn) {
        return function(models, options) {
          options || (options = {});
          var that = this,
              ts = getTimestamp(options.timestamp);

          // We can safely ignore data that's older than the data we've already received
          if(options.fromServer && (ts < this._dataTS || ts < this._lastData.options.timestamp)) {
            return;
          }

          // If any of the models in the collection are unsaved we want to freeze server updates to the collection until they are saved
          if(!options.fromServer || !_.size(this._unsavedModels)) {
            this._dataTS = ts;
            return fn.apply(this, arguments);
          } else {
            that._lastData = {data: models, options: options};
          }
        };
      }

      var resetFn = getReSetFn(colReset),
          setFn = getReSetFn(colSet);

      Backbone.Collection = Backbone.Collection.extend({
        model: Backbone.Model,

        constructor: function(models, options) {
          var that = this;

          options || (options = {});

          this._dataTS = 0;
          this._unsavedModels = {};
          this._lastData = {data: null, options: {timestamp: 0}};

          /*this._lastDataFallback = _.debounce(function() {
            var ldata = that._lastData;
            delete that._lastData.data;
            that.set(ldata.data, ldata.options);
          }, options.fallbackDelay || 5000);*/

          /*this.on('saveStart', function(model, xhr, options) {
            this._savingModels[model.cid] = model;
          }, this);*/

          this.on('saveSuccess', function(model, xhr, options) {
            var that = this;
            options || (options = {});
            delete this._unsavedModels[model.cid];

            if(!_.size(this._unsavedModels)) {
              var ldata = that._lastData.data,
                  ldoptions = that._lastData.options;
              delete that._lastData.data;

              setTimeout(function() {
                that.set(ldata, ldoptions);
              }, options.fallbackDelay || 5000);
            }
          }, this);

          this.on('saveFail', function(model, xhr, options) {
            // TODO: What to do? It's still unsaved - collection should be frozen
          }, this);

          this.on('remove silentRemove', function(model, collection, options) {
            options || (options = {});
            if(options.fromServer) {
              delete this._unsavedModels[model.cid];
            } else {
              model.once('saveSuccess', function(model, xhr, options) {
                this.trigger('saveSuccess', model, xhr, options);
              }, this);
            }
          }, this);

          this.on('change add silentAdd', function(model) {
            if(model.isDirty() && !model.saving) {
              this._unsavedModels[model.cid] = model;
            }
          }, this);

          return colCtor.call(this, models, options);
        },

        remove: function(models, options) {
          options || (options = {});

          if(options.silent) {
            for(var i = 0; i < models.length; i++) {
              model.trigger('silentRemove', model, this, options);
            }
          }

          return colRemove.call(this, models, options);
        },

        fetch: function() {
          options || (options = {});
          options.fromServer = true;
          options.timestamp = new Date;

          colFetch.call(this, options);
        },

        reset: function() {
          var that = this;
          this.each(function(model) {
            that.trigger('silentRemove', model, that);
          });
          return resetFn.apply(this, arguments);
        },

        set: function(models, options) {
          var result,
              beforeModels;

          if(options.silent) {
            beforeModels = _.clone(this._byId);
          }

          result = setFn.apply(this, arguments);

          if(beforeModels) {
            for(var i = 0; i < this.models.length; i++) {
              var model = this.models[i];
              if(!beforeModels[model.cid]) {
                this.trigger('silentAdd', model, this, options);
              }
            }
          }

          return result;
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
    this.addConsistency = load(this._);
  }
}).call(this);