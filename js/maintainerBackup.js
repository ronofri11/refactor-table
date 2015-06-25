define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!templates/maintainer.html",
    "text!templates/modeselector.html"
], function (Marionette, Radio, Shim, maintainerTemplate, modeSelectorTemplate) {
    
    var MaintainerConstructor = function(channelName){
        var Maintainer = new Marionette.Application();
        Maintainer.Channel = Radio.channel(channelName);

        var MaintainerLayout = Marionette.LayoutView.extend({
            tagName: "div",
            className: "maintainer",
            template: _.template(maintainerTemplate),
            regions: {
                headerLeft: ".header .left",
                headerRight: ".header .right",
                container: ".container"
            },

            // events: {
            //     "mouseenter .modes" : "modeButton",
            //     "mouseleave .modes" : "hideOptions",
            //     "click .modes .options li span": "changeMode",
            //     "click .actionButton": "action"
            // },

            modeButton: function(event){
                this.$el.find(".options").toggleClass("hide");
            },

            hideOptions: function(event){
                this.$el.find(".options").addClass("hide");
            },

            changeMode: function(event){
                // // change modes active options
                // var ModeName = $(event.target).parent().attr("id");
                // var ModeState = $(event.target).parent().attr("class");

                // Maintainer.Channel.command("set:layout", {
                //     modeName: ModeName
                // });

                // // actionButton
                // var activeMode = Maintainer.modes.findWhere({"active": true});
                // var activeState = activeMode.get("state");
                // this.$el.find(".actionButton li").removeClass();
                // this.$el.find(".actionButton li").addClass(activeState);

            },

            action: function(event){
                var eventName = "action:button:" + event.type;
                Maintainer.Channel.trigger(eventName, {eventName: eventName});
            },

            onShow: function()
            {
                // set Modes
                Maintainer.ModeButtons = new ModesView({collection: Maintainer.modes});
                Maintainer.Layout.getRegion("modes").show(Maintainer.ModeButtons);

                // start regions
                var Regions = App.module("Maintainer.Regions");
                var regionsChannelName = Maintainer.Channel.channelName + "_regions";
                Regions.start({
                    channelName: regionsChannelName,
                    modes: Maintainer.modes
                });

                // actionButton
                var activeMode = Maintainer.modes.findWhere({"active": true});
                var activeState = activeMode.get("state");
                this.$el.find(".actionButton li").addClass(activeState);

                // tunes region channel
                var regionsChannel = Radio.channel(regionsChannelName);
                var regionsView = regionsChannel.request("get:regions:root");

                // show regions
                Maintainer.Layout.getRegion("container").show(regionsView);

                // re-renderizar modes
                Maintainer.Channel.listenTo(regionsChannel, "change:mode", function(args){
                    Maintainer.ModeButtons.render();
                });
            }
        });


        return Maintainer;
    };
    return MaintainerConstructor;

        this.on("start", function(options){

            var dataMaintainer = options.dataMaintainer;
            this.Channel = Radio.channel(options.channelName);

            this.model = new MaintainerModel(dataMaintainer);
            this.Layout = new MaintainerLayout({model: this.model});

            // add region and create Modes instances
            var modesRegion = Marionette.Region.extend();
            var modeSelector = this.Layout.$el.find(".modes");
            this.Layout.addRegion("modes", modeSelector);
            this.modes = new MaintainerModes(this.model.get("modes"));

            //publish module API through Radio
            this.Channel.reply("get:maintainer:root", function(){
                return Maintainer.Layout;
            });

            // update mode
            this.Channel.comply("set:layout", function(args){
                var NewActiveMode = Maintainer.modes.findWhere({ "name": args.modeName });
                NewActiveMode.set("active", true);
            });


        });


    });


    // Regions Submodule!
    App.module("Maintainer.Regions", function(Regions, App){
        this.startWithParent = false;

        var RegionsLayout = Marionette.LayoutView.extend({
            initialize: function(options){
                this.modes = options.modes;
                this.listenTo(this.modes, "change:active", this.changeActiveMode);
            },
            changeActiveMode: function(args){
                this.modes.each(function(mode){
                    if( mode.get("name") !== args.get("name") ){
                        mode.set({ "active": false }, { silent: true });
                    }
                });
                this.render();
                Regions.Channel.trigger("change:mode", {
                    modeName: args.get("name")
                });
            },
            getTemplate: function(){
                var modes = this.modes;
                var defaultMode = modes.findWhere({
                    "active": true
                });
                var layout;
                if(defaultMode !== undefined){
                    layout = defaultMode.get("layout");
                }

                var template;
                switch(layout){
                    case "fullpage":
                        template = _.template(FullPageTemplate);
                        break;
                    case "columnHeaderMainflip":
                        template = _.template(ColumnHeaderMainflip);
                        break;
                }
                return template;
            },
            regions: {
                main: ".region .main",
                columnLeft: ".region .columnLeft",
                header: ".region .header",
                mainflip: ".region .mainflip"
            }
        });

        this.on("start", function(options){
            this.Channel = Radio.channel(options.channelName);
            this.Layout = new RegionsLayout({modes: options.modes});

            //publish module API through Radio
            this.Channel.reply("get:regions:root", function(){
                return Regions.Layout;
            });
        });
    });

    // Action!
    App.on("start", function(options){
        App.Channel = Radio.channel(options.channelName);

        var Maintainer = App.module("Maintainer");
        var maintainerChannelName = options.channelName + "_maintainer";

        Maintainer.start({
            dataMaintainer: options.dataMaintainer,
            channelName: maintainerChannelName
        });

        var maintainerChannel = Radio.channel(maintainerChannelName);
        var maintainerView = maintainerChannel.request("get:maintainer:root");

        Target.main.show(maintainerView);


        App.Channel.on("change:layout", function(args){
            maintainerChannel.command("set:layout", args);
        });

        App.Channel.listenTo(maintainerChannel, "action:button:click", function(){
            alert("click action desactivado (no modify)");
        });

    });

    return App;
});
