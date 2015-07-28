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
                TypeAhead.Channel.trigger("option:close", { event: event });
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
                'focusin .searchbox input': 'inOptions',
                // 'focusout .searchbox input': 'outOptions',
                // 'click .optionbox ul li'   : 'enterOption'
                'keyup .searchbox input': 'keyboardAction'
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
            onShow: function(event){
                var self = this;

                //click out optionbox when show
                // $("*").click(function(event){
                //   event.preventDefault();
                //   event.stopPropagation();
                //   if( $(event.target).not(".typeahead input") ){
                //     TypeAhead.Channel.trigger("option:close", { event: event });
                //   };
                // });
            },
            closeOption: function(event){
                var inputSearch = this.$el.find(".searchbox input");
                this.$el.find(".optionbox").removeClass("show");
            },
            setDimensionOptionBox: function(){
                var searchbox = this.$el.find(".searchbox input");
                var searchboxHeight = this.$el.find(".searchbox").outerHeight();
                if(searchboxHeight < 1){
                    searchboxHeight = 35;
                }

                this.$el.find(".optionbox").css({ "top": searchboxHeight + searchbox.offset().top + "px" });
                this.$el.find(".optionbox").css({ "left": searchbox.offset().left + "px" });
                this.$el.find(".optionbox").css({ "width": searchbox.outerWidth() });
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

                // var index = this.collection.indexOf(model);
                this.adjustScroll();

                TypeAhead.Channel.trigger("selected:model:change", {model: model});
            },
            inOptions: function(event){
              event.preventDefault();
              event.stopPropagation();
              $(".optionbox").removeClass("show");

              this.$el.find(".optionbox").addClass("show");
              this.setDimensionOptionBox();
            },
            outOptions: function(event){
              event.preventDefault();
              event.stopPropagation();
              this.$el.find(".optionbox").removeClass("show");
              var searchinput = this.$el.find("input");
              var optionbox = this.$el.find(".optionbox");
              var optionboxItem = this.$el.find(".optionbox li");
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
            }
        });

        TypeAhead.on("start", function(options){
            console.log("TP options: ", options);
            var OptionCollection = Backbone.Collection.extend();

            TypeAhead.optionCollection = options.models;

            console.log("TypeAhead.optionCollection: ", TypeAhead.optionCollection);
            TypeAhead.optionArrayPool = new OptionCollection();
            TypeAhead.optionArrayPool.reset(TypeAhead.optionCollection.toArray());

            TypeAhead.RootView = new TypeAhead.OptionCompositeView({
                collection: TypeAhead.optionArrayPool,
                displayKeys: options.displayKeys
            });

            TypeAhead.Channel.reply("get:root", function(){
                return TypeAhead.RootView;
            });

            // TypeAhead.Channel.on("option:click", function(args){
            //     var option = args.option;
            //
            // });

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

            TypeAhead.Channel.listenTo(TypeAhead.optionCollection, "reset", function(){
                TypeAhead.optionArrayPool.reset(TypeAhead.optionCollection.toArray());
            });


        });

        return TypeAhead;
    };

    return TypeAheadConstructor;
});
