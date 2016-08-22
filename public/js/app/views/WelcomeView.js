define( [ 'App', 'marionette', 'handlebars', 'collections/StopCollection', 'text!templates/welcome.html'],
    function( App, Marionette, Handlebars, Stops, template) {
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

                var allStops = this.getAllStops();

                this.depStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.stopname);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: allStops
                });
                
                this.arrStops = new Bloodhound({
                  datumTokenizer: function(d) {
                        return Bloodhound.tokenizers.whitespace(d.stopname);
                    },
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    local: allStops
                });


                this.busLines.initialize();
                this.depStops.initialize();
                this.arrStops.initialize();

                this.initializeAutocompletes();
                
                if(this.model.hasParameters()) {
                    $('#line .typeahead').typeahead('val', this.model.get("line").linename);
                    $('#depStop .typeahead').typeahead('val', this.model.get("depStop").stopname);
                    $('#arrStop .typeahead').typeahead('val', this.model.get("arrStop").stopname);

                    $('#depStop .typeahead').typeahead('close');
                    $('#arrStop .typeahead').typeahead('close');
                }
            },

            initializeAutocompletes: function() {
                var self = this;
                $('#line .typeahead').typeahead(null, {
                  displayKey: 'linename',
                  source: this.busLines.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "line");
                    self.fetchStops(datum.id);
                }).on('typeahead:active', function () {
                    $('#line .typeahead').typeahead('val', "");
                });
                $('#depStop .typeahead').typeahead(null, {
                  displayKey: 'stopname',
                  source: this.depStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "depStop");
                    //var returnStop = self.searchReturnStop(datum);
                }).on('typeahead:active', function () {
                    $('#depStop .typeahead').typeahead('val', "");
                });
                $('#arrStop .typeahead').typeahead(null, {
                  displayKey: 'stopname',
                  source: this.depStops.ttAdapter()
                }).on('typeahead:selected', function (obj, datum) {
                    console.log(datum);
                    self.saveValue(datum, "arrStop");
                    //var returnStop = self.searchReturnStop(datum);
                }).on('typeahead:active', function () {
                    $('#arrStop .typeahead').typeahead('val', "");
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
                this.model.setInLocalStorage();
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
            fetchStops: function(lineid) {
                var that = this;
                console.log(lineid);
                var params = {lineid: lineid};
                var stops = new Stops();
                stops.fetch({
                    data: $.param(params)
                }).done(function (data) {
                    Stops.out.reset(data[1]);
                    Stops.in.reset(data[2]);
                    var stops = that.getAllStops();
                    that.depStops.clear();
                    that.arrStops.clear();      
                    that.depStops.local = stops;
                    that.arrStops.local = stops;
                    that.depStops.initialize(true);
                    that.arrStops.initialize(true);
                });
            },
            getAllStops: function() {
                var all = Stops.out.toJSON().concat(Stops.in.toJSON());

                var allStops = _.reduce(all, function(result, value, key) {
                    var res =_.find(result, function(o) { return o.logicalid == value.logicalid; });
                   if(res === undefined) {
                    result.push(value);
                   }
                  return result;
                }, []);
                return allStops;
            }

        });
    });