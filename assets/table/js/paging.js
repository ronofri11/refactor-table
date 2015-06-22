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
                var lastPage;
                if(this.get("pagesPerSheet") > totalPages){
                    lastPage = totalPages;
                }
                else{
                    lastPage = this.get("pagesPerSheet");
                }
                this.set({
                    "firstPage": 1,
                    "lastPage": lastPage
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
                this.listenTo(this.model, "change:currentPage", this.render);
                this.listenTo(this.model, "change:firstPage", this.render);
                this.listenTo(this.model, "change:lastPage", this.render);
                this.listenTo(this.model, "change:recordsPerPage", this.onResetPaging);
                this.listenTo(Paging.workingSet, "reset", this.onResetPaging);
                this.listenTo(Paging.windowSet, "reset", this.render);
            },
            templateHelpers: function(){
                var first = this.model.get("firstPage");
                var last = this.model.get("lastPage");
                var indexes = this.getWindowIndexes();
                var total = Paging.workingSet.length;
                return {
                    first: first,
                    last: last,
                    firstIndex: indexes.firstIndex,
                    lastIndex: indexes.lastIndex,
                    total: total
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
                var totalPages = Math.ceil(Paging.workingSet.length / this.model.get("recordsPerPage"));
                if(pageNumber >= 1 && pageNumber <= totalPages){
                    this.model.set({"currentPage": pageNumber});
                }
                this.resetWindowSet();
            },
            pageSelected: function(event){
                event.stopPropagation();
                event.preventDefault();
                var page = $(event.target);
                var pageIndex = page.data("index");
                var currentPageIndex = this.model.get("currentPage");

                if(currentPageIndex !== pageIndex){
                    this.goToPage(pageIndex);
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
                this.goToPage(1);
            },
            changeRecordsPerPage: function(recordsPerPage){
                this.model.set({recordsPerPage: recordsPerPage});
            },
            firstPage: function(){
                // console.log("go to first page");
                if(this.model.get("firstPage") !== 1){
                    this.onResetPaging();
                }
                else{
                    this.goToPage(1);
                }
            },
            prevPage: function(){
                // console.log("go to previous page");
                var currentIndex = this.model.get("currentPage");
                if(currentIndex > 1){
                    var newIndex = currentIndex - 1;
                    if(newIndex < this.model.get("firstPage")){
                        this.model.set({"currentPage": newIndex}, {silent: true});

                        var newFirst = currentIndex - this.model.get("pagesPerSheet");
                        this.model.set({"lastPage": newIndex}, {silent: true});
                        this.model.set({"firstPage": newFirst});
                    }
                    else{
                        this.model.set({"currentPage": newIndex});
                    }
                    this.goToPage(newIndex);
                }
            },
            nextPage: function(){
                // console.log("go to next page");
                var totalPages = Math.ceil(Paging.workingSet.length / this.model.get("recordsPerPage"));

                var currentIndex = this.model.get("currentPage");
                if(currentIndex < totalPages){
                    var newIndex = currentIndex + 1;

                    if(newIndex > this.model.get("lastPage")){
                        this.model.set({"currentPage": newIndex}, {silent: true});

                        var newLast = newIndex + (this.model.get("pagesPerSheet") - 1);
                        if(newLast > totalPages){
                            newLast = totalPages;
                        }
                        this.model.set({"firstPage": newIndex}, {silent: true});
                        this.model.set({"lastPage": newLast});
                    }
                    else{
                        this.model.set({"currentPage": newIndex});
                    }
                    this.goToPage(newIndex);
                }
            },
            lastPage: function(){
                // console.log("go to last page");
                var totalPages = Math.ceil(Paging.workingSet.length / this.model.get("recordsPerPage"));
                var lastIndex = totalPages;

                if(this.model.get("lastPage") === totalPages){
                    this.model.set({"currentPage": lastIndex});
                }
                else{
                    var leftover = totalPages % this.model.get("pagesPerSheet");
                    if(leftover === 0){
                        leftover = this.model.get("pagesPerSheet");
                    }
                    this.model.set({"currentPage": lastIndex}, {silent: true});
                    this.model.set({"firstPage": totalPages - leftover + 1}, {silent: true});
                    this.model.set({"lastPage": totalPages});
                }
                this.goToPage(lastIndex);
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

            Paging.Channel.on("go:to:page", function(args){
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
