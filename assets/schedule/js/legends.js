define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim"
], function(Marionette, Radio, Shim){
    
    var LegendsConstructor = function(channelName){

        var Legends = new Marionette.Application();

        Legends.Channel = Radio.channel(channelName);

        //set of models and collections needed
        var Legend = Backbone.Model.extend({
            initialize: function(){
                this.set({"selected": false});
            }
        });

        var LegendCollection = Backbone.Collection.extend({
            model: Legend
        });

        //Views for the Grid App
        var LegendView = Marionette.ItemView.extend({
            tagName: "li",
            className: "legend",
            template: _.template('<span><%-start_time%> - <%-end_time%></span>'),

            initialize: function(){
                this.listenTo(this.model, "change:selected", this.setSelected);
            },

            onRender: function(){
                var start = parseFloat(this.model.get("start"));
                var end = parseFloat(this.model.get("end"));
                this.$el.css("height", (this.options.renderParams.height * (end - start)) + "px");
                this.$el.css("position", "absolute");
                this.$el.css("top", (this.options.renderParams.height * (start)) + "px");
            },

            setSelected: function(){
                if(this.model.get("selected")){
                    this.$el.addClass("pointer");
                }
                else{
                    this.$el.removeClass("pointer");
                }
            }
        });

        //replace with a CompositeView in case of a more complex scenario
        var LegendsView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "legends",

            childView: LegendView,

            initialize: function(options){
                this.childViewOptions = {
                    renderParams: options.renderParams
                };
            },

            onRender: function(){
                this.$el.css("height", this.options.renderParams.height + "px");
            },

            highlight: function(args){
                var y = args.y;

                this.collection.each(function(legend) {
                    legend.set({"selected": false});
                    
                    if(legend.get("y") === y){
                        legend.set({"selected": true});
                    }
                });
            },

            clearHighlight: function(){
                this.collection.each(function(legend) {
                    legend.set({"selected": false});
                });
            }
        });

        Legends.on("before:start", function(options){
            // console.log("before:start");
            //options.defaultCells should contain an array of cells
            Legends.Legends = new LegendCollection(options.defaultCells);
            // console.log("before:start Legends", options);
        });

        Legends.on("start", function(options){
            // console.log("start");

            Legends.View = new LegendsView({
                collection: Legends.Legends,
                renderParams: {
                    height: options.renderParams.height
                }
            });
        });

        //Legends exposes an API through it's channel
        Legends.Channel.comply("set:cells", function(args){
            var testLegend = Legends.Legends.at(0);
            if(testLegend !== undefined){
                if(args.cells.length > 0){
                    if(testLegend.get("x") !== args.cells[0].get("x")){
                        Legends.Legends.reset(args.cells);
                    }
                }
            }
        });

        Legends.Channel.comply("set:highlight", function(args){
            Legends.View.highlight(args);
        });

        Legends.Channel.comply("clear:highlight", function(){
            Legends.View.clearHighlight();
        });

        Legends.Channel.reply("get:legends:params", function(){
            return Legends.View.getOption("renderParams");
        });

        Legends.Channel.reply("get:root", function(){
            return Legends.View;
        });

        return Legends;
    };

    return LegendsConstructor;
        
});
