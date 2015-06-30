define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!./../templates/header.html"
], function(Marionette, Radio, Shim, HeaderTemplate){

    var HeadersConstructor = function(channelName){

        var Headers = new Marionette.Application();

        Headers.Channel = Radio.channel(channelName);

        var HeaderView = Marionette.ItemView.extend({
            tagName: "div",
            className: "header",
            template: _.template(HeaderTemplate),
            events: {
                "click": "sortWorkingSet"
            },
            modelEvents: {
                "change:sort": "styling"
            },

            initialize: function(){
                this.model.set({"sort": null});
                this.setCallback();
            },
            setCallback: function(){
                //should set a different callback based on the field's type
                //at least with numbers, booleans and strings.
                var self = this;
                var callback = function(row){
                    var str = row.getCellValue(self.model);
                    str = str.toLowerCase();
                    if(self.model.get("sort") === "DESC"){
                        str = str.split("");
                        str = _.map(str, function(letter) {
                            return String.fromCharCode(-(letter.charCodeAt(0)));
                        });
                    }
                    return str;
                };

                _.extend(this.model, {
                    sortColumn: callback
                });
            },

            onRender: function(){
                this.$el.width(this.model.get("width") + "px");
                this.styling();
            },

            styling: function(){
                var arrow = this.$el.find(".arrow");

                arrow.removeClass("upArrow");
                arrow.removeClass("downArrow");
                arrow.removeClass("noArrow");

                switch(this.model.get("sort")){
                    case null:
                        arrow.addClass("noArrow");
                        break;
                    case "ASC":
                        arrow.addClass("upArrow");
                        break;
                    case "DESC":
                        arrow.addClass("downArrow");
                        break;
                }
            },

            nextState: function(){
                var nextState;

                switch(this.model.get("sort")){
                    case null:
                        nextState = "ASC";
                        break;
                    case "ASC":
                        nextState = "DESC";
                        break;
                    case "DESC":
                        nextState = "ASC";
                        break;
                }

                this.model.set({"sort": nextState});
            },

            sortWorkingSet: function(){
                this.nextState();
                var self = this;
                if(this.model.get("sort") !== null){
                    Headers.Channel.trigger("sort:column", {
                        sorter: this.model
                    });
                }
            }
        });

        var HeadersView = Marionette.CollectionView.extend({
            className: "headers",
            childView: HeaderView,
            template: _.template('')
        });
        
        Headers.on("start", function(options){
            Headers.allowedSet = options.allowedSet;
            Headers.workingSet = options.workingSet;

            Headers.RootView = new HeadersView({
                collection: options.headers
            });

            Headers.Channel.reply("get:root", function(){
                return Headers.RootView;
            });

            Headers.Channel.on("sort:column", function(args){
                var sortedSet = Headers.allowedSet.sortBy(args.sorter.sortColumn);
                Headers.allowedSet.reset(sortedSet, {silent: true});
            });
        });

        return Headers;
    };

    return HeadersConstructor;
});
