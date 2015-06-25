define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "mode",
    "text!templates/maintainer.html",
    "text!templates/modeselector.html"
], function (Marionette, Radio, Shim, Mode, maintainerTemplate, modeSelectorTemplate) {
    
    var MaintainerConstructor = function(channelName){
        var Maintainer = new Marionette.Application();
        Maintainer.Channel = Radio.channel(channelName);

        var LayoutView = Marionette.LayoutView.extend({
            tagName: "div",
            className: "maintainer",
            template: _.template(maintainerTemplate),
            regions: {
                headerLeft: ".header .left",
                headerRight: ".header .right",
                container: ".container"
            },

            templateHelpers: function(){
                return {
                    title: Maintainer.title
                };
            },

            changeMode: function(){
                // ????
            },

            action: function(event){
                Maintainer.Channel.trigger("action:button:click");
            }
        });

        Maintainer.on("start", function(options){
            Maintainer.title = options.title;
            Maintainer.modes = {};

            Maintainer.RootView = new LayoutView();

            //iterate over Maintainer.modes
            Maintainer.activeKey;
            for(var key in options.modes){
                if(Maintainer.activeKey === undefined){
                    Maintainer.activeKey = key;
                }
                Maintainer.modes[key] = new Mode(options.modes[key]);
                Maintainer.modes[key].start();
            }

            Maintainer.RootView.on("show", function(){
                var mode = Maintainer.modes[Maintainer.activeKey];
                var modeView = mode.Channel.request("get:mode:root");
                Maintainer.RootView.getRegion("container").show(modeView);
            });

            Maintainer.Channel.reply("get:root", function(){
                return Maintainer.RootView;
            });

            Maintainer.Channel.on("change:active:mode", function(args){
                var activeKey = args.key;
                if(Maintainer.activeKey !== activeKey){
                    //dejar la cagaa
                }
            });
        });

        return Maintainer;
    };
    return MaintainerConstructor;
});


    // // Regions Submodule!
    // App.module("Maintainer.Regions", function(Regions, App){
    //     this.startWithParent = false;

    //     var RegionsLayout = Marionette.LayoutView.extend({
    //         initialize: function(options){
    //             this.modes = options.modes;
    //             this.listenTo(this.modes, "change:active", this.changeActiveMode);
    //         },
    //         changeActiveMode: function(args){
    //             this.modes.each(function(mode){
    //                 if( mode.get("name") !== args.get("name") ){
    //                     mode.set({ "active": false }, { silent: true });
    //                 }
    //             });
    //             this.render();
    //             Regions.Channel.trigger("change:mode", {
    //                 modeName: args.get("name")
    //             });
    //         },
    //         getTemplate: function(){
    //             var modes = this.modes;
    //             var defaultMode = modes.findWhere({
    //                 "active": true
    //             });
    //             var layout;
    //             if(defaultMode !== undefined){
    //                 layout = defaultMode.get("layout");
    //             }

    //             var template;
    //             switch(layout){
    //                 case "fullpage":
    //                     template = _.template(FullPageTemplate);
    //                     break;
    //                 case "columnHeaderMainflip":
    //                     template = _.template(ColumnHeaderMainflip);
    //                     break;
    //             }
    //             return template;
    //         },
    //         regions: {
    //             main: ".region .main",
    //             columnLeft: ".region .columnLeft",
    //             header: ".region .header",
    //             mainflip: ".region .mainflip"
    //         }
    //     });

    //     this.on("start", function(options){
    //         this.Channel = Radio.channel(options.channelName);
    //         this.Layout = new RegionsLayout({modes: options.modes});

    //         //publish module API through Radio
    //         this.Channel.reply("get:regions:root", function(){
    //             return Regions.Layout;
    //         });
    //     });
    // });

    // // Action!
    // App.on("start", function(options){
    //     App.Channel = Radio.channel(options.channelName);

    //     var Maintainer = App.module("Maintainer");
    //     var maintainerChannelName = options.channelName + "_maintainer";

    //     Maintainer.start({
    //         dataMaintainer: options.dataMaintainer,
    //         channelName: maintainerChannelName
    //     });

    //     var maintainerChannel = Radio.channel(maintainerChannelName);
    //     var maintainerView = maintainerChannel.request("get:maintainer:root");

    //     Target.main.show(maintainerView);


    //     App.Channel.on("change:layout", function(args){
    //         maintainerChannel.command("set:layout", args);
    //     });

    //     App.Channel.listenTo(maintainerChannel, "action:button:click", function(){
    //         alert("click action desactivado (no modify)");
    //     });

    // });

    // return App;
// });
