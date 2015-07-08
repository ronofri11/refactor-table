define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "component/component",
    "text!templates/regions/fullpage.html",
    "text!templates/regions/columnHeaderMain.html",
    "text!templates/regions/columnHeaderMainflip.html",
    "text!templates/regions/mainFooterColumn.html",
], function (Marionette, Radio, Shim, Component, fullpageTemplate, columnHeaderMainTemplate, columnHeaderMainflipTemplate, MainFooterColumnTemplate) {

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
            }
        });

        Mode.on("start", function(options){

            Mode.RootView = new ContentLayoutView();
            Mode.RootView.addRegion("main", ".region.main");
            Mode.RootView.addRegion("footer", ".region.footer");
            Mode.RootView.addRegion("columnRight", ".region.columnRight");

            var channelName = dataMode.channelName;
            Mode.Channel = Radio.channel(channelName);

            // component
            Mode.components = {};

            for(var key in dataMode.components){
                Mode.components[key] = new Component(dataMode.components[key]);
                console.log("Mode.components[key].Channel : ", Mode.components[key].Channel);
                var importChannel = Mode.components[key].Channel;
            }


            for(var key in Mode.components){
                Mode.components[key].start();
            }

            //Mode has an empty collection to keep the selected model

            this.setHandlers();
        });

        Mode.setHandlers = function(){
            var importChannel = Mode.components["uploadDrag"].Channel;

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

            // $(window).keydown(function(event) {
            //     if((event.ctrlKey || event.metaKey) && event.keyCode == 83) {
            //         Mode.Channel.trigger("save:models", {modelName: "Asignatura"});
            //         event.preventDefault();
            //     }
            // });

        };

        return Mode;
    };
    return ModeConstructor;
});
