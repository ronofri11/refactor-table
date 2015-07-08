define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/download/templates/download.html",
    "text!assets/download/templates/itemdownload.html"
], function (Marionette, Radio, Shim, DownloadTemplate, ItemDownloadTemplate) {
    var DownloadConstructor = function(channelName){

        var Download = new Marionette.Application();
        Download.Channel = Radio.channel(channelName);

        Download.ItemView = Marionette.ItemView.extend({
            tagname: "li",
            className: "item",
            template: _.template(ItemDownloadTemplate),
            templateHelpers: function(){
                var self = this;
                return {
                  type: function(){
                    switch( self.model.get("type") ){
                        case "button":
                            return "<button type=\"submit\" class=\"" + self.model.get("className") + "\"><span class=\"" + self.model.get("icon") + "\"></span><span class=\"name\">" + self.model.get("nombre") + "</span></button>"
                            break;
                        case "select":
                            console.log("select: ", self.model.get("options") );
                            var items = "";
                            _.each( self.model.get("options") , function(option){
                                items = items + "<option value=\"" + option.value + "\">" + option.nombre + "</option>";
                            });

                            return "<select class=\"" + self.model.get("className") + "\">" + items + "</select>"
                            break;
                    }
                  }()
                };
            }
        });

        Download.Composite = Marionette.CompositeView.extend({
            tagName: "div",
            className: "download",
            childView: Download.ItemView,
            childViewContainer: ".options",
            template: _.template(DownloadTemplate),
            templateHelpers: function(){
                return {
                    action: Download.Action
                }
            }
        });

        Download.on("start", function(args){
            Download.Action = args.action; // Composite templateHelpers arg

            var downloadCollection = Backbone.Collection.extend();
            Download.Collection = new downloadCollection(args.options);

            Download.Compositeview = new Download.Composite({collection:Download.Collection});

            Download.Channel.reply("get:root", function(){
                return Download.Compositeview;
            });

        });

        return Download;
    };

    return DownloadConstructor;

});
