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

                this.busLines = new Bloodhound({
                    datumTokenizer: function (d) {
                        return Bloodhound.tokenizers.whitespace(d.linename);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    remote: {
                        url: '/api/searchLine/%QUERY',
                        wildcard: '%QUERY'
                    }
                });

                this.depStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.stopname);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: Stops.out.toJSON()
                });
                
                this.arrStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.stopname);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: Stops.in.toJSON()
                });

                this.retDepStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.stopname);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: Stops.in.toJSON()
                });
                
                this.retArrStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.stopname);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: Stops.in.toJSON()
                });

                this.busLines.initialize();
                this.depStops.initialize();
                this.arrStops.initialize();
                this.retDepStops.initialize();
                this.retArrStops.initialize();
                var self = this;

                $('#line .typeahead').typeahead(null, {
                  displayKey: 'linename',
                  source: this.busLines.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "line");
                    //fetch stops

                    self.fetchResults(datum.id);
                });

                self.initializeAutocompletes();
                
                if(this.model.hasParameters()) {
                    $('#line .typeahead').typeahead('val', this.model.get("line").linename);
                    $('#depStop .typeahead').typeahead('val', this.model.get("outDepStop").stopname);
                    $('#arrStop .typeahead').typeahead('val', this.model.get("outArrStop").stopname);
                    $('#retDepStop .typeahead').typeahead('val', this.model.get("inDepStop").stopname);
                    $('#retArrStop .typeahead').typeahead('val', this.model.get("inArrStop").stopname);
                    $('#depStop .typeahead').typeahead('close');
                    $('#arrStop .typeahead').typeahead('close');
                    $('#retDepStop .typeahead').typeahead('close');
                    $('#retArrStop .typeahead').typeahead('close');
                }
            },

            initializeAutocompletes: function() {
                var self = this;
                $('#depStop .typeahead').typeahead(null, {
                  displayKey: 'stopname',
                  source: this.depStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "outDepStop");
                    var returnStop = self.searchReturnStop(datum);
                });
                $('#arrStop .typeahead').typeahead(null, {
                  displayKey: 'stopname',
                  source: this.depStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "outArrStop");
                    var returnStop = self.searchReturnStop(datum);
                });
                $('#retDepStop .typeahead').typeahead(null, {
                  displayKey: 'stopname',
                  source: this.retDepStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "inDepStop");
                });
                $('#retArrStop .typeahead').typeahead(null, {
                  displayKey: 'stopname',
                  source: this.retArrStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "inArrStop");
                });
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
            },
            fetchResults: function(lineid) {
                var that = this;
                console.log(lineid);
                var params = {lineid: lineid};
                // stopcollection.set({ lineid: lineid});
                var stops = new Stops();
                stops.fetch({
                    data: $.param(params)
                }).done(function (data) {
                    Stops.out.reset(data[1]);
                    Stops.in.reset(data[2]);
                    that.depStops.clear();
                    that.arrStops.clear();
                    that.retDepStops.clear();
                    that.retArrStops.clear();
                    that.depStops.local = Stops.out.toJSON();
                    that.arrStops.local = Stops.out.toJSON();
                    that.retDepStops.local = Stops.in.toJSON();
                    that.retArrStops.local = Stops.in.toJSON();
                    that.depStops.initialize(true);
                    that.arrStops.initialize(true);
                    that.retDepStops.initialize(true);
                    that.retArrStops.initialize(true);                      
                });
            }

        });
    });