define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/uploadDrag/templates/uploadDrag.html"
], function (Marionette, Radio, Shim, UploadDragTemplate) {
    var UploadDragConstructor = function(channelName){

        var UploadDrag = new Marionette.Application();
        UploadDrag.Channel = Radio.channel(channelName);

        UploadDrag.LayoutView = Marionette.LayoutView.extend({
            tagname: "div",
            className: "uploadDrag",
            template: _.template(UploadDragTemplate)
        });

        UploadDrag.on("start", function(args){
            console.log("args: ", args);
            // var data = args.modalStuff
            usermodel = Backbone.Model.extend();
            UploadDrag.Model = new usermodel(args);

            UploadDrag.layoutView = new UploadDrag.LayoutView({model:UploadDrag.Model});

            UploadDrag.Channel.reply("get:root", function(){
                return UploadDrag.layoutView;
            });

        });

        return UploadDrag;
    };

    return UploadDragConstructor;

});
