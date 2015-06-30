define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!./../templates/filter.html"
], function(Marionette, Radio, Shim, FilterTemplate){

    var FilterConstructor = function(channelName){

        var Filters = new Marionette.Application();

        Filters.Channel = Radio.channel(channelName);

        var FilterView = Marionette.ItemView.extend({
            tagName: "div",
            className: "filter",
            template: _.template(FilterTemplate),
            events: {
                "input input": "filterWorkingSet",
                "focusin input": "hideMglass",
                "focusout input": "showMglass"
            },

            initialize: function(){
                if(this.model.get("query") === undefined){
                    this.model.set({"query": ""});
                }
                this.setCallback();
            },

            setCallback: function(){
                //should set a different callback based on the filter's type
                // var filterNumber = function(row){
                //     return row.getCellValue()
                // };
                var self = this;
                var callback = function(row){
                    var query = self.model.get("query");
                    if(query === ""){
                        return true;
                    }
                    var rowProperty = row.getCellValue(self.model);
                    return rowProperty.toLowerCase().indexOf(query) > -1;
                };

                _.extend(this.model, {
                    filterRow: callback
                });
            },

            filterWorkingSet: function(args){
                var filterQuery = this.$el.find("input").val().toLowerCase();
                var self = this;

                this.model.set({"query": filterQuery});
                Filters.Channel.trigger("run:filters");
            },
            hideMglass: function(event){
                $(event.target).removeClass("mglass");
            },
            showMglass: function(){
                var self = $(event.target);
                if(self.val().length > 0){

                }else{
                    self.addClass("mglass");
                }
            }
        });

        var FiltersView = Marionette.CollectionView.extend({
            className: "filters",
            childView: FilterView,
            template: _.template(''),
            runFilters: function(){
                var activeFilters = this.collection.filter(function(filter){
                     return filter.get("type") !== null && filter.get("query") != "";
                });

                var relevantRows = Filters.allowedSet.filter(function(row){
                    var relevant = true;
                    _.each(activeFilters, function(filter){
                        relevant = (relevant && filter.filterRow(row));
                    });
                    return relevant;
                });

                Filters.workingSet.reset(relevantRows);
            }
        });

        Filters.on("start", function(options){
            Filters.allowedSet = options.allowedSet;
            Filters.workingSet = options.workingSet;

            Filters.RootView = new FiltersView({
                collection: options.filters
            });

            Filters.Channel.reply("get:root", function(){
                return Filters.RootView;
            });

            Filters.Channel.on("run:filters", function(){
                return Filters.RootView.runFilters();
            });
        });

        return Filters;
    };

    return FilterConstructor;
});
