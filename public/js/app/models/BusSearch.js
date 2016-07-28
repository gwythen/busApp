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
      var depStop = this.get("depStop").logicalid;
      var arrStop = this.get("arrStop").logicalid;
      var line = this.get("line").id;

      if(now.getHours() <= 12) {
        depStop = this.get("depStop").logicalid;
        arrStop = this.get("arrStop").logicalid;
      } else {
        depStop = this.get("arrStop").logicalid;
        arrStop = this.get("depStop").logicalid;
      }
      url = url + "/?depStop=" + depStop + "&arrStop=" + arrStop + "&line=" + line;
      return url;
  },
  initialize: function() {
      this.set("line", null);
      this.set("depStop", null);
      this.set("arrStop", null);

      this.fetchFromLocalStorage();
      this.on('change:line', this.setInLocalStorage, this);
      this.on('change:depStop', this.setInLocalStorage, this);
      this.on('change:arrStop', this.setInLocalStorage, this);
  },
  parse: function(response) {
        this.set({
          results: new ResultCollection(response)
        });
  },

  fetchFromLocalStorage: function() {
    if(localStorage.getItem('busApp')) {
      try {
        var busAppData = JSON.parse(localStorage.getItem('busApp'));
        console.log(busAppData);
        this.set("line", busAppData.line);
        this.set("depStop", busAppData.outDepStop);
        this.set("arrStop",  busAppData.outArrStop);
        return true;
      } catch (e) {
          return false;
      }
    } else {
      return false;
    }

  },
  
  setInLocalStorage: function() {
    if(this.has("line") && this.get("depStop") && this.get("arrStop")) {
      var busAppData = {};
      busAppData.line = this.get("line");
      busAppData.outDepStop = this.get("depStop");
      busAppData.outArrStop = this.get("arrStop");
      localStorage.setItem("busApp", JSON.stringify(busAppData));
    }

  },
  
  hasParameters: function() {
    if(this.has("line") && this.has("depStop") && this.has("arrStop")) {
      return true;
    } else {
      return false;
    }
  }

  });
  
  return Search;
});