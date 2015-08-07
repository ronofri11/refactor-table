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
            attributes: function() {
                return {
                    'data-value': this.model.get('value')
                };
            },
            modelEvents:{
                "change:selected": "styling"
            },
            events: {
                "click": "selectOption"
            },
            onRender: function(){
                this.styling();
            },
            selectOption: function(event){
                this.model.set({"selected": true});
                this.model.trigger("option:selected", {model: this.model});
            },
            styling: function(){
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
                'click .searchbox input': 'inOptions',
                'keyup .searchbox input': 'keyboardAction',
                'click .cancelSelected': 'clearFilter'
            },
            initialize: function(options){
                this.childViewOptions = {
                    separator: options.separator,
                    displayKeys: options.displayKeys
                };
                this.listenTo(this.collection, "option:selected", this.updateSelected);
            },
            onRender: function(){
                var selectedOption = TypeAhead.optionArrayPool.findWhere({
                    "selected": true
                });

                var searchInput = this.$el.find(".searchbox input");
                var cancelSelected = this.$el.find(".searchbox .cancelSelected");
                var inputValue;
                if(selectedOption !== undefined){
                    inputValue = selectedOption.get("value");
                    cancelSelected.addClass("show");
                }
                else{
                    inputValue = "";
                    cancelSelected.removeClass("show");
                }

                searchInput.val(inputValue);
            },
            closeOption: function(event){
                this.$el.find(".optionbox").removeClass("show");
            },
            setDimensionOptionBox: function(){
                var searchInput = this.$el.find(".searchbox input");
                var searchboxHeight = this.$el.find(".searchbox").outerHeight();
                if(searchboxHeight < 1){
                    searchboxHeight = 35;
                }

                this.$el.find(".optionbox").css({ "top": searchboxHeight + searchInput.offset().top + "px" });
                this.$el.find(".optionbox").css({ "left": searchInput.offset().left + "px" });
                this.$el.find(".optionbox").css({ "width": searchInput.outerWidth() });
            },
            
            keyboardAction: function(event){
                var optionbox = this.$el.find(".optionbox");
                var searchbox = this.$el.find(".searchbox");
                var searchboxInput = this.$el.find(".searchbox input");
                var allLi = this.$el.find(".optionbox ul li");
                var firstLi = this.$el.find(".optionbox ul li:nth-child(1)");
                var lastLi = this.$el.find(".optionbox ul li:last-child");
                var nextLi = this.$el.find(".optionbox ul .selected").next();
                var prevLi = this.$el.find(".optionbox ul .selected").prev();
                var ActualLi = this.$el.find(".optionbox ul .selected");

                switch(event.which) {
                    case 40: // down
                      if(allLi.hasClass("selected")){
                        allLi.removeClass("selected");
                        nextLi.addClass("selected");
                      }else{
                        firstLi.addClass("selected");
                      }
                      break;

                    case 38: // up
                      if(allLi.hasClass("selected")){
                        allLi.removeClass("selected");
                        prevLi.addClass("selected");
                      }else{
                        lastLi.addClass("selected");
                      }
                      break;

                    case 13: // enter
                      var textSelected = ActualLi.text();
                      searchboxInput.val(textSelected);
                      this.closeOption();
                      break;

                    default: return this.filterOptions() ; // exit this handler for other keys
                }
                event.preventDefault(); // prevent the default action (scroll / move caret)
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
            updateSelected: function(args){
                var model = args.model;
                // console.log("update selected model:", model);
                if(model !== null){
                    TypeAhead.optionCollection.each(function(option){
                        if(option.get("value") !== model.get("value")){
                            option.set({"selected": false});
                        }
                    });
                }
                else{
                    TypeAhead.optionCollection.each(function(option){
                        option.set({"selected": false});
                    });
                }

                this.render();
                TypeAhead.selectedOption = model;
                TypeAhead.Channel.trigger("option:selected", {model: model});

                // TypeAhead.optionArrayPool.reset(TypeAhead.optionCollection.toArray());


                // this.adjustScroll();

                // TypeAhead.Channel.trigger("selected:model:change", {model: model});
            },
            inOptions: function(event){
                event.preventDefault();
                event.stopPropagation();

                var optionBox = this.$el.find(".optionbox");
                if(optionBox.hasClass("show")){
                    optionBox.removeClass("show");
                }
                else{
                    optionBox.addClass("show");
                    this.setDimensionOptionBox();
                }
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

                var index;

                if(currentOption !== undefined){
                    index = this.collection.indexOf(currentOption);
                }
                else{
                    index = this.collection.length - 1;
                }

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
                var searchInput = this.$el.find(".searchbox input");
                searchInput.val("");
                TypeAhead.optionArrayPool.each(function(option){
                    option.set({"selected": false});
                });

                TypeAhead.selectedOption = null;

                TypeAhead.Channel.trigger("option:selected", {model: null});
                this.render();
            },

            getSelectedOption: function(){
                var selectedOption = TypeAhead.optionArrayPool.findWhere({
                    "selected": true
                });

                if(selectedOption === undefined){
                    return null;
                }
                else{
                    return selectedOption;
                }
            }
        });

        TypeAhead.on("start", function(options){
            // console.log("TP options: ", options);
            var OptionCollection = Backbone.Collection.extend();

            TypeAhead.optionCollection = options.models;

            // console.log("TypeAhead.optionCollection: ", TypeAhead.optionCollection);
            TypeAhead.optionArrayPool = new OptionCollection();
            TypeAhead.optionArrayPool.reset(TypeAhead.optionCollection.toArray());

            TypeAhead.options = options;

            TypeAhead.RootView = new TypeAhead.OptionCompositeView({
                collection: TypeAhead.optionArrayPool,
                displayKeys: options.displayKeys
            });

            TypeAhead.selectedOption = TypeAhead.Channel.request("get:selected:option");

            TypeAhead.Channel.comply("set:selected:option", function(args){
                var selectedValue = args.value;
                var selectedOption;

                selectedOption = TypeAhead.optionArrayPool.findWhere({
                    "value": selectedValue
                });

                if(selectedOption !== undefined){
                    selectedOption.set({"selected": true});
                }
                else{
                    selectedOption = null;
                }
                TypeAhead.RootView.updateSelected({model: selectedOption});
            });

            TypeAhead.Channel.reply("get:root", function(){
                return TypeAhead.RootView;
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

            TypeAhead.Channel.reply("get:selected:option", function(){
                return TypeAhead.RootView.getSelectedOption();
            });

            TypeAhead.Channel.comply("reset:options", function(args){
                TypeAhead.optionArrayPool.reset(args.options.toArray());
            });

            TypeAhead.Channel.on("option:close", function(args){
                TypeAhead.RootView.closeOption.call(TypeAhead.RootView, args.event);
            });

            TypeAhead.Channel.listenTo(TypeAhead.optionCollection, "reset", function(){
                var value;
                if(TypeAhead.selectedOption === null || TypeAhead.selectedOption === undefined){
                    value = null;
                }
                else{
                    value = TypeAhead.selectedOption.get("value");
                }
                TypeAhead.optionCollection.each(function(option){
                    if(option.get("value") === value){
                        option.set({"selected": true});
                    }
                    else{
                        option.set({"selected": false});
                    }
                });
                TypeAhead.optionArrayPool.reset(TypeAhead.optionCollection.toArray());
            });

        });

        TypeAhead.modelCaption = function(model){
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
        };

        return TypeAhead;
    };

    return TypeAheadConstructor;
});
