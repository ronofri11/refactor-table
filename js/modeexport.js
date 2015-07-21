define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "component/component",
    "text!templates/regions/fullpage.html",
    "text!templates/regions/columnHeaderMain.html",
    "text!templates/regions/columnHeaderMainflip.html",
    "text!templates/regions/mainFooterColumn.html",
    "text!templates/regions/mainColumn.html",
], function (Marionette, Radio, Shim, Component, fullpageTemplate, columnHeaderMainTemplate, columnHeaderMainflipTemplate, MainFooterColumnTemplate, MainColumnTemplate) {

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
                    case "mainColumn":
                        return _.template(MainColumnTemplate);
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
                // var importChannel = Mode.components[key].Channel;
            }


            for(var key in Mode.components){
                Mode.components[key].start();
            }

            //Mode has an empty collection to keep the selected model

            this.setHandlers();
        });

        Mode.setHandlers = function(){
            var importChannel = Mode.components["downloadViewer"].Channel;
            var optionChannel = Mode.components["options"].Channel;

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

            Mode.Channel.listenTo(importChannel, "upload:change", function(args){
                var activeOptions = optionChannel.request("get:active:options");
                var filename = args.filename;
                var callback;

                if(filename == ""){
                    callback = null;
                }else{
                    callback = function(){
                        console.log('options: ', activeOptions);
                    };
                }

                Mode.Channel.trigger("active:button:set:callback", {
                    callback: callback
                });
            });

            Mode.Channel.listenTo(optionChannel, "options:change", function(args){
                var filename = importChannel.request("get:filename");
                var activeOptions = args.activeOptions;

                if(filename == ""){
                    callback = null;
                }else{
                    callback = function(){
                        var options = "";
                        _.each(activeOptions, function(opt){
                            options = options + ", " + opt.get("name");
                        });

                        console.log('file, options: ', filename, activeOptions);
                        alert(filename);
                        alert(options);
                    };
                }

                Mode.Channel.trigger("active:button:set:callback", {
                    callback: callback
                });
            });


        };

        return Mode;
    };
    return ModeConstructor;
});
