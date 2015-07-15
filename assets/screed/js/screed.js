define([
    "backbone.radio",
    "radio.shim",
    "../js/screedclasses"
], function(Radio, Shim, Classes){

    var ScreedConstructor = function(channelName){

        var Screed = new Marionette.Application();

        Screed.Channel = Radio.channel(channelName);

        Screed.on("start", function(options){
            Screed.Mode = "empty";
            Screed.Model = null;

            var columns = options.columns.map(function(col){
                return col.toJSON();
            });
            Screed.Editors = new Classes.Editors(columns);
            console.log(columns);
            Screed.RootView = new Classes.EditorCollectionView({
                collection: Screed.Editors,
                screed: Screed
            });

            Screed.Channel.reply("get:root", function(){
                return Screed.RootView;
            });

            Screed.Channel.on("show:screed", function(args){
                console.log("params: ", args);
            });

        });

        return Screed;
    };

    return ScreedConstructor;
});
