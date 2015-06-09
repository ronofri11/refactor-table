define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "../js/gridparser",
    // "text!../templates/grid.html"
], function(Marionette, Radio, Shim, GridParser){

    var GridConstructor = function(channelName){

        var Grid = new Marionette.Application();

        Grid.Channel = Radio.channel(channelName);

        //set of models and collections needed
        var Cell = Backbone.Model.extend({});

        var Cells = Backbone.Collection.extend({
            model: Cell
        });

        var Column = Backbone.Model.extend({});

        var Columns = Backbone.Collection.extend({
            model: Column,

            getCell: function(code){
                var splitCode = code.split(".");
                var col = this.findWhere({"index":splitCode[0]});
                var cell;
                if(col !== undefined){
                    var cell = col.get("cells").findWhere({"code": code});
                }
                return cell;
            },

            getCellById: function(id){
                var cell;
                this.each(function(col){
                    var c = col.get("cells").findWhere({"bloque_id": id});
                    if(c !== undefined){
                        cell = c;
                    }
                });

                return cell;
            }
        });

        //Views for the Grid App
        var CellView = Marionette.ItemView.extend({
            tagName: "li",
            template: _.template('<span></span>'),
            events: {
                "click": "broadcastEvent",
                "mouseover": "broadcastEvent",
                "mouseenter": "broadcastEvent",
                "mousedown": "broadcastEvent",
                "mousemove": "broadcastEvent",
                "mouseup": "broadcastEvent"
            },

            onShow: function(){
                var renderParams = Grid.Channel.request("get:grid:params");

                var height = renderParams.height;
                var start = parseFloat(this.model.get("start"));
                var end = parseFloat(this.model.get("end"));

                this.$el.css("height", (height * (end - start)) +  "px");
                this.$el.css("top", (height * (start)) + "px");
                this.$el.css("position", "absolute");
            },

            bubbleEvent: function(event){
                var eventName = "cell:" + event.type;
                this.triggerMethod(eventName, {eventName: eventName, model: this.model});
            },

            broadcastEvent: function(event){
                var eventName = "cell:" + event.type;
                Grid.Channel.trigger(eventName, {eventName: eventName, model: this.model});
            }
        });

        //replace with a CompositeView in case of a more complex scenario
        var ColumnView = Marionette.CollectionView.extend({
            tagName: "ul",
            className: "col",
            childView: CellView,

            initialize: function(options){
                this.collection = this.model.get("cells");
                this.childViewOptions = {
                    renderParams: options.renderParams
                };
            },

            onShow: function(){
                var renderParams = Grid.Channel.request("get:grid:params");
                this.$el.css("width", renderParams.width + "%");
                this.$el.css("height", renderParams.height + "px");
            },

            bubbleEvent: function(emitter, args){
                this.triggerMethod(args.eventName, args);
            }
        });

        var GridView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "grid",
            childView: ColumnView,

            onShow: function(){
                var parentHeight = this.$el.parent().height();

                this.$el.css("height", parentHeight + "px");

                Grid.renderParams = {
                    height: parentHeight,
                    width: parseFloat(100.0/Grid.Columns.length)
                }
            }
        });

        Grid.on("before:start", function(options){
            var Parser = new GridParser();
            var gridData = Parser.parse(options.source);
            Grid.Columns = new Columns(gridData.columns);
            Grid.Columns.each(function(col){
                var cells = col.get("cells");
                var cellCollection = new Cells(cells);
                col.set("cells", cellCollection);
            });
        });

        Grid.on("start", function(options){
            Grid.View = new GridView({
                collection: Grid.Columns
            });
        });

        //Grid publishes it's DOM events on the "grid" channel
        // Grid.Channel.on("cell:click", function(args){
        // });

        //Grid exposes an API through it's channel
        Grid.Channel.reply("get:cell", function(args){
            var code = args.code;
            var cell = Grid.Columns.getCell(code);
            return cell;
        });

        Grid.Channel.reply("get:cell:by:id", function(args){
            var id = args.id;
            var cell = Grid.Columns.getCellById(id);
            return cell;
        });

        Grid.Channel.reply("get:grid:params", function(){
            return Grid.renderParams;
        });

        Grid.Channel.reply("get:root", function(){
            return Grid.View;
        });

        Grid.Channel.reply("get:column:first", function(){
            return Grid.Columns.at(0).get("cells").toArray();
        });

        Grid.Channel.reply("get:column:at", function(args){
            var col = Grid.Columns.findWhere({"index": "" + args.x});
            if(col !== undefined){
                return col.get("cells").toArray();
            }
            return [];
        });

        Grid.Channel.reply("get:column:headers", function(){
            var headers = [
                {"index": 1, "caption": "Lunes"},
                {"index": 2, "caption": "Martes"},
                {"index": 3, "caption": "Miércoles"},
                {"index": 4, "caption": "Jueves"},
                {"index": 5, "caption": "Viernes"},
                {"index": 6, "caption": "Sábado"},
                {"index": 7, "caption": "Domingo"}
            ]

            var availableHeaders = [];

            _.each(headers, function(header){
                if(Grid.Columns.findWhere({"index": "" + header.index}) !== undefined){
                    availableHeaders.push(header);
                }
            });

            return availableHeaders;
        });

        return Grid;
    };

    return GridConstructor;
});
