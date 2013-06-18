/**
 * Accessor service for DEX v0.0.1
 *
 * Copyright (c) 2013 Deseret Digital Media - http://deseretdigital.com
 * Released under the MIT license
 *
 * Author: Justin Warkentin
 */
;(function() {
  function load(_) {

    return function(Backbone) {
      var modelGet = Backbone.Model.prototype.get;
      var modelSet = Backbone.Model.prototype.set;

      Backbone.Model = Backbone.Model.extend({
        attrNameCache: {},

        convertAttrName: function(attr) {
          var attrName;
          if(attrName = this.attrNameCache[attr]) {
            return attrName;
          }

          return this.attrNameCache[attr] = _(attr).camelize().capitalize().value();
        },

        has: function(attr) {
          return _.has(this.attributes, attr);
        },

        get: function(attr) {
          var convertedAttr = this.convertAttrName(attr);
          var getter = 'get' + convertedAttr;

          // If the getter is already being called, don't call it recursively, just return the attribute value (if there is one)
          var gettingProp = '_getting' + convertedAttr;
          if(this[gettingProp]) {
            return modelGet.apply(this, arguments);
          } else {
            this[gettingProp] = true;
          }

          // Get attribute value
          var attrVal;
          if(this[getter]) {
            attrVal = this[getter].apply(this, Array.prototype.slice.call(arguments, 1));
          } else if(this._get) {
            attrVal = this._get.apply(this, arguments);
          } else {
            attrVal = modelGet.apply(this, arguments);
          }

          delete this[gettingProp];
          return attrVal;
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


          var newAttrs = {};
          for(var attr in attrs) {
            var convertedAttr = this.convertAttrName(attr);
            var setter = 'set' + convertedAttr;
            var val = attrs[attr];

            // If the setter is already being called, don't call it recursively, just return the attribute value (if there is one)
            var settingProp = '_setting' + convertedAttr;
            if(this[settingProp]) {
              newAttrs[attr] = val;
              continue;
            } else {
              this[settingProp] = true;

              var setOpts = _.clone(options, true);
              setOpts.setAttrs = attrs;

              if(this[setter]) {
                val = this[setter](attrs[attr], setOpts);
              } else if(this._set) {
                val = this._set(attr, attrs[attr], setOpts);
              }

              // If nothing was returned then we won't set a value. Instead we assume the setter took care of it.
              if(val !== undefined && val != this) {
                newAttrs[attr] = val;
              }
              delete this[settingProp];
            }
          }

          return modelSet.call(this, newAttrs, options);
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
    this.addAccessors = load(this._);
  }
}).call(this);