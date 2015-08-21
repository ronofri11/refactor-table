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

            var Region = Marionette.Region.extend();
            Mode.RootView.addRegion("contextmenu", new Region({
                el: "#contextmenuRegion"
            }));

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

            // ContextMenu start
            Mode.ContextMenu = new ContextMenu(channelName + "_contextmenu");
            var contextmenuChannel = Mode.ContextMenu.Channel;

            var EmptyCollection = Backbone.Collection.extend();
            Mode.ContextMenuOptions = new EmptyCollection();

            Mode.ContextMenu.start({
                options: Mode.ContextMenuOptions
            });

            this.setHandlers();
        });

        Mode.setHandlers = function(){
            var tableChannel = Mode.components["table"].Channel;
            var contextmenuChannel = Mode.ContextMenu.Channel;

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
                var ContextMenuView = contextmenuChannel.request("get:root");
                Mode.RootView.getRegion("contextmenu").show(ContextMenuView);
            });

            Mode.Channel.listenTo(tableChannel, "custom:control:one", function(args){
            });

            Mode.Channel.listenTo(tableChannel, "custom:control:two", function(){
            });

            Mode.Channel.comply("add:empty:model", function(args){
                tableChannel.command("add:model", args);
                console.log("added new model");
            });

            // ContextMenu events
            Mode.Channel.listenTo(tableChannel, "row:click", function(){
                contextmenuChannel.trigger("hide:contextmenu");
            });

            // get ContextMenu action
            Mode.Channel.listenTo(contextmenuChannel, "action:selected", function(args){
                console.log("action en mode: ", args.action);
                switch(args.action){
                    case "contextmenu:edit:row:single":
                        tableChannel.trigger("show:screed", {mode: "multiple"});
                        break;
                    case "contextmenu:edit:field:multiple":
                        tableChannel.trigger("show:screed", {mode: "single"});
                        break;
                    case "contextmenu:create:row:single":
                        Mode.Channel.trigger("create:new:row");
                        break;
                    case "contextmenu:delete:row:single":
                    case "contextmenu:delete:row:multiple":
                        tableChannel.trigger("delete:selection");
                        break;
                    case "contextmenu:undo:changes":
                        Mode.Channel.trigger("undo:changes:for:selection");
                }
            });

            Mode.Channel.on("set:empty:row", function(args){
                var emptyRow = args.row;
                console.log("mode set empty row:", emptyRow);
                tableChannel.trigger("new:row", {row: emptyRow});
            });

            Mode.Channel.on("stop", function(){
                tableChannel.trigger("stop");
            });

            Mode.Channel.listenTo(tableChannel, "row:right:click", function(args){
                var selection = tableChannel.request("get:selection");
                var optionsContextMenu;

                var allDeleted = true;
                _.each(selection.rows, function(row){
                    allDeleted = allDeleted && row.get("deleted");
                });

                switch(selection.rows.length){
                    case 1:
                        if(allDeleted){
                            optionsContextMenu = [
                                {
                                    className: "createRow",
                                    content: "Crear registro",
                                    action: "contextmenu:create:row:single"
                                },
                                {
                                    className: "undoRow",
                                    content: "Deshacer eliminar",
                                    action: "contextmenu:undo:changes"
                                }
                            ]
                        }
                        else{
                            optionsContextMenu = [
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
                        }
                        break;
                    default:
                        if(allDeleted){
                            optionsContextMenu = [
                                {
                                    className: "undoRow",
                                    content: "Deshacer eliminar",
                                    action: "contextmenu:undo:changes"
                                }
                            ]
                        }
                        else{
                            optionsContextMenu = [
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
                        }
                        break;
                }

                Mode.ContextMenuOptions.reset(optionsContextMenu);

                contextmenuChannel.trigger("show:contextmenu", {
                    options : Mode.ContextMenuOptions,
                    pos: {
                        "top": args.pos.top,
                        "left": args.pos.left
                    }
                });
            });

            Mode.Channel.listenTo(tableChannel, "send:form:data", function(args){
                console.log("in mode send form data");
                Mode.Channel.trigger("send:form:data", args);
            });

            Mode.Channel.listenTo(tableChannel, "create:new:row", function(){
                Mode.Channel.trigger("create:new:row");
            });

            Mode.Channel.on("create:new:row", function(){
                Mode.Channel.trigger("get:empty:row", {
                    successCallback: function(row){
                        Mode.Channel.trigger("set:empty:row", {
                            row: row
                        });
                    }
                });
            });

            Mode.Channel.listenTo(tableChannel, "undo:changes", function(){
                Mode.Channel.trigger("undo:changes:for:selection");
            });

            Mode.Channel.on("undo:changes:for:selection", function(){
                var selection = tableChannel.request("get:selection");
                Mode.Channel.trigger("undo:changes", selection);
            });

            $(window).off();

            $(window).on("keydown", function(event) {
                if((event.ctrlKey || event.metaKey) && event.keyCode == 83) {
                    Mode.Channel.trigger("save:models", {modelName: "Asignatura"});
                    event.preventDefault();
                }
            });

            $(window).on("keydown", function(event) {
                if(event.ctrlKey || event.metaKey){
                    tableChannel.trigger("change:mode", {mode: "append"});
                }
                else if(event.shiftKey){
                    tableChannel.trigger("change:mode", {mode: "between"});
                }
            });

            $(window).on("keyup", function(event) {
                if(!event.ctrlKey && !event.metaKey && !event.shiftKey){
                    tableChannel.trigger("change:mode", {mode: "single"});
                }
                if(event.which === 83){//letter S
                    tableChannel.trigger("print:selection:count");
                }
            });

            $(document).off().on("click", function(event){
                var tableContext = tableChannel.request("get:context:selectors");
                var outOfContext = true;
                _.each(tableContext, function(selector){
                    outOfContext = outOfContext && $(event.target).not(selector);
                });
                if(outOfContext){
                    // tableChannel.trigger("empty:selection");
                    // tableChannel.trigger("close:screed");
                    contextmenuChannel.trigger("hide:contextmenu");
                }
            });
        };

        return Mode;
    };
    return ModeConstructor;
});
