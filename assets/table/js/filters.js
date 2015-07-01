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
            modelEvents: {
                "change:query": "updateQuery"
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
                this.model.set({"query": filterQuery}, {silent: true});
                Filters.Channel.trigger("run:filters");
            },
            hideMglass: function(){
                this.$el.find("input").removeClass("mglass");
            },
            showMglass: function(){
                var input = this.$el.find("input");
                if(input.val().length == 0){
                    input.addClass("mglass");
                }
            },
            updateQuery: function(){
                this.$el.find("input").val(this.model.get("query"));
                this.showMglass();
            }
        });

        var FiltersView = Marionette.CollectionView.extend({
            className: "filters",
            childView: FilterView,
            template: _.template(''),
            runFilters: function(){
                var activeFilters = this.activeFilters();

                var relevantRows = Filters.allowedSet.filter(function(row){
                    var relevant = true;
                    _.each(activeFilters, function(filter){
                        relevant = (relevant && filter.filterRow(row));
                    });
                    return relevant;
                });

                Filters.workingSet.reset(relevantRows);
            },

            cleanFilters: function(){
                var activeFilters = this.activeFilters();
                _.each(activeFilters, function(filter){
                    filter.set({"query": ""});
                });
            },
            activeFilters: function(){
                var activeFilters = this.collection.filter(function(filter){
                     return filter.get("type") !== null && filter.get("query") != "";
                });
                return activeFilters;
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
                Filters.RootView.runFilters();
            });

            Filters.Channel.on("clean:filters", function(){
                Filters.RootView.cleanFilters();
                Filters.Channel.trigger("run:filters");
            });
        });

        return Filters;
    };

    return FilterConstructor;
});
