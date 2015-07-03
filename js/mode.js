define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "component/component",
    "text!templates/regions/fullpage.html",
    "text!templates/regions/columnHeaderMain.html",
    "text!templates/regions/columnHeaderMainflip.html"
], function (Marionette, Radio, Shim, Component, fullpageTemplate, columnHeaderMainTemplate, columnHeaderMainflipTemplate) {

    var ModeConstructor = function(dataMode){
        var Mode = new Marionette.Application();

        var ContentLayoutView = Marionette.LayoutView.extend({
            getTemplate: function(){
                switch(dataMode.layout){
                    case "fullpage":
                        return _.template(fullpageTemplate);
                    case "columnHeaderMainflip":
                        return _.template(columnHeaderMainflipTemplate);
                    case "columnHeaderMain":
                        return _.template(columnHeaderMainTemplate);
                }
            },
            onShow: function(){
                this.slide();
            },
            slide: function(){
                // region slide def
                var slide = this.$el.find(".slide");
                var region = slide.children(".region");
                var leftArrow = slide.find(".leftArrow");
                var rightArrow = slide.find(".rightArrow");

                // init first region
                region.addClass("hide");
                region.first().removeClass("hide").addClass("selected");

                // init arrow state
                leftArrow.addClass("hide");
                rightArrow.removeClass("hide");

                // interaction
                leftArrow.on("click", function(){
                    // selected region
                    var selectedRegion = slide.children(".selected");
                    var indexRegion = selectedRegion.index();
                    // refresh selected
                    selectedRegion.prev().addClass("next");
                    region.addClass("hide").removeClass("selected");
                    slide.find(".next").addClass("selected").removeClass("hide").removeClass("next");

                    // arrow state
                    rightArrow.removeClass("hide");
                    if(indexRegion == 2){
                        leftArrow.addClass("hide");
                    }
                });

                rightArrow.on("click", function(){
                    // selected region
                    var selectedRegion = slide.children(".selected");
                    var indexRegion = selectedRegion.index();
                    // refresh selected
                    selectedRegion.next().addClass("next");
                    region.addClass("hide").removeClass("selected");
                    slide.find(".next").addClass("selected").removeClass("hide").removeClass("next");

                    // arrow state
                    leftArrow.removeClass("hide");
                    if(indexRegion == region.length - 1){
                        rightArrow.addClass("hide");
                    }
                });
            }
        });


        Mode.on("start", function(options){

            Mode.RootView = new ContentLayoutView();
            Mode.RootView.addRegion("main", ".region.main");
            Mode.RootView.addRegion("mainFlip", ".region.mainFlip");
            Mode.RootView.addRegion("header", ".region.header");
            Mode.RootView.addRegion("columnLeft", ".region.columnLeft");

            var channelName = dataMode.channelName;
            Mode.Channel = Radio.channel(channelName);

            // component
            Mode.components = {};

            for(var key in dataMode.components){
                console.log(key, dataMode.components[key]);
                Mode.components[key] = new Component(dataMode.components[key]);
            }
            
            var tableChannel = Mode.components["table"].Channel;

            Mode.Channel.listenTo(tableChannel, "notify", function(args){
                Mode.Channel.trigger("notify", args);
            });

            for(var key in Mode.components){
                Mode.components[key].start();
            }

            //Mode has an empty collection to keep the selected model

            var EmptyCollection = Backbone.Collection.extend({});
            Mode.Selection = new EmptyCollection();

            this.setHandlers();
        });

        Mode.setHandlers = function(){
            var tableChannel = Mode.components["table"].Channel;

            Mode.Channel.reply("get:mode:root", function(){
                return Mode.RootView;
            });

            Mode.RootView.on("show", function(){
                for(var key in Mode.components){
                    var component = Mode.components[key];
                    var componentView = component.Channel.request("get:component:root");
                    var componentRegion = Mode.RootView.getRegion(dataMode.components[key].region);
                    componentRegion.show(componentView);
                }
            });

            Mode.Channel.listenTo(tableChannel, "custom:control:one", function(args){
                Mode.Channel.trigger("create:new:model", args);
            });

            Mode.Channel.listenTo(tableChannel, "custom:control:two", function(){
                if(Mode.Selection.length > 0){
                    Mode.Channel.trigger("delete:model", {
                        model: Mode.Selection.at(0)
                    });
                }
            });

            Mode.Channel.comply("add:empty:model", function(args){
                tableChannel.command("add:model", args);
                console.log("added new model");
            });

            $(window).keydown(function(event) { 
                if((event.ctrlKey || event.metaKey) && event.keyCode == 83) {
                    Mode.Channel.trigger("save:models", {modelName: "Asignatura"});
                    event.preventDefault();
                }
            });

            $(window).keydown(function(event) {
                if(event.ctrlKey || event.metaKey){
                    tableChannel.trigger("change:mode", {mode: "append"});
                }
                else if(event.shiftKey){
                    tableChannel.trigger("change:mode", {mode: "between"});
                }
            });

            $(window).keyup(function(event) {
                if(!event.ctrlKey && !event.metaKey && !event.shiftKey){
                    tableChannel.trigger("change:mode", {mode: "single"});
                }
                if(event.which === 83){//letter S
                    tableChannel.trigger("print:selection:count");
                }
            });

            // $(document).on("keyup", function(event){
            //     switch(event.which){
            //         case 38: //UP
            //             tableChannel.trigger("option:prev");
            //             event.preventDefault();
            //             break;
            //         case 40: //DOWN
            //             tableChannel.trigger("option:next");
            //             event.preventDefault();
            //             break;
            //     }
            //     event.stopPropagation();
            // });

        };

        return Mode;
    };
    return ModeConstructor;
});
