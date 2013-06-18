/**
 * Memory Management service for DEX v0.0.1
 *
 * Copyright (c) 2013 Deseret Digital Media - http://deseretdigital.com
 * Released under the MIT license
 *
 * Author: Justin Warkentin
 */
;(function() {
  function load(_) {

    return function(Backbone) {
      var eventOn = Backbone.Events.on,
          eventOff = Backbone.Events.off;

      Backbone.Events = _.extend(Backbone.Events, {
        passiveEvents: ['error', 'shutdown'],

        on: function(name, callback, context, passive) {
          var result = eventOn.apply(this, arguments),
              events, passiveEvents = this.passiveEvents || [];

          // We will force event bindings to be passive if an object binds to itself or if the object says the event should
          // be passive, unless the binding call explicitly states that it shouldn't be passive. Objects generally shouldn't
          // keep themselves in memory and certain types of event bindings should just always be passive (e.g. 'shutdown', 'error').
          if(passive !== false && (context == this || passiveEvents.indexOf(name) != -1)) {
            passive = true;
          }

          // Mark the event binding as a passive binding.
          // NOTE: This is surprisingly robust and future proof and works well with the Backbone `eventsApi()` because of the
          //       `this._events[name]` check.
          if(passive && this._events && (events = this._events[name]) && events[events.length - 1].callback == callback) {
            events[events.length - 1].passive = true;
          }

          return result;
        },

        off: function() {
          var result = eventOff.apply(this, arguments);
          this.tryClean();
          return result;
        },

        countCallbacks: function() {
          var total = 0, passive = 0,
              evt, events, i;

          if(this._events) {
            for(evt in this._events) {
              events = this._events[evt];
              total += events.length;
              for(i = 0; i < events.length; i++) {
                if(events[i].passive) {
                  passive++;
                }
              }
            }
          }

          return {total: total, passive: passive};
        },

        tryClean: function() {
          var that = this,
              cbCounts = this.countCallbacks();

          if(cbCounts.total <= cbCounts.passive) {
            // We defer the execution of the cleanup check at least until after the current call stack has finished executing
            // because something in the current call stack, or shortly thereafter, may try to use/bind to the object again.
            // There's no point in cleaning it up if it's just going to be used again right away. That, and if something has
            // a reference to it and binds to it in the current call stack, and then we clean it up right after then it will
            // create bugs for sure.
            setTimeout(function() {
              var newCbCounts = that.countCallbacks();

              if(newCbCounts.total <= newCbCounts.passive) {
                if(that._isShutdown) return;
                that._isShutdown = true;

                // Let the object do whatever it needs to before shutting down
                if(_.isFunction(that.onShutdown)) {
                  that.onShutdown();
                }
                that.trigger('shutdown');

                // Cleanup all event bindings to and from the object
                that.stopListening();
                that.off();

                // Allow this object to do it's own cleanup
                if(_.isFunction(that._cleanup)) {
                  that._cleanup();
                }
              }
            }, 1000);
          }
        }
      });


      // Apply to models and collections
      _.extend(Backbone.Model.prototype, Backbone.Events);
      _.extend(Backbone.Collection.prototype, Backbone.Events, {
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
    this.addMemory = load(this._);
  }
}).call(this);