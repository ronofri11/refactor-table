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
