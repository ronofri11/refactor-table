define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/contextmenu/templates/contextmenu.html"
], function (Marionette, Radio, Shim, OptionsContextMenuTemplate) {
    var ContextMenuConstructor = function(channelName){

        var ContextMenu = new Marionette.Application();
        ContextMenu.Channel = Radio.channel(channelName);

        ContextMenu.ItemView = Marionette.ItemView.extend({
            tagname: "div",
            className: "option",
            template: _.template(OptionsContextMenuTemplate),
            events: {
                "click":"clicked"
            },
            clicked: function(event){
                event.stopPropagation();
                event.preventDefault();
                var action = this.model.get("action");
                ContextMenu.Channel.trigger("get:action", {
                    action: action
                });
            }
        });

        ContextMenu.CollectionView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "contextmenu",
            childView: ContextMenu.ItemView,
            onShow: function(){
                this.setposition();
                this.clickout();
            },
            setposition: function(){
                var top = ContextMenu.posY;
                var left = ContextMenu.posX;
                var height = this.$el.width();
                var width = this.$el.width();

                // pos vertical
                if( top+height > $(window).height() ){
                    this.$el.css({
                        "top": top - height/2 - 10 + "px"
                    });
                }else{
                    this.$el.css({
                        "top": top + 10 + "px"
                    });
                }
                // pos horizontal
                if( left+width > $(window).width() ){
                    this.$el.css({
                        "left": left - width/2 - 10 + "px"
                    });
                }else{
                    this.$el.css({
                        "left": left + 10 + "px"
                    });
                }
                // show contexmenu
                this.$el.css({
                    "z-index": 999
                });
            },
            hide: function(){
                this.$el.css({
                    "z-index": -9
                });
            },
            clickout: function(){
                var self = this;
                $(document).click(function(event) {
                    if( $(event.target).is(".contextmenu ") ){

                    }else{
                        if ($(event.target).parents(".contextmenu").length === 0 && $(event.target).parents(".contextmenuRegion").length === 0) {
                            self.hide();
                        }
                    }
                });
            }
        });

        ContextMenu.on("start", function(args){

            ContextMenu.posX = args.pos.left;
            ContextMenu.posY = args.pos.top;

            ContextMenu.Collectionview = new ContextMenu.CollectionView({collection:args.options});

            ContextMenu.Channel.reply("get:root", function(){
                return ContextMenu.Collectionview;
            });

            ContextMenu.Channel.on("contextmenu:hide", function(){
                ContextMenu.Collectionview.hide();
            });

            ContextMenu.Channel.reply("get:context:selector", function(){
                return ContextMenu.Collectionview.$el;
            });

        });

        return ContextMenu;
    };

    return ContextMenuConstructor;

});
