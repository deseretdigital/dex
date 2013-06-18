define([
  'underscore',
  'backbone',
  './services/accessors',
  './services/autosave',
  './services/consistency',
  './services/load',
  './services/memory',
  './services/singleton',
  './services/util'
], function(_, Backbone, addAccessors, addAutosave, addConsistency, addLoaders, addMemory, addSingleton, addUtils) {
  var dex = _.extend({}, Backbone);

  addAccessors(dex);
  addLoaders(dex);
  addAutosave(dex);
  addUtils(dex);
  addMemory(dex);
  addConsistency(dex);
  addSingleton(dex);

  return dex;
});