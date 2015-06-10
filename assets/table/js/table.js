define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "assets/table/js/paging.js",
    "text!./../templates/table.html",
    "text!./../templates/row.html"
], function (Marionette, Radio, Shim, Paging, TableTemplate, RowTemplate) {

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

            console.log("table config:", options);

            if(options.recordsPerPage === undefined){
                //default number when it is not provided
                Table.recordsPerPage = 100;
            }
            else{
                Table.recordsPerPage = options.recordsPerPage;
            }

            if(options.separator === undefined){
                //default property separator double underscore
                Table.separator = "__";
            }
            else{
                Table.separator = options.separator;
            }

            Table.firstIndex = 0;
        });

        Table.on("start", function(options){

            console.log("table rows number:", options.rows.length);

            var RowCollection = Backbone.Collection.extend();

            Table.rows = options.rows;
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

            Table.Channel.command("update:indexes", function(){});
            Table.Channel.command("change:page", function(args){
                var newPage = args.page;
            });
            Table.Channel.request("change:records:per:page", function(args){
                Table.recordsPerPage = args.recordsPerPage;
                Table.pageNumber = Math.ceil(Table.workingSet.length / Table.recordsPerPage);
            });
        });

        return Table;
    };

    return TableConstructor;
});
