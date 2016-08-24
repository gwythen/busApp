define(["backbone"],
  function(Backbone) {
    var Storage = Backbone.Model.extend({
      fetchFromLocalStorage: function() {
        if(localStorage.getItem('busApp')) {
          try {
            var busAppData = JSON.parse(localStorage.getItem('busApp'));
            this.busAppData = busAppData ? busAppData : {};
            return this.busAppData;
          } catch (e) {
              this.busAppData = {};
              return this.busAppData;
          }
        } else {
          this.busAppData = {};
          return this.busAppData;
        }
      },
      setInLocalStorage: function(data) {
        this.fetchFromLocalStorage();
        var that = this;
        Object.keys(data).forEach(function (key) {
           if(data[key] != undefined) {
            that.busAppData[key] = data[key];
          }
        });
        localStorage.setItem("busApp", JSON.stringify(this.busAppData));
      }
    });
    
    LocalStorage = new Storage();    

    return LocalStorage;
  });