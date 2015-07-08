define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/options/templates/options.html",
    "text!assets/options/templates/itemoptions.html"
], function (Marionette, Radio, Shim, OptionsTemplate, ItemOptionsTemplate) {
    var OptionsConstructor = function(channelName){

        var Options = new Marionette.Application();
        Options.Channel = Radio.channel(channelName);

        Options.ItemView = Marionette.ItemView.extend({
            tagname: "li",
            className: "option",
            template: _.template(ItemOptionsTemplate),
            templateHelpers: function(){
                var self = this;
                return {
                  type: function(){
                    switch( self.model.get("type") ){
                        case "checkbox":
                            return "<label><input type=\"checkbox\" value=\"" + self.model.get("content") + "\">" + self.model.get("content") + "</label>"
                            break;
                    }
                  }()
                };
            }
        });

        Options.CompositeView = Marionette.CompositeView.extend({
            tagName: "div",
            className: "options",
            childView: Options.ItemView,
            childViewContainer: ".options",
            template: _.template(OptionsTemplate)
        });

        Options.on("start", function(args){

            var optionsCollection = Backbone.Collection.extend();
            Options.Collection = new optionsCollection(args.options);

            Options.Compositeview = new Options.CompositeView({collection:Options.Collection});

            Options.Channel.reply("get:root", function(){
                return Options.Compositeview;
            });

        });

        return Options;
    };

    return OptionsConstructor;

});
