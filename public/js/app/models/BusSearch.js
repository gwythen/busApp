define([
  'backbone',
  'module',
  "collections/ResultCollection"
], function(
  Backbone,
  module,
  ResultCollection
) {
  var Search = Backbone.Model.extend({
  urlRoot: "api/search",
    url: function() {
      var url = this.urlRoot;
      var now = new Date();
      var depStop = {};
      var arrStop = {};
      console.log(this.get("outDepStop"));
      console.log(this.get("outArrStop"));
      console.log(this.get("inDepStop"));
      console.log(this.get("inArrStop"));
      if(now.getHours() <= 12) {
        depStop = this.get("outDepStop").id;
        arrStop = this.get("outArrStop").id;
      } else {
        arrStop = this.get("inDepStop").id;
        depStop = this.get("inArrStop").id;
      }
      url = url + "/?depStop=" + depStop + "&arrStop=" + arrStop;
      return url;
  },
  initialize: function() {
      this.set("outDepStop", null);
      this.set("outArrStop", null);
      this.set("inDepStop", null);
      this.set("inArrStop", null);
      this.fetchFromLocalStorage();
      this.on('change:outDepStop', this.setInLocalStorage, this);
      this.on('change:outArrStop', this.setInLocalStorage, this);
      this.on('change:inDepStop', this.setInLocalStorage, this);
      this.on('change:inArrStop', this.setInLocalStorage, this);
  },
  parse: function(response) {
        this.set({
          results: new ResultCollection(response)
        });
  },

  fetchFromLocalStorage: function() {
    if(localStorage.getItem('230Stops')) {
      try {
        var stops = JSON.parse(localStorage.getItem('230Stops'));
        console.log(stops);
        this.set("outDepStop", stops.outDepStop);
        this.set("outArrStop",  stops.outArrStop);
        this.set("inDepStop", stops.inDepStop);
        this.set("inArrStop",  stops.inArrStop);
        return true;
      } catch (e) {
          return false;
      }
    } else {
      return false;
    }

  },
  
  setInLocalStorage: function() {
    if(this.get("outDepStop") && this.get("outArrStop") && this.get("inDepStop") && this.get("inArrStop")) {
      var stops = {};
      stops.outDepStop = this.get("outDepStop");
      stops.inDepStop = this.get("inDepStop");
      stops.outArrStop = this.get("outArrStop");
      stops.inArrStop = this.get("inArrStop");
      localStorage.setItem("230Stops", JSON.stringify(stops));
    }

  },
  
  hasParameters: function() {
    if(this.has("outDepStop") && this.has("outArrStop") && this.has("inDepStop") && this.has("inArrStop")) {
      return true;
    } else {
      return false;
    }
  }

  });
  
  return Search;
});