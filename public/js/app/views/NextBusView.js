define([ 'marionette', 'handlebars', 'text!templates/nextBus.html'],
    function (Marionette, Handlebars, template) {
        //ItemView provides some default rendering logic
        return Marionette.ItemView.extend({
            template:Handlebars.compile(template),

            ui: {
				'counter':'#counter',
                'submit':'#submit'
            },

            events: {
                'click submit' : 'submit'
            },

            initialize: function () {
                if(this.model) {
                    this.model.on('change', _.bind(this.reRenderCounter, this));
                }
                this.on("eventHandler", function(e) {
                    if(e.target.id == "submit") {
                        this.submit(e);
                    }
                })
			},

            onRender: function() {
                this.reRenderCounter();
            },

            submit: function(e) {
                e.preventDefault();
                this.trigger('fetchResults', {revert: true});
            },
            
			reRenderCounter: function () {
                var counter = this.model.get('counter');
                if(counter.expired) {
                    this.ui.counter.text("TOO LATE!");
                } else {
                    var fiveMins = 5 * 60 * 1000;
                    this.ui.counter.text(counter.textual);
                    if(counter.diff < fiveMins) {
                        this.ui.counter.addClass("nearing");
                    } else {
                        this.ui.counter.removeClass("nearing");   
                    }
                }
                
			}
        });
    });