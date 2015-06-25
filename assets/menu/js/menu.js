define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/menu/templates/itemmenu.html",
    "text!assets/menu/templates/menu.html"
], function (Marionette, Radio, Shim, ItemMenuTemplate, MenuTemplate) {
    var MenuConstructor = function(channelName){

        var Menu = new Marionette.Application();
        Menu.Channel = Radio.channel(channelName);

        Menu.ItemView = Marionette.ItemView.extend({
            tagName: "li",
            className: "item",
            template: _.template(ItemMenuTemplate),
            events: {
                "mouseenter > .icon": "showCategoria",
                "mouseleave > .icon": "hideCategoria",
                "mouseenter > .categoria": "onCategoria",
                "mouseleave > .categoria": "leaveCategoria"
            },
            showCategoria: function(event){
                this.$el.find(".categoria").show();
            },
            hideCategoria: function(event){
                this.$el.find(".categoria").hide();
            },
            onCategoria: function(event){
                event.preventDefault();
                this.$el.find(".categoria").show();
            },
            leaveCategoria: function(event){
                event.preventDefault();
                this.$el.find(".categoria").hide();
            },
            onRender: function(){
                var icon = this.model.get("icon");
                this.$el.find(".icon").addClass(icon);
                console.log(icon);
            }
        });

        Menu.CompositeView = Marionette.CompositeView.extend({
            tagName: "nav",
            className: "menu",
            template: _.template(MenuTemplate),
            childView: Menu.ItemView,
            childViewContainer: ".items"
        });

        Menu.on("start", function(args){

            Menu.collection = new Backbone.Collection(args.items);

            Menu.compositionview = new Menu.CompositeView({
                collection: Menu.collection,
            });

            Menu.Channel.reply("get:root", function(){
                return Menu.compositionview;
            });
        });

        return Menu;
    };

    return MenuConstructor;

});
