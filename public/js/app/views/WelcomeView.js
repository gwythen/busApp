define( [ 'App', 'marionette', 'handlebars', 'collections/StopCollection', 'models/BusSearch', 'text!templates/welcome.html'],
    function( App, Marionette, Handlebars, Stops, BusSearch, template) {
        //ItemView provides some default rendering logic
        return Marionette.CompositeView.extend( {
            //Template HTML string
            template: Handlebars.compile(template),

            ui: {
                'submitButton': '#submitButton'
            },
            // View Event Handlers
            events: {
                'click #submitButton' : 'submit'
            },

            onShow: function() {
                this.toggleButton();

                var depStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.name);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: Stops.out.toJSON()
                });
                
                var arrStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.name);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: Stops.in.toJSON()
                });

                depStops.initialize();
                arrStops.initialize();
                var self = this;
                $('#depStop .typeahead').typeahead(null, {
                  displayKey: 'name',
                  source: depStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "outDepStop");
                    var returnStop = self.searchReturnStop(datum);
                });
                $('#arrStop .typeahead').typeahead(null, {
                  displayKey: 'name',
                  source: depStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "outArrStop");
                    var returnStop = self.searchReturnStop(datum);
                });
                $('#retDepStop .typeahead').typeahead(null, {
                  displayKey: 'name',
                  source: arrStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "inDepStop");
                });
                $('#retArrStop .typeahead').typeahead(null, {
                  displayKey: 'name',
                  source: arrStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "inArrStop");
                });
                if(this.model.hasParameters()) {
                    $('#depStop .typeahead').typeahead('val', this.model.get("outDepStop").name);
                    $('#arrStop .typeahead').typeahead('val', this.model.get("outArrStop").name);
                    $('#retDepStop .typeahead').typeahead('val', this.model.get("inDepStop").name);
                    $('#retArrStop .typeahead').typeahead('val', this.model.get("inArrStop").name);
                    $('#depStop .typeahead').typeahead('close');
                    $('#arrStop .typeahead').typeahead('close');
                }
            },

            saveValue: function(value, type) {
                this.model.set(type, value);
                this.toggleButton();
            },

            searchReturnStop: function(datum) {
                var inStops = Stops.in.toJSON();
                for(var i = 0; i < inStops.length; i++) {
                    if(inStops[i].logicalId == datum.logicalId) {
                        console.log(inStops[i]);
                        return inStops[i];
                    }
                }
            },

            submit: function(e) {
                e.preventDefault();
                this.trigger('fetchResults');
            },

            toggleButton: function() {
                if(this.model.hasParameters()) {
                    this.ui.submitButton.prop('disabled', false);
                } else {
                    this.ui.submitButton.prop('disabled', true);
                }
            }

        });
    });