define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!./../templates/table.html",
    "text!./../templates/row.html"
], function (Marionette, Radio, Shim, TableTemplate, RowTemplate) {

    var TableConstructor = function(channelName){

        var Table = new Marionette.Application();
        Table.Channel = Radio.channel(channelName);

        Table.RowView = Marionette.ItemView.extend({
            tagName: "div",
            className: "row",
            template: _.template(RowTemplate),
            templateHelpers: function(){
                var cap = "placeholder";
                return {caption: cap};
            },
            events: {
                "click": "broadcastEvent",
                contextmenu: "broadcastEvent"
            },
            initialize: function(){
                // this.listenTo(this.model, "change:selected", this.styling);
                // this.listenTo(this.model, "model:modified", this.render);
            },
            onRender: function(){
                this.styling();
            },
            styling: function(){
                if(this.model.get("selected")){
                    this.$el.addClass("selected");
                }
                else{
                    this.$el.removeClass("selected");
                }
            },
            broadcastEvent: function(event){
                event.stopPropagation();
                event.preventDefault();
                var eventName = "row:" + event.type;
                Table.Channel.trigger(eventName, {eventName: eventName, model: this.model});
            }
        });

        // var AppendableRegion = Marionette.Region.extend({
        //     attachHtml: function(view){
        //         this.$el.append(view.el);
        //     }
        // });

        // var PrependableRegion = Marionette.Region.extend({
        //     attachHtml: function(view){
        //         this.$el.prepend(view.el);
        //     }
        // });

        Table.LayoutView = Marionette.LayoutView.extend({
            className: "tablecomponent",
            template: _.template(TableTemplate),
            regions:{
                "thead": "div.thead",
                "tbody": "div.tbody",
                "paging": "div.paging"
            },
            onRender: function(){

            }
        });

        Table.TableView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "rows",
            childView: Table.RowView,
            template: _.template(''),
            events: {
            },
            childEvents: {
                // "optionClicked": "optionClicked"
            }
        });

        Table.on("before:start", function(options){
            if(options.pages === undefined){
                //default number when it is not provided
                Table.pageNumber = 100;
            }
            else{
                Table.pageNumber = options.pages;
            }

            if(options.separator === undefined){
                //default property separator double underscore
                Table.separator = "__";
            }
            else{
                Table.separator = options.separator;
            }
        });

        Table.on("start", function(options){

            var RowCollection = Backbone.Collection.extend();

            Table.rows = options.models;
            Table.allowedSet = new RowCollection();
            Table.workingSet = new RowCollection();

            Table.allowedSet.reset(Table.rows.toArray());
            Table.workingSet.reset(Table.allowedSet.toArray());

            var Rows = new Table.TableView({
                collection: Table.workingSet
            });

            Table.RootView = new Table.LayoutView();


            //when the LayoutView is shown...
            Table.RootView.on("show", function(){
                Table.RootView.getRegion("tbody").show(Rows);
            });

            Table.Channel.reply("get:root", function(){
                return Table.RootView;
            });

            Table.Channel.on("row:click", function(){
                console.log("clicked row");
            });

            Table.Channel.on("row:contextmenu", function(){
                console.log("contextmenu row");
            });
        });

        return Table;
    };

    return TableConstructor;
});
