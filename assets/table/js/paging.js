define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!./../templates/paging.html"
], function(Marionette, Radio, Shim, PagingTemplate){

    var PagingConstructor = function(channelName){
        
        var Paging = new Marionette.Application();

        Paging.Channel = Radio.channel(channelName);

        var Pager = Backbone.Model.extend();

        var PagingView = Marionette.ItemView.extend({
            tagName: "div",
            className: "paging",
            template: _.template(PagingTemplate)
        });

        Paging.on("start", function(options){
            Paging.RootView = new PagingView();

            Paging.Channel.reply("get:root", function(){
                return Paging.RootView;
            });
        });

        return Paging;
    };

    return PagingConstructor;
});
