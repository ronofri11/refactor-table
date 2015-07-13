define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "component/component",
    "assets/contextmenu/js/contextmenu",
    "text!templates/regions/fullpage.html",
    "text!templates/regions/columnHeaderMain.html",
    "text!templates/regions/columnHeaderMainflip.html",
    "text!templates/regions/mainFooterColumn.html",
], function (Marionette, Radio, Shim, Component, ContextMenu, fullpageTemplate, columnHeaderMainTemplate, columnHeaderMainflipTemplate, MainFooterColumnTemplate) {

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
                    case "mainFooterColumn":
                        return _.template(MainFooterColumnTemplate);
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

            // CONTEXTMENU OPTIONS
            Mode.Channel.listenTo(tableChannel, "show:contextmenu", function(args){
                var objectSelected = tableChannel.request("get:selection");

                switch(objectSelected.rows.length){
                    case 1:
                        var optionsContextMenu = [
                            {
                                className: "editRow",
                                content: "Editar registro",
                                action: "contextmenu:edit:row:single"
                            },
                            {
                                className: "createRow",
                                content: "Crear registro",
                                action: "contextmenu:create:row:single"
                            },
                            {
                                className: "deleteRow",
                                content: "Eliminar registro",
                                action: "contextmenu:delete:row:single"
                            }
                        ]
                        break;
                    default:
                        var optionsContextMenu = [
                            {
                                className: "editRow",
                                content: "Editar registros",
                                action: "contextmenu:edit:field:multiple"
                            },
                            {
                                className: "deleteRow",
                                content: "Eliminar registros",
                                action: "contextmenu:delete:row:multiple"
                            }
                        ]
                        break;
                }

                // CONTEXTMENU START
                Mode.optCollection = Backbone.Collection.extend();
                var optCollection = new Mode.optCollection(optionsContextMenu);

                var contextmenu = new ContextMenu("contextmenu");
                var contextmenuChannel = contextmenu.Channel;

                contextmenu.start({
                    options : optCollection,
                    pos: {
                        "top": args.pos.top,
                        "left": args.pos.left
                    }
                });

                // SHOW CONTEXTMENU
                var contextmenuview = contextmenuChannel.request("get:root");
                Mode.contextmenuRegion.get("container").show(contextmenuview);

                Mode.Channel.listenTo(tableChannel, "row:click", function(){
                    contextmenuChannel.trigger("contextmenu:hide");
                });
            });
        });

        Mode.setHandlers = function(){
            var tableChannel = Mode.components["table"].Channel;

            Mode.Channel.reply("get:mode:root", function(){
                return Mode.RootView;
            });

            Mode.RootView.on("show", function(){
                // CONTEXTMENU REGION
                var RM = Marionette.RegionManager.extend();
                Mode.contextmenuRegion = new RM();
                Mode.contextmenuRegion.addRegions({
                  container: "#contextmenuRegion"
                });


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

            $(document).on("click", function(event){
                var tableContext = tableChannel.request("get:context:selector");
                // var contextmenuContext = contextmenuChannel.request("get:context:selector");
                if($(event.target).not(tableContext)){
                    tableChannel.trigger("empty:selection");
                }

                // if($(event.target).not(contextmenuContext)){
                //     contextmenuChannel.trigger("contextmenu:hide");
                // }

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
