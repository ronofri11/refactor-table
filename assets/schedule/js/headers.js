define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim"
], function(Marionette, Radio, Shim){

    var HeadersConstructor = function(channelName){
        
        var Headers = new Marionette.Application();

        Headers.Channel = Radio.channel(channelName);

        //set of models and collections needed
        var Header = Backbone.Model.extend({
            initialize: function(){
                this.set({"selected": false});
            }
        });

        var HeaderCollection = Backbone.Collection.extend({
            model: Header
        });

        //Views for the Grid App
        var HeaderView = Marionette.ItemView.extend({
            tagName: "li",
            template: _.template('<span><%-caption%></span>'),

            initialize: function(){
                this.listenTo(this.model, "change:selected", this.setSelected);
            },

            onRender: function(){
                this.$el.css("width", this.options.renderParams.width + "%");
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
        var HeadersView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "title",

            childView: HeaderView,

            initialize: function(options){
                this.childViewOptions = {
                    renderParams: options.renderParams
                };
            },

            onRender: function(){
                this.$el.attr("id", "title-days");
            },

            highlight: function(args){
                var x = args.x;

                this.collection.each(function(header) {
                    header.set({"selected": false});
                    
                    if(header.get("index") == x){
                        header.set({"selected": true});
                    }
                });
            },

            clearHighlight: function(){
                this.collection.each(function(header) {
                    header.set({"selected": false});
                });
            }
        });

        Headers.on("before:start", function(options){
            // console.log("before:start");
            //options.defaultCells should contain an array of cells
            Headers.Headers = new HeaderCollection(options.headers);
            // console.log("before:start Headers", options);
        });

        Headers.on("start", function(options){
            // console.log("start");

            Headers.View = new HeadersView({
                collection: Headers.Headers,
                renderParams: {
                    width: options.renderParams.width
                }
            });
        });

        //Headers exposes an API through it's channel
        Headers.Channel.comply("set:cells", function(args){
            var testHeader = Headers.Headers.at(0);
            if(testHeader !== undefined){
                if(args.cells.length > 0){
                    if(testHeader.get("x") !== args.cells[0].get("x")){
                        Headers.Headers.reset(args.cells);
                    }
                }
            }
        });

        Headers.Channel.comply("set:highlight", function(args){
            Headers.View.highlight(args);
        });

        Headers.Channel.comply("clear:highlight", function(){
            Headers.View.clearHighlight();
        });

        Headers.Channel.reply("get:headers:params", function(){
            return Headers.View.getOption("renderParams");
        });

        Headers.Channel.reply("get:root", function(){
            return Headers.View;
        });

        return Headers;
    };

    return HeadersConstructor; 
});
