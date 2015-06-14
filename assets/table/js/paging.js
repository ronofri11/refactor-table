define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!./../templates/paging.html"
], function(Marionette, Radio, Shim, PagingTemplate){

    var PagingConstructor = function(channelName){
        
        var Paging = new Marionette.Application();

        Paging.Channel = Radio.channel(channelName);

        var Pager = Backbone.Model.extend({
            defaults: {
                recordsPerPage: 100,
                currentPage: 1
            },

            initialize: function(options){
                //pager, passed as an object inside options, when starting
                //the Paging app, should have the same names in its fields
                //as the ones expected by PagingView
                var pager = options.pager;
                this.set(pager);

                this.calculateLimits();
            },

            calculateLimits: function(){
                var recordsPerPage = this.get("recordsPerPage");
                var totalPages = Math.ceil(Paging.workingSet.length / recordsPerPage);
                this.set({
                    "firstPage": 1,
                    "lastPage": totalPages
                });
            }
        });

        var PagingView = Marionette.ItemView.extend({
            tagName: "div",
            className: "pages",
            template: _.template(PagingTemplate),
            events: {
                "click .page": "pageSelected",
                "click .firstpage": "firstPage",
                "click .prevpage": "prevPage",
                "click .nextpage": "nextPage",
                "click .lastpage": "lastPage"
            },
            initialize: function(){
                this.listenTo(this.model, "change:currentPage", this.styling);
                this.listenTo(this.model, "change:firstPage", this.render);
                this.listenTo(this.model, "change:lastPage", this.render);

                this.listenTo(this.model, "change:recordsPerPage", this.onResetPaging);
                this.listenTo(Paging.workingSet, "reset", this.onResetPaging);
            },
            templateHelpers: function(){
                var first = this.model.get("firstPage");
                var last = this.model.get("lastPage");
                return {
                    first: first,
                    last: last
                };
            },
            onRender: function(){
                this.styling();
            },
            styling: function(){
                var previousPage = this.$el.find(".page.selected");
                previousPage.removeClass("selected");

                var currentPage = this.$el.find('[data-index=' + this.model.get("currentPage") + ']');
                currentPage.addClass("selected");
            },
            goToPage: function(pageNumber){
                this.$el.find('[data-index=' + pageNumber + ']').trigger("click");
            },
            pageSelected: function(event){
                event.stopPropagation();
                event.preventDefault();
                var page = $(event.target);
                var pageIndex = page.data("index");
                var currentPageIndex = this.model.get("currentPage");

                if(currentPageIndex !== pageIndex){
                    console.log("page clicked", page);
                    this.model.set({"currentPage": pageIndex});
                    // Paging.Channel.trigger("page:click", {
                    //     page: pageIndex
                    // });
                    this.resetWindowSet();
                }
            },
            resetWindowSet: function(){
                var indexes = this.getWindowIndexes();
                var workingSet = Paging.workingSet;

                var relevantArray = [];
                for(var i = indexes.firstIndex; i < indexes.lastIndex; i++){
                    relevantArray.push(workingSet.at(i));
                }

                Paging.windowSet.reset(relevantArray);
            },
            getWindowIndexes: function(){
                var recordsPerPage = this.model.get("recordsPerPage");
                var currentPageIndex = this.model.get("currentPage");

                var firstIndex = recordsPerPage * (currentPageIndex - 1);
                var lastIndex = firstIndex + recordsPerPage;

                if(lastIndex > Paging.workingSet.length){
                    lastIndex = Paging.workingSet.length;
                }

                return {
                    firstIndex: firstIndex, 
                    lastIndex: lastIndex
                };
            },
            onResetPaging: function(){
                this.model.calculateLimits();
                this.model.set({"currentPage":1});
                this.resetWindowSet();
            },
            changeRecordsPerPage: function(recordsPerPage){
                this.model.set({recordsPerPage: recordsPerPage});
            },
            firstPage: function(){
                console.log("go to first page");
                this.onResetPaging();
            },
            prevPage: function(){
                console.log("go to previous page");
            },
            nextPage: function(){
                console.log("go to next page");
            },
            lastPage: function(){
                console.log("go to last page");
            }
        });

        Paging.on("start", function(options){
            Paging.workingSet = options.workingSet;
            Paging.windowSet = options.windowSet;

            Paging.Pager = new Pager({
                pager: options.pager
            });

            Paging.RootView = new PagingView({
                model: Paging.Pager
            });

            Paging.RootView.resetWindowSet();

            Paging.Channel.reply("get:root", function(){
                return Paging.RootView;
            });

            Paging.Channel.on("page:click", function(args){
                var pageNumber = args.page;
                Paging.RootView.goToPage(pageNumber);
            });

            Paging.Channel.on("change:records:per:page", function(args){
                Paging.RootView.changeRecordsPerPage(args.recordsPerPage);
            });
        });

        return Paging;
    };

    return PagingConstructor;
});
