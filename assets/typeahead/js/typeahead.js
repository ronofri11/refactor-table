define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!./../templates/typeahead.html",
    "text!./../templates/optiontemplate.html"
], function (Marionette, Radio, Shim, TypeAheadTemplate, OptionTemplate) {

    var TypeAheadConstructor = function(channelName){

        var TypeAhead = new Marionette.Application();
        TypeAhead.Channel = Radio.channel(channelName);

        TypeAhead.OptionItemView = Marionette.ItemView.extend({
            tagName: "li",
            template: _.template(OptionTemplate),
            templateHelpers: function(){
                cap = "";
                _.each(this.options.displayKeys, function(key){
                    cap = cap + "<span>" + this.model.get(key) + "</span>";
                }, this);

                return {caption: cap};
            },
            events: {
                "click": "enterOption"
            },
            initialize: function(){
                this.listenTo(this.model, "change:selected", this.updateSelected);
            },
            onRender: function(){
                this.updateSelected();
            },
            enterOption: function(event){
                TypeAhead.Channel.trigger("option:click", {
                    option:this.model
                });
                this.triggerMethod("optionClicked", {
                    model: this.model
                });
            },
            updateSelected: function(){
                if(this.model.get("selected")){
                    this.$el.addClass("selected");
                }
                else{
                    this.$el.removeClass("selected");
                }
            }
        });

        TypeAhead.OptionCompositeView = Marionette.CompositeView.extend({
            tagName: "div",
            className: "typeahead",
            childView: TypeAhead.OptionItemView,
            childViewContainer: "ul",
            template: _.template(TypeAheadTemplate),
            events: {
                'focusin .searchbox input': 'toggleMglass',
                'focusout .searchbox input': 'outMglass',
                'focusin .searchbox input': 'toogleOptions',
                'focusout .searchbox input': 'outOptions',
                // 'click .optionbox ul li'   : 'enterOption'
                'keyup .searchbox input': 'filterOptions'
            },
            childEvents: {
                "optionClicked": "optionClicked"
            },
            initialize: function(options){
                this.childViewOptions = {
                    separator: options.separator,
                    displayKeys: options.displayKeys
                };
            },
            onShow: function(){
                this.setDimensionOptionBox();

                // var self = this;

                // click out optionbox when show
                $("*").click(function(event){
                    TypeAhead.Channel.trigger("option:close", { event: event });
                });
            },
            closeOption: function(event){
                var inputSearch = this.$el.find(".searchbox input");

                if ($(event.target).hasClass('search')){
                    // clickea en input: no hace nada
                    this.$el.find(".optionbox").show();
                }else{
                    if (event.currentTarget === event.originalEvent.target){
                        this.$el.find(".optionbox").hide();

                        if(inputSearch.val() == ''){
                            inputSearch.addClass("mglass");
                            this.$el.find(".searchbox input").blur();
                        }
                    }
                }
            },
            setDimensionOptionBox: function(){
                var parentHeight = this.$el.parent().parent().height();
                var heightContainer = this.$el.parent().outerHeight();
                var searchboxHeight = this.$el.find(".searchbox").outerHeight();
                if(searchboxHeight < 1){
                    searchboxHeight = 35;
                }
                var optionboxHeight = heightContainer - searchboxHeight;

                this.$el.find(".optionbox").height(parentHeight + "px");
                this.$el.find(".optionbox").css({ "top": searchboxHeight + "px" });
                // this.$el.find(".optionbox ul").height(optionboxHeight + "px");
            },
            modelCaption: function(model){
                var cap = "";
                _.each(this.options.displayKeys, function(key, i){
                    if(i === this.options.displayKeys.length - 1){
                        cap = cap + model.get(key);
                    }
                    else{
                        cap = cap + model.get(key) + ": ";
                    }
                }, this);
                return cap;
            },
            optionClicked: function(view, args){
                this.updateSelected(args.model);
            },
            updateSelected: function(model){
                TypeAhead.optionCollection.each(function(option){
                    if(option.cid === model.cid){
                        option.set({"selected": true});
                    }
                    else{
                        option.set({"selected": false});
                    }
                });

                var searchinput = this.$el.find(".searchbox input");
                var selectedItem = this.modelCaption(model);
                searchinput.val(selectedItem);
                this.outMglass();

                // var index = this.collection.indexOf(model);
                this.adjustScroll();

                TypeAhead.Channel.trigger("selected:model:change", {model: model});
            },
            toggleMglass: function(){
                var searchinput = this.$el.find("input");
                var items = this.$el.find(".optionbox li");
                if( searchinput.val() != "" ){
                }else{
                    searchinput.removeClass("mglass");
                }
                // items.removeClass("selected");
                searchinput.select();

            },
            outMglass: function(event){
                var searchinput = this.$el.find("input");
                var optionbox = this.$el.find(".optionbox");;
                if (searchinput.val() == '') {
                    searchinput.addClass("mglass");
                }else{
                    searchinput.removeClass("mglass");
                }
            },
            toogleOptions: function(){
                this.$el.find(".optionbox").toggleClass("show");
            },
            outOptions: function(){
                var searchinput = this.$el.find("input");
                var optionbox = this.$el.find(".optionbox");;
                if (searchinput.val() == '') {
                    optionbox.addClass("show");
                }else{
                    optionbox.removeClass("show");
                }
            },
            filterOptions: function(){
                var word = this.$el.find(".searchbox input").val();
                var word = word.toLowerCase();
                var optionArray = TypeAhead.optionCollection.filter(function(option){
                    var relevant = false;
                    _.each(this.options.displayKeys, function(key){
                        var condition = option.get(key).toLowerCase().indexOf(word) != -1;
                        relevant = relevant || condition;
                    }, this);
                    return relevant;
                }, this);

                TypeAhead.optionArrayPool.reset(optionArray);
            },
            selectNext: function(){
                var currentOption = this.collection.findWhere({
                    "selected": true
                });

                var index = this.collection.indexOf(currentOption);
                if(index < this.collection.length - 1){
                    var nextOption = this.collection.at(index + 1);
                    this.updateSelected(nextOption);
                }
            },
            selectPrev: function(){
                var currentOption = this.collection.findWhere({
                    "selected": true
                });

                var index = this.collection.indexOf(currentOption);
                if(index > 0){
                    var prevOption = this.collection.at(index - 1);
                    this.updateSelected(prevOption);
                }
            },
            adjustScroll: function(){
                var optionbox = this.$el.find(".optionbox");
                var ulItem = optionbox.find("ul");
                var item = optionbox.find("li.selected");
                var top = item.offset().top;
                var stepDown = ulItem.scrollTop() + item.outerHeight() * 2;
                var stepUp = ulItem.scrollTop() - item.outerHeight() * 2;
                if( top > optionbox.offset().top + optionbox.outerHeight() - item.outerHeight() * 2 ){
                    ulItem.animate({scrollTop:stepDown}, '500', 'swing', function(){});
                }else if( top < optionbox.offset().top + item.outerHeight() * 2){
                    ulItem.animate({scrollTop:stepUp}, '500', 'swing', function(){});
                }
            },

            clearFilter: function(){
                var input = this.$el.find(".searchbox input");
                input.val("");
                this.filterOptions();
                input.addClass("mglass");
            }
        });

        TypeAhead.on("start", function(options){

            var OptionCollection = Backbone.Collection.extend();

            TypeAhead.optionCollection = options.models;
            TypeAhead.optionArrayPool = new OptionCollection();
            TypeAhead.optionArrayPool.reset(TypeAhead.optionCollection.toArray());

            TypeAhead.RootView = new TypeAhead.OptionCompositeView({
                collection: TypeAhead.optionArrayPool,
                displayKeys: options.displayKeys
            });

            TypeAhead.Channel.reply("get:root", function(){
                return TypeAhead.RootView;
            });

            TypeAhead.Channel.on("option:click", function(args){
                var option = args.option;
            });

            TypeAhead.Channel.on("option:next", function(){
                TypeAhead.RootView.selectNext();
            });

            TypeAhead.Channel.on("option:prev", function(){
                TypeAhead.RootView.selectPrev();
            });

            TypeAhead.Channel.on("clear:filter", function(){
                TypeAhead.RootView.clearFilter();
            });

            TypeAhead.Channel.on("option:close", function(args){
                TypeAhead.RootView.closeOption.call(TypeAhead.RootView, args.event);
            });
        });

        return TypeAhead;
    };

    return TypeAheadConstructor;
});
