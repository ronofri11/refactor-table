define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/notification/templates/notification.html",
    "text!assets/notification/templates/notifications.html"
], function (Marionette, Radio, Shim, NotificationTemplate, NotificationsTemplate) {

    var NotificationConstructor = function(channelName){
        var Notification = new Marionette.Application();
        Notification.Channel = Radio.channel(channelName);

        Notification.ItemView = Marionette.ItemView.extend({
            tagName: "div",
            className: "notification",
            template: _.template(NotificationTemplate),
            onRender: function(){
                this.behaviour();
            },
            behaviour: function(){
                var behaviour = this.model.get("behaviour");
                if(behaviour == "auto"){
                    this.$el.delay(2500).fadeOut();
                }
            }
        });

        Notification.CompositeView = Marionette.CollectionView.extend({
            // el: ".notifications",
            tagName: "div",
            template: _.template(NotificationsTemplate),
            childView: Notification.ItemView
        });

        Notification.on("start", function(){
            var collection = Backbone.Collection.extend();
            Notification.Collection = new collection([]);

            Notification.CollectionView = new Notification.CompositeView({
                collection: Notification.Collection
            });

            // Notification.CollectionView.render();

            Notification.Channel.reply("get:root", function(){
                return Notification.CollectionView;
            });

            Notification.Channel.comply("notify", function(args){
                var state;
                if(args.state === undefined){
                    state = "show";
                }
                else{
                    state = args.state;
                }
                var behaviour;
                if(args.behaviour === undefined){
                    behaviour = "auto";
                }
                else{
                    behaviour = args.behaviour;
                }
                var newNotification = {
                    message: args.message,
                    type: args.type,     // succes, error, warning, info
                    state: state,      // show
                    behaviour: behaviour   // auto, hide
                }

                Notification.Collection.add(newNotification);


            });

        });

        return Notification;
    }

    return NotificationConstructor;

});
