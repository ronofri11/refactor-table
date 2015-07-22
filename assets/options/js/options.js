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
                            return "<label><input type=\"checkbox\" name=\"" + self.model.get("name") + "\">" + self.model.get("content") + "</label>"
                            break;
                    }
                  }()
                };
            },
            events: {
                "change": "uploadData"
            },
            uploadData: function(event){
                var type = this.$el.find("input[type=checkbox]").prop("type");
                switch(type){
                    case "checkbox":
                        var val = this.$el.find("input[type=checkbox]").prop('checked');
                        this.model.set( {"value": val } );
                        break;
                }
            },
            initialize: function(){
                this.model.set({"value":false});
            }
        });

        Options.CompositeView = Marionette.CompositeView.extend({
            tagName: "div",
            className: "options",
            childView: Options.ItemView,
            childViewContainer: ".options",
            template: _.template(OptionsTemplate),
            getActiveOptions: function(){
                return this.collection.where({"value":true});
            },
            initialize: function(){
                var self = this;
                this.listenTo(this.collection, "change:value", function(){
                    Options.Channel.trigger("options:change", {
                        activeOptions: self.getActiveOptions()
                    });
                });
            }

        });

        Options.on("start", function(args){

            var optionsCollection = Backbone.Collection.extend();
            Options.Collection = new optionsCollection(args.options);

            Options.Compositeview = new Options.CompositeView({collection:Options.Collection});

            Options.Channel.reply("get:root", function(){
                return Options.Compositeview;
            });

            Options.Channel.reply("get:active:options", function(){
                return Options.Compositeview.getActiveOptions();
            });

        });

        return Options;
    };

    return OptionsConstructor;

});
