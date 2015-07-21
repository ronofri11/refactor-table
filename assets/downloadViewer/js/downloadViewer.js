define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/downloadViewer/templates/downloadViewer.html"
], function (Marionette, Radio, Shim, DownloadViewerTemplate) {
    var DownloadViewerConstructor = function(channelName){

        var DownloadViewer = new Marionette.Application();
        DownloadViewer.Channel = Radio.channel(channelName);

        DownloadViewer.LayoutView = Marionette.LayoutView.extend({
            tagname: "div",
            className: "downloadViewer",
            template: _.template(DownloadViewerTemplate)
        });

        DownloadViewer.on("start", function(args){
            console.log("args: ", args);

            // var data = args.modalStuff
            downloadviewer = Backbone.Model.extend();
            DownloadViewer.Model = new downloadviewer(args);

            DownloadViewer.layoutView = new DownloadViewer.LayoutView({model:DownloadViewer.Model});

            DownloadViewer.Channel.reply("get:root", function(){
                return DownloadViewer.layoutView;
            });

        });

        return DownloadViewer;
    };

    return DownloadViewerConstructor;

});
