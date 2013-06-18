/**
 * Utility services for DEX v0.0.1
 *
 * Copyright (c) 2013 Deseret Digital Media - http://deseretdigital.com
 * Released under the MIT license
 *
 * Author: Justin Warkentin
 */
;(function() {
  function load(_) {

    return function(Backbone) {
      Backbone.Model = Backbone.Model.extend({
        /**
         * A better `parse` function. Returns the `data` property of the server response if there is one.
         */
        parse: function(resp, options) {
          return _.isObject(resp) ? resp.data || resp : {};
        }
      });

      Backbone.Collection = Backbone.Collection.extend({
        model: Backbone.Model,

        /**
         * A better `parse` function. Returns the `data` property of the server response if there is one.
         */
        parse: function(resp, options) {
          return _.isObject(resp) ? resp.data || resp : {};
        },

        /**
         * Moves a model to the given index, if different from its current index. Handy
         * for shuffling models about after they've been pulled into a new position via
         * drag and drop.
         */
        move: function(model, toIndex) {
          var fromIndex = this.indexOf(model);
          if (fromIndex == -1) {
            throw new Error("Can't move a model that's not in the collection");
          }
          if (fromIndex !== toIndex) {
            this.models.splice(toIndex, 0, this.models.splice(fromIndex, 1)[0]);

            this.trigger('move', model, this, {at: toIndex, to: toIndex, from: fromIndex});
          }
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
    this.addUtils = load(this._);
  }
}).call(this);