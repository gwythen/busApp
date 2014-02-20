define([ 'marionette', 'handlebars', 'text!templates/nextBus.html'],
    function (Marionette, Handlebars, template) {
        //ItemView provides some default rendering logic
        return Marionette.ItemView.extend({
            template:Handlebars.compile(template),

            ui: {
				'counter':'#counter'
            },

            initialize: function () {
                if(this.model) {
                    this.model.on('change', _.bind(this.reRenderCounter, this));
                }	
			},

            onRender: function() {
                this.reRenderCounter();
            },
            
			reRenderCounter: function () {
                var counter = this.model.get('counter');
                if(counter.expired) {
                    this.ui.counter.text("TOO LATE!");
                } else {
                    var fiveMins = 5 * 60 * 1000;
                    this.ui.counter.text("IN " + counter.textual);
                    if(counter.diff < fiveMins) {
                        this.ui.counter.addClass("nearing");
                    } else {
                        this.ui.counter.removeClass("nearing");   
                    }
                }
                
			}
        });
    });