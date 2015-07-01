define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/appmodal/templates/appmodal.html"
], function (Marionette, Radio, Shim, AppModalTemplate) {
    var AppModalConstructor = function(channelName){

        var AppModal = new Marionette.Application();
        AppModal.Channel = Radio.channel(channelName);

        AppModal.LayoutView = Marionette.LayoutView.extend({
            // el: "body",
            // replaceElement: true,
            className: "appmodal",
            template: _.template(AppModalTemplate),
            regions: {
                content: ".content"
            },
            onRender: function(options){
                this.setPosition();
                this.setDimensions();
                this.clickout();
            },
            setPosition: function(){
                this.$el.css({
                    "float": this.model.get("float"),
                    "top": this.model.get("top"),
                    "right": this.model.get("right")
                })
            },
            setDimensions: function(){
                this.$el.css({
                    "width": this.model.get("width"),
                    "height": this.model.get("height")
                })
            },
            onShow: function(){
                this.setTriangle();
                AppModal.Channel.trigger("appModal:ready", {
                    region: AppModal.getRegion("content")
                });
            },
            setTriangle: function(){
                var target = $( "#" + this.model.get("target") );
                var triangleLeft = ( target.offset().left + target.outerWidth()/2 ) - this.$el.offset().left - this.$el.find(".triangle").outerWidth()/2 ;
                // var triangleLeft = this.$el.offset().left;

                this.$el.find(".triangle").css({"left": triangleLeft});
            },
            clickout: function(){
                $(document).click(function(event) {
                    if( $(event.target).is(".appmodal") ){

                    }else{
                        if ($(event.target).parents(".appmodal").length === 0 && $(event.target).parents(".appbar").length === 0) {
                            $(".appmodal").hide();
                        }
                    }
                });
            }
        });

        AppModal.on("start", function(args){

            AppModal.model = Backbone.Model.extend();

            AppModal.layoutView = new AppModal.LayoutView({model: new AppModal.model(args.settings)});

            AppModal.Channel.reply("get:root", function(){
                return AppModal.layoutView;
            });

        });

        return AppModal;
    };

    return AppModalConstructor;

});
