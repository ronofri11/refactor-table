define([
    "backbone.radio",
    "radio.shim",
    "../js/simpleformclasses"
], function(Radio, Shim, Classes){

    var SimpleFormConstructor = function(channelName){

        var SimpleForm = new Marionette.Application();

        SimpleForm.Channel = Radio.channel(channelName);

        SimpleForm.on("start", function(options){
            SimpleForm.Mode = "empty";
            SimpleForm.Model = null;
            SimpleForm.Editors = new Classes.Editors(options.schema);

            SimpleForm.RootView = new Classes.EditorCollectionView({
                collection: SimpleForm.Editors,
                simpleform: SimpleForm
            });

            SimpleForm.Channel.reply("get:root", function(){
                return SimpleForm.RootView;
            });

            SimpleForm.Channel.on("change:mode", function(args){
                var mode = args.mode;
                var model = args.model;
                SimpleForm.Mode = mode;
                SimpleForm.Model = model;
            });

            SimpleForm.Channel.on("set:model", function(args){
                var model = args.model;
                SimpleForm.Model = model;
            });

            SimpleForm.Channel.on("set:form:data", function(){
                SimpleForm.RootView.setformData();
            });

            SimpleForm.Channel.reply("export:data", function(){
                SimpleForm.Channel.trigger("set:form:data");
                var formData = SimpleForm.RootView.exportData();
                return formData;
            });

            SimpleForm.Channel.on("set:data:from:model", function(args){
                SimpleForm.Model = args.model;
                SimpleForm.RootView.setDataFromModel();
            });

            SimpleForm.Channel.on("editor:focusout", function(args){
                SimpleForm.Channel.trigger("update:model:data");
            });

            SimpleForm.Channel.on("editor:change", function(args){
                SimpleForm.Channel.trigger("update:model:data");
            });
        });

        return SimpleForm;
    };

    return SimpleFormConstructor;
});
