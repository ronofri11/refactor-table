define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "assets/table/js/paging",
    "assets/table/js/filters",
    "assets/table/js/headers",
    "text!./../templates/table.html",
    "text!./../templates/row.html",
    "text!./../templates/header.html"
], function (Marionette, Radio, Shim, Paging, Filters, Headers, TableTemplate, RowTemplate) {

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
                var self = this;

                Table.columns.each(function(column){
                    var type = column.get("type");
                    var cell = {};

                    cell["key"] = column.get("key");
                    cell["display"] = this.model.getCellValue(column);
                    cell["width"] = column.get("max_text_width");

                    cells.push(cell);
                }, this);

                return cells;
            }
        });

        var LayoutView = Marionette.LayoutView.extend({
            className: "tablecomponent",
            template: _.template(TableTemplate),
            regions:{
                "headers": "div.thead .theaders",
                "filters": "div.thead .tfilters",
                "tbody": "div.tbody",
                "paging": "div.paging"
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

            console.log("table in window rows:", Table.windowSet.length);

            Table.RootView = new LayoutView();

            //when the LayoutView is shown...
            Table.RootView.on("show", function(){
                var HeadersView = Table.Headers.Channel.request("get:root");
                var FiltersView = Table.Filters.Channel.request("get:root");
                Table.RootView.getRegion("headers").show(HeadersView);
                Table.RootView.getRegion("filters").show(FiltersView);

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

            Table.Channel.on("remove:active:filters", function(){
                Table.Filters.Channel.trigger("clean:filters");
            });

            Table.Channel.listenTo(Table.Headers.Channel, "sort:column", function(args){
                Table.Filters.Channel.trigger("run:filters");
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
                    columnFromSchema.set({
                        "max_text_width": Table.getColumnWidth(columnFromSchema)
                    });
                    activeColumns.push(columnFromSchema);
                }
            });

            console.log("active columns", activeColumns);

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

        return Table;
    };

    return TableConstructor;
});
