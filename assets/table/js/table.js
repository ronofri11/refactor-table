define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "assets/table/js/paging",
    "assets/table/js/filters",
    "assets/table/js/headers",
    "assets/screed/js/screed",
    "text!./../templates/table.html",
    "text!./../templates/row.html",
    "text!./../templates/header.html"
], function (Marionette, Radio, Shim, Paging, Filters, Headers, Screed, TableTemplate, RowTemplate) {

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
                "click .cell": "cellClick",
                contextmenu: "cellRightClick"
            },
            modelEvents: {
                "unselect": "unselect",
                "select": "select"
            },
            initialize: function(){
                this.model.set({"selected": false});
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
            cellClick: function(event){
                event.stopPropagation();
                event.preventDefault();
                Table.Channel.trigger("row:click", {cell: $(event.target), row: this.model});
            },
            cellRightClick: function(event){
                // event.stopPropagation();
                event.preventDefault();
                if($(event.target).hasClass("cell")){
                    Table.Channel.trigger("row:contextmenu", {cell: $(event.target), row: this.model, event:event});
                }
            },
            extractCells: function(){
                var cells = [];
                var self = this;

                Table.columns.each(function(column){
                    var type = column.get("type");
                    var cell = {};

                    cell["key"] = column.get("alias");
                    cell["display"] = this.model.getCellValue(column);
                    cell["width"] = column.get("max_text_width");

                    cells.push(cell);
                }, this);

                return cells;
            },
            unselect: function(args){
                var column = args.column;
                var cell = this.$el.find('[data-key="' + column.get("alias") + '"]');
                cell.removeClass("selectedCell");
                this.model.set({"selected": false});
                this.styling();
            },
            select: function(args){
                var column = args.column;
                var cell = this.$el.find('[data-key="' + column.get("alias") + '"]');
                cell.addClass("selectedCell");
                this.model.set({"selected": true});
                this.styling();
            }
        });

        var LayoutView = Marionette.LayoutView.extend({
            className: "tablecomponent",
            template: _.template(TableTemplate),
            regions:{
                "headers": "div.thead .theaders",
                "filters": "div.thead .tfilters",
                "tbody": "div.tbody",
                "paging": "div.paging",
                "screed": "div.tscreed"
            },
            onShow: function(){
                this.headersAutoTop();
            },
            headersAutoTop: function(){
                var self = this;
                this.$el.find(".canvastable").on("scroll", function(){
                    var marginTop = $(this).scrollTop();
                    self.$el.find(".thead").css("top", marginTop + "px");
                });

            }
        });

        var TableView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "rows",
            childView: RowView,
            template: _.template(''),
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

                Table.columns.each(function(col){
                    totalWidth += col.get("max_text_width");
                });

                totalWidth += 40; // index width

                if( totalWidth > canvas.width() ){
                    canvas.width(totalWidth);
                }
            }
        });

        Table.on("before:start", function(options){
            Table.initValues(options);
            Table.Paging = new Paging(channelName + "_paging");
            Table.Filters = new Filters(channelName + "_filters");
            Table.Headers = new Headers(channelName + "_headers");

            //
        });

        Table.on("start", function(options){

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

            Table.Headers.start({
                headers: Table.headers,
                allowedSet: Table.allowedSet,
                workingSet: Table.workingSet
            });

            Table.Filters.start({
                filters: Table.filters,
                allowedSet: Table.allowedSet,
                workingSet: Table.workingSet
            });

            var pager = Table.getPagingOptions(options);
            Table.Paging.start({
                pager: pager,
                workingSet: Table.workingSet,
                windowSet: Table.windowSet
            });

            // screed
            Table.Screed = new Screed(channelName + "_screed");
            var screedChannel = Table.Screed.Channel;

            Table.Screed.start({
                columns: Table.columns
            });



            Table.workingColumn = null;
            Table.mode = "single";

            console.log("table in window rows:", Table.windowSet.length);

            Table.RootView = new LayoutView();

            //when the LayoutView is shown...
            Table.RootView.on("show", function(){
                var HeadersView = Table.Headers.Channel.request("get:root");
                var FiltersView = Table.Filters.Channel.request("get:root");
                var ScreedView = screedChannel.request("get:root");
                Table.RootView.getRegion("headers").show(HeadersView);
                Table.RootView.getRegion("filters").show(FiltersView);

                Table.RootView.getRegion("tbody").show(Table.TableView);
                Table.RootView.getRegion("paging").show(Table.Paging.Channel.request("get:root"));

                Table.RootView.getRegion("screed").show(ScreedView);
            });

            Table.Channel.reply("get:root", function(){
                return Table.RootView;
            });

            Table.Channel.on("change:mode", function(args){
                Table.mode = args.mode;
            });

            Table.Channel.on("row:click", function(args){
                switch(Table.mode){
                    case "append":
                        Table.addToSelection(args);
                        break;
                    case "between":
                        Table.inBetweenSelection(args);
                        break;
                    default: //single mode
                        Table.singleSelection(args);
                }
            });

            //CONTEXTMENU
            Table.Channel.on("row:contextmenu", function(args){
                var row = args.row;
                var cellKey = args.cell.data("key");
                var selection = Table.Channel.request("get:selection");


                if(selection.rows.indexOf(row) == -1 || selection.column.get("alias") != cellKey){
                    Table.singleSelection(args);
                }

                var posY = args.event.pageY;
                var posX = args.event.pageX;

                Table.Channel.trigger("row:right:click", {
                    pos: {
                        left: posX,
                        top: posY
                    }
                });

            });

            // screed
            Table.Channel.on("show:screed", function(){
                var selection = Table.getSelectedRows();
                screedChannel.trigger("show:screed", {
                    cuatico: "gyuguyguy uyg uy"
                });
            });

            Table.Channel.on("print:selection:count", function(){
                var selection = Table.getSelectedRows();
                console.log("selection count:", selection.length);
            });

            Table.Channel.on("remove:active:filters", function(){
                Table.Filters.Channel.trigger("clean:filters");
            });

            Table.Channel.listenTo(Table.Headers.Channel, "sort:column", function(args){
                Table.Filters.Channel.trigger("run:filters");
            });

            Table.Channel.listenTo(Table.windowSet, "reset", function(){
                Table.emptySelection();
            });

            Table.Channel.reply("get:selection", function(){
                return {
                    column: Table.workingColumn,
                    rows: Table.getSelectedRows()
                };
            });

            Table.Channel.reply("get:context:selector", function(){
                return Table.RootView.$el;
            });

            Table.Channel.on("empty:selection", function(){
                Table.emptySelection();
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
                    var columnFromSchema = schemaCounterpart.clone();
                    if(col.displayKeys !== undefined && col.nested){
                        columnFromSchema.set({
                            "filterDisplay": col.displayKeys
                        });
                    }
                    if(col.title !== undefined){
                        columnFromSchema.set({
                            "title": col.title
                        });
                    }
                    if(col.alias !== undefined){
                        columnFromSchema.set({
                            "alias": col.alias
                        });
                    }
                    else{
                        columnFromSchema.set({
                            "alias": col.property
                        });
                    }
                    columnFromSchema.set({
                        "max_text_width": Table.getColumnWidth(columnFromSchema)
                    });
                    activeColumns.push(columnFromSchema);
                }
            });

            return activeColumns;
        };

        Table.buildHeadersAndFilters = function(){
            var headers = [{
                "title": "#",
                "key": null,
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

                header["type"] = col.get("type");
                filter["type"] = col.get("type");

                if(filter["type"] === "model"){
                    header["nestedKey"] = col.get("filterKey");
                    header["filterDisplay"] = col.get("filterDisplay");

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
            var max_text_width = 10;
            Table.rows.each(function(row){
                if(row.getCellValue === undefined){
                    _.extend(row, {
                        getCellValue: function(column){
                            var display;
                            if(column.get("type") === "model"){
                                var nestedModel = column.get("key");
                                var displayKeys = column.get("filterDisplay");
                                var dkCount = 1;
                                display = "";
                                _.each(displayKeys, function(dk){
                                    if(dkCount === displayKeys.length){
                                        display += this.get(nestedModel).get(dk);
                                    }
                                    else{
                                        display += (this.get(nestedModel).get(dk) + " - ");
                                    }
                                    dkCount += 1;
                                }, this);
                            }
                            else{
                                display = "" + this.get(column.get("key"));
                            }
                            return display;
                        }
                    });
                }
                var text = row.getCellValue(schemaCounterpart);
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

        Table.singleSelection = function(args){
            var row = args.row;
            var cellKey = args.cell.data("key");

            Table.emptySelection();

            var currentWorkingColumn = Table.columns.findWhere({"alias": cellKey});
            if(currentWorkingColumn === undefined){
                Table.workingColumn = null;
            }
            else{
                Table.workingColumn = currentWorkingColumn;
            }
            row.trigger("select", {column: Table.workingColumn});
        };

        Table.addToSelection = function(args){
            var row = args.row;
            var cellKey = args.cell.data("key");

            if(row.get("selected")){
                row.trigger("unselect", {column: Table.workingColumn});
            }
            else if(Table.workingColumn === null){
                Table.singleSelection(args);
            }
            else if(Table.workingColumn.get("alias") !== cellKey){
                Table.singleSelection(args);
            }
            else{
                row.trigger("select", {column: Table.workingColumn});
            }
        };

        Table.inBetweenSelection = function(args){
            var row = args.row;
            var cellKey = args.cell.data("key");

            var selectedRows = Table.getSelectedRows();

            if(selectedRows.length === 0 || Table.workingColumn.get("alias") !== cellKey){
                Table.singleSelection(args);
            }
            else{
                var start = Table.workingSet.indexOf(selectedRows[0]);
                var end = Table.workingSet.indexOf(selectedRows[selectedRows.length - 1]);
                var current = Table.workingSet.indexOf(row);

                start = Math.min(start, current);
                end = Math.max(end, current);

                for(var i = start; i <= end; i++){
                    var currentRow = Table.workingSet.at(i);
                    if(!currentRow.get("selected")){
                        currentRow.trigger("select", {column: Table.workingColumn});
                    }
                }
            }
        };

        Table.getSelectedRows = function(){
            return Table.workingSet.where({"selected": true});
        };

        Table.emptySelection = function(){
            var selectedRows = Table.getSelectedRows();
            _.each(selectedRows, function(row){
                row.trigger("unselect", {column: Table.workingColumn});
            });
            Table.workingColumn = null;
        };

        return Table;
    };

    return TableConstructor;
});
