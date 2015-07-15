define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/contextmenu/templates/contextmenu.html"
], function (Marionette, Radio, Shim, OptionsContextMenuTemplate) {
    var ContextMenuConstructor = function(channelName){

        var ContextMenu = new Marionette.Application();
        ContextMenu.Channel = Radio.channel(channelName);

        var ItemView = Marionette.ItemView.extend({
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
                ContextMenu.Channel.trigger("hide:contextmenu");
                ContextMenu.Channel.trigger("action:selected", {
                    action: action
                });
            }
        });

        var CollectionView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "contextmenu",
            childView: ItemView,
            onShow: function(){
                this.hideContextMenu();
            },

            hideContextMenu: function(){
                this.$el.css({
                    "z-index": -9,
                    "top": "-100%",
                    "left": "-100%"
                });
            },

            showContextMenu: function(){
                this.setposition();
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
            }
        });

        ContextMenu.on("start", function(args){
            ContextMenu.posX = 0;
            ContextMenu.posY = 0;

            ContextMenu.CollectionView = new CollectionView({collection: args.options});

            ContextMenu.Channel.reply("get:root", function(){
                return ContextMenu.CollectionView;
            });

            ContextMenu.Channel.on("hide:contextmenu", function(){
                ContextMenu.CollectionView.hideContextMenu();
            });

            ContextMenu.Channel.on("show:contextmenu", function(args){
                ContextMenu.posX = args.pos.left;
                ContextMenu.posY = args.pos.top;
                ContextMenu.CollectionView.showContextMenu();
            });

            ContextMenu.Channel.reply("get:context:selector", function(){
                return ContextMenu.CollectionView.$el;
            });
        });

        return ContextMenu;
    };

    return ContextMenuConstructor;

});
