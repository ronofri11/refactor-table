define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "assets/table/js/paging.js",
    "text!./../templates/table.html",
    "text!./../templates/row.html",
    "text!./../templates/paging.html"
], function (Marionette, Radio, Shim, Paging, TableTemplate, RowTemplate, PagingTemplate) {

    var TableConstructor = function(channelName){

        var Table = new Marionette.Application();
        Table.Channel = Radio.channel(channelName);

        Table.RowView = Marionette.ItemView.extend({
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

        Table.PagingView = Marionette.ItemView.extend({
            tagName: "div",
            className: "pages",
            template: _.template(PagingTemplate),
            templateHelpers: function(){
                var first = 1;//Table.currentPageStart;
                var last = Table.totalPages;//Table.currentPageEnd;
                console.log("first:", first, "last:", last);
                return {
                    first: first,
                    last: last
                };
            }
        });

        Table.on("before:start", function(options){
            Table.initPaging(options);
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

            Table.changeRecordsPerPage(Table.recordsPerPage);


            var Rows = new Table.TableView({
                collection: Table.windowSet
            });

            var Paging = new Table.PagingView();

            console.log("table in window rows:", Table.windowSet.length);

            Table.RootView = new Table.LayoutView();

            //when the LayoutView is shown...
            Table.RootView.on("show", function(){
                Table.RootView.getRegion("tbody").show(Rows);
                Table.RootView.getRegion("paging").show(Paging);
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

        Table.rowsBetween = function(firstIndex, lastIndex){
            //firsIndex and lastIndex go from 0 to workingSet.length - 1
            var relevantArray = [];
            for(var i = firstIndex; i < lastIndex; i++){
                relevantArray.push(Table.workingSet.at(i));
            }

            Table.windowSet.reset(relevantArray);
        };

        Table.goToPage = function(pageNumber){
            Table.setIndexes(pageNumber);
            Table.rowsBetween(Table.firstIndex, Table.lastIndex);
        };

        Table.changeRecordsPerPage = function(recordsPerPage){
            var totalPages = parseInt(Table.workingSet.length / recordsPerPage);
            var remainder = Table.workingSet.length % recordsPerPage;
            if(remainder > 0){
                totalPages = totalPages + 1;
            }

            Table.totalPages = totalPages;
            Table.goToPage(1);
        };

        Table.setIndexes = function(pageNumber){
            var firstIndex = Table.recordsPerPage * (pageNumber - 1);
            var lastIndex = firstIndex + Table.recordsPerPage;

            if(lastIndex > Table.workingSet.length){
                lastIndex = Table.workingSet.length;
            }

            Table.firstIndex = firstIndex;
            Table.lastIndex = lastIndex;
        };

        Table.initPaging = function(options){
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

            if(options.firstIndex === undefined){
                Table.firstIndex = 0;
            }
            else{
                Table.firstIndex = options.firstIndex;
            }

            if(options.lastIndex === undefined){
                Table.lastIndex = Table.firstIndex + Table.recordsPerPage;
            }
            else{
                Table.lastIndex = options.lastIndex;
            }
        };

        return Table;
    };

    return TableConstructor;
});
