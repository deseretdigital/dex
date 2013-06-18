/**
 * Auto-save service for DEX v0.0.1
 *
 * Copyright (c) 2013 Deseret Digital Media - http://deseretdigital.com
 * Released under the MIT license
 *
 * Author: Justin Warkentin
 */
;(function() {
  function load(_) {

    return function(Backbone) {
      var modelCtor = Backbone.Model.prototype.constructor;
      var modelSet = Backbone.Model.prototype.set;

      Backbone.Model = Backbone.Model.extend({
        constructor: function(attributes, options) {
          var that = this;
          _.defaults(options || (options = {}), {
            autosave: true,
            autosaveDelay: 500
          });

          this.dirtyAttributes = {};
          this._saveIfDirty = _.debounce(function() {
            if(that.url && options.autosave && !that.isNew() && that.isDirty()) {
              that.save();
            }
          }, options.autosaveDelay);

          return modelCtor.apply(this, arguments);
        },

        isNew: function() {
          // If there is an id or server attributes then this isn't new data
          return !this.id && !_.size(this._serverAttributes);
        },

        set: function(key, val, options) {
          var attrs;
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


          var result = modelSet.apply(this,arguments);
          this._findDirtyAttrs(attrs);
          this._saveIfDirty();

          return result;
        },

        _findDirtyAttrs: function(checkAttrs) {
          if(_.isObject(checkAttrs)) {
            checkAttrs = _.keys(checkAttrs);
          } else if(!_.isArray(checkAttrs)) {
            checkAttrs = _.keys(this.attributes);
          }

          // We use a standard `for` loop for performance. See http://jsperf.com/lo-dash-each-vs-native-foreach/4
          for(var i = 0; i < checkAttrs.length; i++) {
            var attr = checkAttrs[i];

            if(!_.isEqual(this.attributes[attr], this.serverAttributes[attr])) {
              this.dirtyAttributes[attr] = true;
            } else {
              delete this.dirtyAttributes[attr];
            }
          }
        },

        isDirty: function(attr) {
          if(attr) {
            return _.has(this.dirtyAttributes, attr);
          } else {
            return Boolean(_.size(this.dirtyAttributes));
          }
        }
      });

      // Bare minimum required to avoid errors and make sure order of layers being loaded doesn't matter
      Backbone.Collection = Backbone.Collection.extend({
        model: Backbone.Model
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
    this.addAutosave = load(this._);
  }
}).call(this);