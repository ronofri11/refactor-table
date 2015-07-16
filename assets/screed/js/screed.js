define([
    "backbone.radio",
    "radio.shim",
    "../js/screedclasses"
], function(Radio, Shim, Classes){

    var ScreedConstructor = function(channelName){

        var Screed = new Marionette.Application();

        Screed.Channel = Radio.channel(channelName);

        Screed.on("start", function(options){
            var columns = options.columns.map(function(col){
                return col.toJSON();
            });
            Screed.Editors = new Classes.Editors(columns);
            Screed.RootView = new Classes.EditorCollectionView({
                collection: Screed.Editors,
                screed: Screed
            });

            Screed.Channel.reply("get:root", function(){
                return Screed.RootView;
            });

            Screed.Channel.on("show:screed", function(args){
                console.log("params: ", args);
                Screed.populateEditorValues(args);
                console.log("SCREED EDITORS:", Screed.Editors);
                Screed.getDistinctOptions();
            });

        });

        Screed.populateEditorValues = function(params){
            var rows = params.rows;
            var column = params.column;

            Screed.Editors.each(function(editor){
                var value;
                for(var i = 0; i < rows.length; i++){
                    var rowValue = rows[i].get(editor.get("key"));
                    if(value === undefined){
                        value = rowValue;
                    }
                    if(value != rowValue){
                        value = editor.get("default");
                        break;
                    }
                }
                editor.set("data", value);
            });
        };

        Screed.getDistinctOptions = function(){
            var properties = Screed.Editors.pluck("key");
            console.log("properties involved:", properties);
            Screed.Editors.each(function(editor){

            });
        };

        return Screed;
    };

    return ScreedConstructor;
});
