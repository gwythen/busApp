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
    initialize: function() {
      this.fetchFromLocalStorage();
    },
    url: function() {
      var url = this.urlRoot;
      var now = new Date();
      var depStop = this.get("depStop").logicalid;
      var arrStop = this.get("arrStop").logicalid;
      var line = this.get("line").id;
      var direction = null;
      var revert = null;

      
      if(this.get("revert")) {
        depStop = this.get("currArrStop");
        arrStop = this.get("currDepStop");
        direction = this.get("currDirection") ? "&direction=" + this.get("currDirection") : null;
        revert = "&revert=true";
      } else {
        if(now.getHours() > 12) {
          depStop = this.get("arrStop").logicalid;
          arrStop = this.get("depStop").logicalid;
        }
      }

      this.set("currDepStop", depStop);
      this.set("currArrStop", arrStop);

      if(direction && revert) {
        url = url + "/?depStop=" + depStop + "&arrStop=" + arrStop + "&line=" + line + direction + revert;
      } else {
        url = url + "/?depStop=" + depStop + "&arrStop=" + arrStop + "&line=" + line;
      }
      
      return url;
    },
  
    parse: function(response) {
      this.set({
        results: new ResultCollection(response)
      });
      if(response.length) {
        this.set("currDirection", response[0].direction);
      }
    },

    fetchFromLocalStorage: function() {
      if(localStorage.getItem('busApp')) {
        try {
          var busAppData = JSON.parse(localStorage.getItem('busApp'));
          console.log(busAppData);
          this.set("line", busAppData.line);
          this.set("depStop", busAppData.depStop);
          this.set("arrStop",  busAppData.arrStop);
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
        busAppData.depStop = this.get("depStop");
        busAppData.arrStop = this.get("arrStop");
        localStorage.setItem("busApp", JSON.stringify(busAppData));
      }
    },

    submit: function(e) {
        e.preventDefault();
        this.trigger('fetchResults');
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