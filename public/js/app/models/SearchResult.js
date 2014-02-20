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
        this.set("depDate", new Date(this.attributes.depDate));
        this.set("counter", this.getTimeDifference(this.attributes.depDate, new Date()));
        var self = this;
        this.counterInterval = setInterval(function () {
          var counter = self.getTimeDifference(self.attributes.depDate, new Date());
          self.set("counter", counter);
        }, 1000);
      },

      getTimeDifference: function(date1, date2) {
        var counter = {};
        counter.expired = false;
        var diff = date1.getTime() - date2.getTime();
        counter.diff = diff;
        var hours = Math.floor(diff / 1000 / 60 / 60);
        diff -= hours * 1000 * 60 * 60;
        var minutes = Math.floor(diff / 1000 / 60);
        diff-= minutes * 1000 * 60;
        var seconds = Math.floor(diff / 1000);
        var displayTime = "";
        if (hours > 0) {
          displayTime = (hours <= 9 ? "0" : "") + hours + " hrs and " + (minutes <= 9 ? "0" : "") + minutes + " mins";
        } else if(minutes > 0) {
            displayTime = (minutes <= 9 ? "0" : "") + minutes + " mins and " + (seconds <= 9 ? "0" : "") + seconds + " secs";
        } else if(seconds > 0) {
           displayTime = (seconds <= 9 ? "0" : "") + seconds + " secs";
        } else {
           displayTime = "00 secs";
           counter.expired = true;
           clearInterval(this.counterInterval);
        }
        counter.textual = displayTime.toUpperCase();
        return counter;    
      }
    });
  });