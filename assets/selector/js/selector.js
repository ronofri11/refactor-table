define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!./../templates/selector.html",
    "text!./../templates/optiontemplate.html",
    "text!./../templates/escenarioptiontemplate.html"
], function (Marionette, Radio, Shim, SelectorTemplate, OptionTemplate, EscenarioOptionTemplate) {

    var SelectorConstructor = function(channelName){

        var Selector = new Marionette.Application();
        Selector.Channel = Radio.channel(channelName);



        Selector.OptionItemView = Marionette.ItemView.extend({
            tagName: "li",
            getTemplate: function(){
                switch(Selector.childTemplate){
                    case "EscenarioOptionTemplate":
                        return _.template(EscenarioOptionTemplate);
                        break;
                    default:
                        return _.template(OptionTemplate);
                        break;
                }
            },
            templateHelpers: function(){
                switch(Selector.childTemplate){
                    default:
                        cap = "";
                        var nameless = false;
                        _.each(this.options.displayKeys, function(key){
                            if(this.model.get(key) === "" && nameless === false){
                                text1 = Selector.Nameless.display;

                                if(this.model.get("namelessCount") === undefined){
                                    this.model.set({"namelessCount": Selector.Nameless.counter});
                                    Selector.Nameless["counter"] += 1;
                                }
                                text2 = this.model.get("namelessCount");
                                cap = "<span>" + text1 + "</span>";
                                cap += "<span>" + text2 + "</span>";
                                nameless = true;
                            }
                            if(nameless === false){
                                cap = cap + "<span>" + this.model.get(key) + "</span>";
                            }
                        }, this);
                        return {caption: cap};
                        break;
                }
            },
            events: {
                "click": "enterOption"
            },
            initialize: function(){
                this.listenTo(this.model, "change:selected", this.styling);
                this.listenTo(this.model, "model:modified", this.render);
            },
            onRender: function(){
                this.styling();
            },
            enterOption: function(event){
                Selector.Channel.trigger("option:click", {
                    option:this.model
                });
                this.triggerMethod("optionClicked", {
                    model: this.model
                });
            },
            styling: function(){
                if(this.model.get("selected")){
                    this.$el.addClass("selected");
                }
                else{
                    this.$el.removeClass("selected");
                }

                if(this.model.get("changed")){
                    this.$el.addClass("modify");
                }
                else{
                    this.$el.removeClass("modify");
                }

                if(this.model.get("deleted")){
                    this.$el.addClass("deleted");
                }
                else{
                    this.$el.removeClass("deleted");
                }

                if(this.model.get("new")){
                    this.$el.addClass("new");
                }
                else{
                    this.$el.removeClass("new");
                }
            }
        });

        Selector.OptionCompositeView = Marionette.CompositeView.extend({
            tagName: "div",
            className: "selector",
            childView: Selector.OptionItemView,
            childViewContainer: "ul",
            template: _.template(SelectorTemplate),
            events: {
                'focusin .searchbox input': 'toggleMglass',
                'focusout .searchbox input': 'outMglass',
                'keyup .searchbox input': 'filterOptions'
            },
            childEvents: {
                "optionClicked": "optionClicked"
            },
            initialize: function(options){
                this.childViewOptions = {
                    separator: options.separator,
                    displayKeys: options.displayKeys,
                    template: options.childTpl,
                    getTemplate: function(){

                    }
                };

                this.listenTo(Selector.optionCollection, "remove", this.onRemoveFromCollection);
            },
            onShow: function(){
                this.setDimensionOptionBox();
            },
            setDimensionOptionBox: function(){
                var heightContainer = this.$el.parent().outerHeight();
                var searchboxHeight = this.$el.find(".searchbox").outerHeight();
                var optionboxHeight = heightContainer - searchboxHeight;
                this.$el.find(".optionbox").css({ "top": searchboxHeight + "px" });
                this.$el.find(".optionbox ul").height(optionboxHeight + "px");
            },
            optionClicked: function(view, args){
                this.updateSelected(args.model);
            },
            updateSelected: function(model){
                Selector.optionCollection.each(function(option){
                    if(option.cid === model.cid){
                        option.set({"selected": true});
                    }
                    else{
                        option.set({"selected": false});
                    }
                });

                this.adjustScroll();

                Selector.Channel.trigger("selected:model:change", {model: model});
            },
            onRemoveFromCollection: function(){
                Selector.optionAllowedPool.reset(Selector.optionCollection.toArray());
                Selector.optionArrayPool.reset(Selector.optionAllowedPool.toArray());
                if(Selector.optionArrayPool.length > 0){
                    this.updateSelected(Selector.optionArrayPool.at(0));
                }
            },
            toggleMglass: function(){
                var searchinput = this.$el.find("input");
                var items = this.$el.find(".optionbox li");
                if( searchinput.val() != "" ){
                }else{
                    searchinput.removeClass("mglass");
                }
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
            filterOptions: function(){
                var word = this.$el.find(".searchbox input").val();
                var word = word.toLowerCase();
                var optionArray = Selector.optionAllowedPool.filter(function(option){
                    var relevant = false;
                    _.each(this.options.displayKeys, function(key){
                        if(option.get(key) === null || option.get(key) === undefined){
                            return false;
                        }
                        var condition = option.get(key).toLowerCase().indexOf(word) != -1;
                        relevant = relevant || condition;
                    }, this);
                    return relevant;
                }, this);

                Selector.optionArrayPool.reset(optionArray);
                if(Selector.optionArrayPool.length > 0){
                    this.updateSelected(Selector.optionArrayPool.at(0));
                }
            },

            removeActiveFilters: function(){
                Selector.optionAllowedPool.reset(Selector.optionCollection.toArray());
                Selector.optionArrayPool.reset(Selector.optionAllowedPool.toArray());
                if(Selector.optionArrayPool.length > 0){
                    this.updateSelected(Selector.optionArrayPool.at(0));
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
                this.cleanInput();
                this.filterOptions();
            },

            filterModified: function(){
                var modifiedArray = Selector.optionCollection.filter(function(option){
                    return option.get("changed") && !option.get("new") && !option.get("deleted");
                });

                Selector.optionAllowedPool.reset(modifiedArray);
                Selector.optionArrayPool.reset(Selector.optionAllowedPool.toArray());
                if(Selector.optionArrayPool.length > 0){
                    this.updateSelected(Selector.optionArrayPool.at(0));
                }

                this.cleanInput();
            },

            filterDeleted: function(){
                var modifiedDeleted = Selector.optionCollection.filter(function(option){
                    return !option.get("changed") && !option.get("new") && option.get("deleted");
                });

                Selector.optionAllowedPool.reset(modifiedDeleted);
                Selector.optionArrayPool.reset(Selector.optionAllowedPool.toArray());
                if(Selector.optionArrayPool.length > 0){
                    this.updateSelected(Selector.optionArrayPool.at(0));
                }

                this.cleanInput();
            },

            filterNew: function(){
                var modifiedNew = Selector.optionCollection.filter(function(option){
                    return !option.get("changed") && option.get("new") && !option.get("deleted");
                });

                Selector.optionAllowedPool.reset(modifiedNew);
                Selector.optionArrayPool.reset(Selector.optionAllowedPool.toArray());
                if(Selector.optionArrayPool.length > 0){
                    this.updateSelected(Selector.optionArrayPool.at(0));
                }
                this.cleanInput();
            },

            cleanInput: function(){
                var input = this.$el.find(".searchbox input");
                input.val("");
                input.addClass("mglass");
            }

        });

        Selector.on("start", function(options){
            var OptionCollection = Backbone.Collection.extend();

            Selector.Nameless = {};
            Selector.Nameless["display"] = options.newDisplay;
            Selector.Nameless["counter"] = 1;

            Selector.optionCollection = options.models;
            Selector.optionAllowedPool = new OptionCollection();
            Selector.optionArrayPool = new OptionCollection();

            Selector.optionAllowedPool.reset(Selector.optionCollection.toArray());
            Selector.optionArrayPool.reset(Selector.optionAllowedPool.toArray());

            console.log("childTemplate: ", options.childTemplate);

            if(options.childTemplate != undefined){
                Selector.childTemplate = options.childTemplate;
            }

            Selector.RootView = new Selector.OptionCompositeView({
                collection: Selector.optionArrayPool,
                displayKeys: options.displayKeys
            });


            Selector.Channel.trigger("notify", {
                message: Selector.optionAllowedPool.length + " Profesores cargados.",
                type: "info"
            });

            Selector.Channel.reply("get:root", function(){
                return Selector.RootView;
            });

            Selector.Channel.on("option:click", function(args){
                var option = args.option;
            });

            Selector.Channel.on("option:next", function(){
                Selector.RootView.selectNext();
            });

            Selector.Channel.on("option:prev", function(){
                Selector.RootView.selectPrev();
            });

            Selector.Channel.on("clear:filter", function(){
                Selector.RootView.clearFilter();
            });

            Selector.Channel.on("remove:active:filters", function(){
                Selector.RootView.removeActiveFilters();
            });

            Selector.Channel.on("filter:modified", function(){
                Selector.RootView.filterModified();
            });

            Selector.Channel.on("filter:deleted", function(){
                Selector.RootView.filterDeleted();
            });

            Selector.Channel.on("filter:new", function(){
                Selector.RootView.filterNew();
            });

            Selector.Channel.comply("add:model", function(args){
                Selector.optionCollection.add(args.model);
                Selector.Channel.trigger("filter:new");
            });
        });

        return Selector;
    };

    return SelectorConstructor;
});
