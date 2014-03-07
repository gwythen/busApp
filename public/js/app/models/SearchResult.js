define([
    "jquery",
    "backbone"
  ],
  function(
    $,
    Backbone
  ) {
    return Backbone.Model.extend({
      initialize: function() {
        var depDate = new Date(this.attributes.depHour);
        var arrDate = new Date(this.attributes.arrHour);
        console.log(depDate);
        console.log(arrDate);
        var self = this;
        this.set("duration", self.getTimeDifference(arrDate, depDate).textual);
        var currentDate = new Date();
        currentDate.setHours(depDate.getHours());
        currentDate.setMinutes(depDate.getMinutes());
        this.set("depDate", currentDate);
        this.set("depDisplayHour", depDate.getHours() + ":" + (depDate.getMinutes() <= 9 ? "0": "") + depDate.getMinutes());
        this.set("arrDisplayHour", arrDate.getHours() + ":" + (arrDate.getMinutes() <= 9 ? "0": "") + arrDate.getMinutes());
        this.set("counter", this.getCounter(currentDate, new Date()));
        
        this.counterInterval = setInterval(function () {
          var counter = self.getCounter(currentDate, new Date());
          self.set("counter", counter);
        }, 1000);
      },

      getCounter: function(date1, date2) {
        var counter = {};
        counter.expired = false;
        var difference = this.getTimeDifference(date1, date2);
        counter.textual = difference.textual;
        counter.diff = difference.diff;
        if(counter.textual === "00 SECS") {
          counter.expired = true;
          clearInterval(this.counterInterval);
        }
        return counter;
      },

      getTimeDifference: function(date1, date2) {
        var difference = {};
        var diff = date1.getTime() - date2.getTime();
        difference.diff = diff;
        var hours = Math.floor(diff / 1000 / 60 / 60);
        diff -= hours * 1000 * 60 * 60;
        var minutes = Math.floor(diff / 1000 / 60);
        diff-= minutes * 1000 * 60;
        var seconds = Math.floor(diff / 1000);
        var displayTime = "";
        if(difference.diff > 0) {
          if (hours > 0) {
            displayTime = (hours <= 9 ? "0" : "") + hours + " hrs and " + (minutes <= 9 ? "0" : "") + minutes + " mins";
          } else if(minutes > 0) {
              displayTime = (minutes <= 9 ? "0" : "") + minutes + " mins";
          } else if(seconds > 0) {
             displayTime = (seconds <= 9 ? "0" : "") + seconds + " secs";
          } else {
             displayTime = "00 secs";  
          }
        } else {
          displayTime = "00 secs";
        }
        
        difference.textual = displayTime.toUpperCase();
        return difference;    
      }
    });
  });