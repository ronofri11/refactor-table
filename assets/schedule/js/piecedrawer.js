define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "../js/gridparser"
    // "text!../templates/grid.html"
], function(Marionette, Radio, Shim, GridParser){
    var PieceDrawerConstructor = function(channelName){

        var PieceDrawer = new Marionette.Application();

        PieceDrawer.Channel = Radio.channel(channelName);

        //set of models and collections needed
        var Piece = Backbone.Model.extend({
            //piece should have attributes
            //"state", "enabled", "data"
            //"color"
        });

        var Pieces = Backbone.Collection.extend({
            model: Piece
        });

        //GOP stands for Group Of Pieces
        var GOP = Backbone.Model.extend({
            //GOP should have attributes:
            //"color", "index"
        });

        var GOPS = Backbone.Collection.extend({
            model: GOP
        });

        //should have a Piece as model
        var PieceView = Marionette.ItemView.extend({
            tagName: "div",
            className: "piece",
            template: _.template('<span></span>'),
            events: {
                "click": "broadcastEvent",
                "mouseover": "broadcastEvent",
                "mouseenter": "broadcastEvent",
                "mousedown": "broadcastEvent",
                "mousemove": "broadcastEvent",
                "mouseup": "broadcastEvent"
            },

            initialize: function(){
                this.listenTo(this.model, "change:state", this.setState);
            },

            onRender: function(){
                var width = this.options.renderParams.width;
                var height = this.options.renderParams.height;
                var start = parseFloat(this.model.get("start"));
                var end = parseFloat(this.model.get("end"));

                this.$el.css("height", (height * (end - start)) + "px");
                this.$el.css("top", (height * (start)) + "px");
                this.$el.css("position", "absolute");

                this.$el.css("width", width + "%");
                this.$el.css("left", (width * (this.model.get("index") - 1))+ "%");
                this.$el.css("height", (height * (end - start)) + "px");
                this.$el.css("top", (height * (start)) + "px");
                this.$el.css("position", "absolute");
                this.$el.css("z-index", this.options.renderParams.z);

                this.setState();
            },

            setState: function(){
                this.$el.removeClass("new");
                this.$el.removeClass("saved");
                this.$el.removeClass("deleted");

                this.$el.addClass(this.model.get("state"));
            },

            broadcastEvent: function(event){
                var eventName = "piece:" + event.type;
                PieceDrawer.Channel.trigger(eventName, {eventName: eventName, model: this.model});
            }
        });

        //should have a GOP as model
        var PiecesView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "layer",
            childView: PieceView,

            initialize: function(options){
                this.childViewOptions = {
                    renderParams: options.renderParams
                };

                // this.listenTo(this.collection, "add", this.render);
            },

            onRender: function(){
                this.$el.addClass("l"+this.options.renderParams.z);
            }
        });

        PieceDrawer.on("before:start", function(options){
            // console.log("before:start");
            //options.columns should contain an array of objects
            //with a key named cells, and a 
            PieceDrawer.Pieces = new Pieces();
            // PieceDrawer.Pieces.each(function(col){
            //     var cells = col.get("cells");
            //     var cellCollection = new Cells(cells);
            //     col.set("cells", cellCollection);
            // });
        });

        PieceDrawer.on("start", function(options){
            // console.log("start");
            //first render is different from the ones to follow

            PieceDrawer.View = new PiecesView({
                collection: PieceDrawer.Pieces,
                renderParams: {
                    height: options.height,
                    width: options.width,
                    z: options.z
                }
            });
        });

        PieceDrawer.Channel.on("piece:click", function(args){
            // console.log("channel:", PieceDrawer.Channel.channelName, args.model.toJSON());
        });

        PieceDrawer.Channel.reply("get:root", function(){
            // console.log(PieceDrawer.View);
            return PieceDrawer.View;
        });

        PieceDrawer.Channel.comply("draw:piece", function(args){
            if(args.model !== undefined){
                switch(args.model.get("state")){
                    case "deleted":
                        args.model.set({"state": "saved"});
                        break;
                }
            }
            else{
                var pieceData = {"x": args.x, "y": args.y};
                var existentPiece = PieceDrawer.Pieces.findWhere(pieceData);
                if(existentPiece === undefined){
                    var newPiece = new Piece({
                        "id": args.bloque_id,
                        "start": args.start,
                        "end": args.end,
                        "index": args.x,
                        "x": args.x,
                        "y": args.y,
                        "state": "new"
                    });
                    PieceDrawer.Pieces.add(newPiece);
                }
            }
        });

        PieceDrawer.Channel.comply("load:piece", function(args){
            var pieceData = {"id": args.id};
            var existentPiece = PieceDrawer.Pieces.findWhere(pieceData);
            if(existentPiece === undefined){
                var loadedPiece = new Piece({
                    "id": args.id,
                    "start": args.start,
                    "end": args.end,
                    "index": args.x,
                    "x": args.x,
                    "y": args.y,
                    "state": args.state
                });
                PieceDrawer.Pieces.add(loadedPiece);
            }
        });

        PieceDrawer.Channel.comply("delete:piece", function(args){
            // console.log("delete:piece", args);
            if(args.model !== undefined){
                switch(args.model.get("state")){
                    case "new":
                        PieceDrawer.Pieces.remove(args.model);    
                        break;
                    case "saved":
                        args.model.set({"state": "deleted"});
                        break;
                }
            }
            else{
                var pieceData;
                if(args.piece_id !== undefined){
                    pieceData = {"piece_id": args.piece_id};
                }
                else{
                    pieceData = {"x": args.x, "y": args.y};
                }
                var deletedPiece = PieceDrawer.Pieces.findWhere(pieceData);
                if(deletedPiece !== undefined){
                    PieceDrawer.Pieces.remove(deletedPiece);
                }
            }
        });

        PieceDrawer.Channel.comply("clean:piecedrawer", function(){
            PieceDrawer.Pieces.reset();
        });

        PieceDrawer.Channel.reply("export:pieces", function(){
            return PieceDrawer.Pieces.toArray();
        });

        return PieceDrawer;
    };

    return PieceDrawerConstructor;
});
