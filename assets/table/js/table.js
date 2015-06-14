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

        var RowView = Marionette.ItemView.extend({
            tagName: "div",
            className: "row",
            template: _.template(RowTemplate),
            templateHelpers: function(){
                var anchoCell = 400;
                var index = Table.workingSet.indexOf(this.model) + 1;
                return {
                    anchoCell: anchoCell,
                    index: index
                };
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

        var LayoutView = Marionette.LayoutView.extend({
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

        var TableView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "rows",
            childView: RowView,
            template: _.template(''),
            events: {
            },
            childEvents: {
                // "optionClicked": "optionClicked"
            },
            onShow: function(){
                this.setDimension();
            },
            setDimension: function(){
                var canvas = this.$el.parent().parent();
                var totalCell = this.$el.find(".row:first-child() div").size();
                var totalWidth = 0;

                for(var i=0; i < totalCell; i++){
                    var cellWidth = this.$el.find(".row:first-child() div:eq(" + i + ")").width();
                    totalWidth = totalWidth + cellWidth;
                }

                if( totalWidth > canvas.width() ){
                    canvas.width(totalWidth);
                }
            }
        });

        Table.on("before:start", function(options){
            Table.initValues(options);
            Table.Paging = new Paging(channelName + "_paging");
        });

        Table.on("start", function(options){

            console.log("table rows number:", options.rows.length);

            var RowCollection = Backbone.Collection.extend();

            Table.rows = options.rows;
            Table.allowedSet = new RowCollection();
            Table.workingSet = new RowCollection();
            Table.windowSet = new RowCollection();

            Table.allowedSet.reset(Table.rows.toArray());
            Table.workingSet.reset(Table.allowedSet.toArray());

            Table.TableView = new TableView({
                collection: Table.windowSet
            });

            var pager = Table.getPagingOptions(options);
            Table.Paging.start({
                pager: pager,
                workingSet: Table.workingSet,
                windowSet: Table.windowSet
            });

            console.log("table in window rows:", Table.windowSet.length);

            Table.RootView = new LayoutView();

            //when the LayoutView is shown...
            Table.RootView.on("show", function(){
                Table.RootView.getRegion("tbody").show(Table.TableView);
                Table.RootView.getRegion("paging").show(Table.Paging.Channel.request("get:root"));
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

        Table.initValues = function(options){
            console.log("table config:", options);
            if(options.separator === undefined){
                //default property separator double underscore
                Table.separator = "__";
            }
            else{
                Table.separator = options.separator;
            }
        };

        Table.getPagingOptions = function(options){
            var pager = {};
            if(options.recordsPerPage === undefined){
                //default number when it is not provided
                pager["recordsPerPage"] = 100;
            }
            else{
                pager["recordsPerPage"] = options.recordsPerPage;
            }
            if(options.pagesPerSheet === undefined){
                //default number when it is not provided
                pager["pagesPerSheet"] = 10;
            }
            else{
                pager["pagesPerSheet"] = options.pagesPerSheet;
            }

            return pager;
        };

        return Table;
    };

    return TableConstructor;
});
