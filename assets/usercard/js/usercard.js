define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/usercard/templates/usercard.html"
], function (Marionette, Radio, Shim, UserCardTemplate) {
    var UserCardConstructor = function(channelName){

        var UserCard = new Marionette.Application();
        UserCard.Channel = Radio.channel(channelName);

        UserCard.LayoutView = Marionette.LayoutView.extend({
            tagname: "div",
            className: "usercard",
            template: _.template(UserCardTemplate)
        });

        UserCard.on("start", function(args){

            var data = args.modalStuff
            usermodel = Backbone.Model.extend();
            UserCard.Model = new usermodel(data);

            UserCard.layoutView = new UserCard.LayoutView({model:UserCard.Model});

            UserCard.Channel.reply("get:root", function(){
                return UserCard.layoutView;
            });

        });

        return UserCard;
    };

    return UserCardConstructor;

});
