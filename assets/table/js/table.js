define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "assets/table/js/paging.js",
    "text!./../templates/table.html",
    "text!./../templates/row.html",
    "text!./../templates/header.html",
    "text!./../templates/filter.html"
], function (Marionette, Radio, Shim, Paging, TableTemplate, RowTemplate, HeaderTemplate, FilterTemplate) {

    var TableConstructor = function(channelName){

        var Table = new Marionette.Application();
        Table.Channel = Radio.channel(channelName);

        var RowView = Marionette.ItemView.extend({
            tagName: "div",
            className: "row",
            template: _.template(RowTemplate),
            templateHelpers: function(){
                var index = Table.workingSet.indexOf(this.model) + 1;
                var cells = this.extractCells();
                return {
                    index: index,
                    cells: cells
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
            },

            extractCells: function(){
                var cells = [];
                Table.columns.each(function(column){
                    var type = column.get("type");
                    
                    var cell = {};
                    
                    if(type === "model"){
                        cell["key"] = column.get("key");
                        var filterKey = column.get("filterKey");
                        cell["display"] = this.model.get(cell["key"]).get(filterKey); 
                    }
                    else{
                        cell["key"] = column.get("key");
                        cell["display"] = this.model.get(cell["key"]);
                    }

                    cell["width"] = column.get("max_text_width");

                    cells.push(cell);
                }, this);

                return cells;
            }
        });

        

        var HeaderView = Marionette.ItemView.extend({
            tagName: "div",
            className: "header",
            template: _.template(HeaderTemplate),
            events: {
                "click": "broadcastEvent",
                contextmenu: "broadcastEvent"
            },
            onRender: function(){
                this.$el.width(this.model.get("width") + "px");
            },
            broadcastEvent: function(event){
                event.stopPropagation();
                event.preventDefault();
                var eventName = "header:" + event.type;
                Table.Channel.trigger(eventName, {eventName: eventName, model: this.model});
            }
        });

        var HeadersView = Marionette.CollectionView.extend({
            className: "headers",
            childView: HeaderView,
            template: _.template('')
        });

        var FilterView = Marionette.ItemView.extend({
            tagName: "div",
            className: "filter",
            template: _.template(FilterTemplate),
            events: {
                "click": "broadcastEvent",
                contextmenu: "broadcastEvent"
            },
            broadcastEvent: function(event){
                event.stopPropagation();
                event.preventDefault();
                var eventName = "filter:" + event.type;
                Table.Channel.trigger(eventName, {eventName: eventName, model: this.model});
            }
        });

        var FiltersView = Marionette.CollectionView.extend({
            className: "filters",
            childView: FilterView,
            template: _.template('')
        });

        var LayoutView = Marionette.LayoutView.extend({
            className: "tablecomponent",
            template: _.template(TableTemplate),
            regions:{
                "headers": "div.thead .theaders",
                "filters": "div.thead .tfilters",
                "tbody": "div.tbody",
                "paging": "div.paging"
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

            var Collection = Backbone.Collection.extend();

            Table.rows = options.rows;
            Table.allowedSet = new Collection();
            Table.workingSet = new Collection();
            Table.windowSet = new Collection();

            Table.allowedSet.reset(Table.rows.toArray());
            Table.workingSet.reset(Table.allowedSet.toArray());

            Table.schema = new Collection(options.schema);
            Table.columns = new Collection(Table.overrideSchema(options.columns));

            Table.TableView = new TableView({
                collection: Table.windowSet
            });

            var headersAndFilters = Table.buildHeadersAndFilters();

            Table.headers = new Collection(headersAndFilters.headers);
            Table.filters = new Collection(headersAndFilters.filters);

            Table.HeadersView = new HeadersView({
                collection: Table.headers
            });

            Table.FiltersView = new FiltersView({
                collection: Table.filters
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
                Table.RootView.getRegion("headers").show(Table.HeadersView);
                Table.RootView.getRegion("filters").show(Table.FiltersView);

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
            if(options.separator === undefined){
                //default property separator double underscore
                Table.separator = "__";
            }
            else{
                Table.separator = options.separator;
            }
        };

        Table.overrideSchema = function(columns){
            var activeColumns = [];
            _.each(columns, function(col){
                var key;
                var schemaCounterpart;

                if(col.nested){
                    schemaCounterpart = Table.schema.findWhere({
                        "key": col.property
                    });
                }
                else{
                    schemaCounterpart = Table.schema.findWhere({
                        "originalKey": col.property
                    });
                }
                 
                if(schemaCounterpart !== undefined){
                    schemaCounterpart.set({
                        "max_text_width": Table.getColumnWidth(schemaCounterpart)
                    });
                    activeColumns.push(schemaCounterpart.clone());
                }
            });

            return activeColumns;
        };

        Table.buildHeadersAndFilters = function(){
            var headers = [{
                "title": "#",
                "key": "index",
                "width": 40
            }];
            var filters = [{
                "type": null,
                "width": 40
            }];

            Table.columns.each(function(col){
                var header = {};
                var filter = {};

                header["title"] = col.get("title");
                filter["type"] = col.get("type");
 
                if(filter["type"] === "model"){
                    filter["filterKey"] = col.get("filterKey");
                    filter["filterDisplay"] = col.get("filterDisplay");
                }
                else{
                    filter["filterKey"] = col.get("key");
                    filter["filterDisplay"] = col.get("filterDisplay");
                }

                header["key"] = col.get("key");
                header["width"] = col.get("max_text_width");
                
                filter["key"] = col.get("key");
                filter["width"] = col.get("max_text_width");

                headers.push(header);
                filters.push(filter);
            });

            return {
                headers: headers,
                filters: filters
            };
        };

        Table.getColumnWidth = function(schemaCounterpart){
            var displayExtractor;
            if(schemaCounterpart.get("type") === "model"){
                var nestedModel = schemaCounterpart.get("key");
                var key = schemaCounterpart.get("filterKey");
                displayExtractor = function(row){
                    return row.get(nestedModel).get(key);
                };
            }
            else{
                var key = schemaCounterpart.get("key");
                displayExtractor = function(row){
                    return row.get(key);
                };
            }

            var max_text_width = 10;
            Table.rows.each(function(row){
                var text = displayExtractor(row);
                var width = text.length;

                if(width > max_text_width){
                    max_text_width = width;
                }
            });

            return Math.ceil(10 * max_text_width);
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
