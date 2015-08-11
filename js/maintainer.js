define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "mode",
    "modeimport",
    "modeexport",
    "text!templates/maintainer.html",
    "text!templates/modeselector.html"
], function (Marionette, Radio, Shim, Mode, ModeImport, ModeExport, maintainerTemplate, modeSelectorTemplate) {

    var MaintainerConstructor = function(channelName){
        var Maintainer = new Marionette.Application();
        Maintainer.Channel = Radio.channel(channelName);

        var LayoutView = Marionette.LayoutView.extend({
            tagName: "div",
            className: "maintainer",
            template: _.template(maintainerTemplate),
            events: {
                "click .actionButton": "action"
            },
            regions: {
                headerLeft: ".header .left .modes",
                headerRight: ".header .right",
                container: ".container"
            },

            templateHelpers: function(){
                return {
                    title: Maintainer.title
                };
            },

            action: function(event){
                Maintainer.Channel.trigger("action:button:click");
            },

            updateActionButton: function(iconClass){
                var actionButton = this.$el.find(".header .right .actionButton li");
                actionButton.removeClass();
                actionButton.addClass(iconClass);
            },
            actionButtonSetClass: function(args){
                console.log("el: ", this.$el);
                var lockClass = args.class;
                var remove = args.remove;
                if(remove == true){
                    this.$el.find(".actionButton").removeClass(lockClass);
                }else{
                    this.$el.find(".actionButton").addClass(lockClass);
                }
            }
        });

        var ModeItemView = Marionette.ItemView.extend({
            tagName: "li",
            template: _.template("<span></span>"),
            onRender: function(){
                this.$el.data("key", this.model.get("key"));
                this.$el.addClass(this.model.get("iconClass"));

                if(this.model.get("active")){
                    this.$el.addClass("hide");
                }
                else{
                    this.$el.removeClass("hide");
                }
            }
        });

        var ModeSelectorView = Marionette.CompositeView.extend({
            className: "modeselector",
            childView: ModeItemView,
            template: _.template(modeSelectorTemplate),
            childViewContainer: ".options",

            events: {
                "mouseenter.modeselector" : "modeButton",
                "mouseleave.modeselector" : "hideOptions",
                "click .options li": "changeMode"
            },

            templateHelpers: function(){
                var modeActive = this.collection.findWhere({"active": true});
                Maintainer.Channel.trigger("update:action:button", {
                    iconClass: modeActive.get("iconClass")
                });
                return {
                    activeKey: modeActive.get("key"),
                    activeIconClass: modeActive.get("iconClass"),
                };
            },

            modeButton: function(event){
                this.$el.find(".options").toggleClass("hide");
            },

            hideOptions: function(event){
                this.$el.find(".options").addClass("hide");
            },

            changeMode: function(event){
                var mode = $(event.target).parent();
                var key = mode.data("key");
                Maintainer.Channel.trigger("change:active:mode", {key: key});

                var currentActiveMode = this.collection.findWhere({"active": true});
                currentActiveMode.set({"active": false});

                var activeMode = this.collection.findWhere({"key": key});
                activeMode.set({"active": true});

                this.render();
            }

        });

        Maintainer.on("start", function(options){
            Maintainer.activeButtonCallback = null;

            var Collection = Backbone.Collection.extend();

            Maintainer.title = options.title;
            Maintainer.modes = {};

            Maintainer.RootView = new LayoutView();

            //iterate over Maintainer.modes
            Maintainer.activeKey;

            var modeOptions = _.map(options.modes, function(mode, key){
                return {
                    key: key,
                    iconClass: mode.iconClass,
                    active: false,
                    name: mode.name
                };
            });

            Maintainer.modeOptions = new Collection(modeOptions);

            if(Maintainer.modeOptions.length > 0){
                Maintainer.modeOptions.at(0).set({"active": true});
            }

            Maintainer.modeSelector = new ModeSelectorView({
                collection: Maintainer.modeOptions
            });

            for(var key in options.modes){
                if(Maintainer.activeKey === undefined){
                    Maintainer.activeKey = key;
                }
                switch(options.modes[key].type){
                    case "table":
                        Maintainer.modes[key] = new Mode(options.modes[key]);
                        break;
                    case "uploadDrag":
                        Maintainer.modes[key] = new ModeImport(options.modes[key]);
                        break;
                    case "downloadViewer":
                        Maintainer.modes[key] = new ModeExport(options.modes[key]);
                        break;
                }
            }

            Maintainer.modes[Maintainer.activeKey].start();

            Maintainer.RootView.on("show", function(){
                Maintainer.RootView.getRegion("headerLeft").show(Maintainer.modeSelector);
                var mode = Maintainer.modes[Maintainer.activeKey];
                var modeView = mode.Channel.request("get:mode:root");
                Maintainer.RootView.getRegion("container").show(modeView);
            });

            Maintainer.Channel.reply("get:root", function(){
                return Maintainer.RootView;
            });

            Maintainer.Channel.listenTo(Maintainer.modes[Maintainer.activeKey].Channel, "send:form:data", function(args){
                // console.log("in MAINTAINER send form data", args);
                Maintainer.Channel.trigger("send:form:data", args);
            });

            Maintainer.Channel.listenTo(Maintainer.modes[Maintainer.activeKey].Channel, "get:empty:row", function(args){
                Maintainer.Channel.trigger("get:empty:row", args);
            });

            Maintainer.Channel.listenTo(Maintainer.modes[Maintainer.activeKey].Channel, "undo:changes", function(args){
                Maintainer.Channel.trigger("undo:changes", args);
            });

            Maintainer.Channel.on("change:active:mode", function(args){
                var activeKey = args.key;
                if(Maintainer.activeKey !== activeKey){
                    
                    var previousMode = Maintainer.modes[Maintainer.activeKey];
                    previousMode.Channel.trigger("stop");

                    Maintainer.RootView.getRegion("container").reset();


                    var mode = Maintainer.modes[activeKey];
                    mode.start();

                    var modeView = mode.Channel.request("get:mode:root");
                    Maintainer.RootView.getRegion("container").show(modeView);

                    Maintainer.activeKey = activeKey;

                    Maintainer.Channel.listenTo(mode.Channel, "active:button:set:callback", function(args){
                        Maintainer.activeButtonCallback = args.callback;
                        if(Maintainer.activeButtonCallback !== null){
                            Maintainer.RootView.actionButtonSetClass({
                                "class": "lock",
                                "remove": true
                            });
                        }else{
                            Maintainer.RootView.actionButtonSetClass({
                                "class": "lock",
                                "remove": false
                            });
                        }
                    });

                    Maintainer.Channel.listenTo(mode.Channel, "send:form:data", function(args){
                        console.log("in MAINTAINER send form data 2");
                        Maintainer.Channel.trigger("send:form:data", args);
                    });
                }
            });

            Maintainer.Channel.on("update:action:button", function(args){
                var iconClass = args.iconClass;
                Maintainer.RootView.updateActionButton(iconClass);
            });

            Maintainer.Channel.on("action:button:click", function(){
                console.log("action button clicked");
            });



            Maintainer.Channel.on("action:button:click", function(args){
                if(Maintainer.activeButtonCallback !== null){
                    Maintainer.activeButtonCallback();
                }
            });


        });

        return Maintainer;
    };
    return MaintainerConstructor;
});
