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
                "click": "sortWorkingSet"
            },

            initialize: function(){
                this.model.set({"sort": null});
                this.listenTo(this.model, "change:sort", this.styling);
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
                    if(this.model.get("sorterCallback") === undefined){
                        console.log("creating callback", self.model.get("key"));
                        var callback = function(row){
                            var str;
                            if(self.model.get("type") === "model"){
                                str = "" + row.get(self.model.get("key")).get(self.model.get("nestedKey"));
                            }
                            else{
                                str = "" + row.get(self.model.get("key"));
                            }
                            str = str.toLowerCase();
                            if(self.model.get("sort") === "DESC"){
                                str = str.split("");
                                str = _.map(str, function(letter) {
                                    return String.fromCharCode(-(letter.charCodeAt(0)));
                                });
                            }
                            return str;
                        };
                        self.model.set({
                            "sorterCallback": callback
                        });
                    }
                    Table.Channel.trigger("sort:column", {
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

        var FilterView = Marionette.ItemView.extend({
            tagName: "div",
            className: "filter",
            template: _.template(FilterTemplate),
            events: {
                "input input": "filterWorkingSet",
                "focusin input": "hideMglass",
                "focusout input": "showMglass"
            },
            modelEvents: {
                "filter:working:set": "filterWorkingSet"
            },

            initialize: function(){
                if(this.model.get("query") === undefined){
                    this.model.set({"query": ""});
                }
            },

            filterWorkingSet: function(){
                var filterQuery = this.$el.find("input").val().toLowerCase();
                var self = this;

                if(this.model.get("filterCallback") === undefined){
                    var callback = function(row, query){
                        if(query === ""){
                            return true;
                        }
                        switch(self.model.get("type")){
                            case "model":
                                var key = self.model.get("key");
                                var nestedProperty = self.model.get("filterKey");
                                var rowProperty = "" + row.get(key).get(nestedProperty);
                                return rowProperty.toLowerCase().indexOf(query) > -1;
                            default:
                                var key = self.model.get("key");
                                var rowProperty = "" + row.get(key);
                                return rowProperty.toLowerCase().indexOf(query) > -1;
                        }
                    };
                    self.model.set({
                        "filterCallback": callback
                    });
                }

                this.model.set({"query": filterQuery});
                Table.filterWorkingSet(this.model);
            },
            hideMglass: function(event){
                $(event.target).removeClass("mglass");
            },
            showMglass: function(){
                var self = $(event.target);
                if(self.val().length > 0){

                }else{
                    self.addClass("mglass");
                }
            }
        });

        var FiltersView = Marionette.CollectionView.extend({
            className: "filters",
            childView: FilterView,
            template: _.template(''),
            runFilters: function(){
                this.collection.each(function(filter){
                    console.log("filter query", filter.get("query"));
                    if(filter.get("type") !== null){
                        filter.trigger("filter:working:set");
                    }
                });
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

            Table.Channel.on("sort:column", function(args){
                console.log("sorting by:", args.sorter.get("key"));
                Table.sortWorkingSet(args.sorter);
                Table.FiltersView.runFilters();
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

        Table.filterWorkingSet = function(filter){
            var newWorkingSet = Table.allowedSet.filter(function(row){
                return filter.get("filterCallback")(row, filter.get("query"));
            });

            Table.workingSet.reset(newWorkingSet);
        };

        Table.sortWorkingSet = function(sorter){
            console.log("sorting working set");
            // console.log("sorter callback", sorter.get("sorterCallback"));
            var sortedSet = Table.allowedSet.sortBy(sorter.get("sorterCallback"));
            Table.allowedSet.reset(sortedSet);
        };

        return Table;
    };

    return TableConstructor;
});
