define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/downloadViewer/templates/item.html"
], function (Marionette, Radio, Shim, DownloadViewerItemTemplate) {
    var DownloadViewerConstructor = function(channelName){

        var DownloadViewer = new Marionette.Application();
        DownloadViewer.Channel = Radio.channel(channelName);

        DownloadViewer.ItemView = Marionette.ItemView.extend({
            tagName: "div",
            className: "file",
            template: _.template(DownloadViewerItemTemplate)
        });

        DownloadViewer.CollectionView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "downloadViewer",
            childView: DownloadViewer.ItemView,
        });

        DownloadViewer.on("start", function(args){

            var downCol = Backbone.Collection.extend();
            DownloadViewer.Collection = new downCol(args.files);

            DownloadViewer.colecctionview = new DownloadViewer.CollectionView({collection:DownloadViewer.Collection});

            DownloadViewer.Channel.reply("get:root", function(){
                return DownloadViewer.colecctionview;
            });

        });

        return DownloadViewer;
    };

    return DownloadViewerConstructor;

});
