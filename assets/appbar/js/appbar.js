define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "../../appmodal/js/appmodal",
    "text!assets/appbar/templates/escenarios.html",
    "text!assets/appbar/templates/menuapps.html",
    "text!assets/appbar/templates/messages.html",
    "text!assets/appbar/templates/loginbar.html",
], function (Marionette, Radio, Shim, AppModal, EscenariosTemplate, MenuAppsTemplate, MessagesTemplate, LoginBarTemplate) {
    var AppBarConstructor = function(channelName){

        var AppBar = new Marionette.Application();
        AppBar.Channel = Radio.channel(channelName);

        AppBar.ItemView = Marionette.ItemView.extend({
            tagName: "div",
            className: "item",
            getTemplate: function(){
                switch(this.model.get("nombre")){
                    case "escenarios":
                        return _.template(EscenariosTemplate);
                        break;
                    case "menuapps":
                        return _.template(MenuAppsTemplate);
                        break;
                    case "messages":
                        return _.template(MessagesTemplate);
                        break;
                    case "loginbar":
                        return _.template(LoginBarTemplate);
                        break;
                }
            },
            events: {
                "click": "OpenAppModal"
            },
            OpenAppModal: function(event){
                var modalStuff = this.model.get("modal");

                console.log("top: ", event.target.id);
                AppBar.Channel.trigger("show:AppModal", {
                    top: 67,
                    right: 20,
                    width: 400,
                    height: 250,
                    target: event.target.id
                });
                // show content modal
                AppBar.Channel.trigger("show:AppModal:content", {
                    modal: modalStuff
                });
            }
        });

        AppBar.CollectionView = Marionette.CollectionView.extend({
            tagName: "div",
            className: "appbar",
            template: _.template("<ul></ul>"),
            childView: AppBar.ItemView
        });

        AppBar.on("start", function(args){
            var outerRegion = args.region;

            AppBar.collection = new Backbone.Collection(args.items);
            console.log(AppBar.collection);

            AppBar.collectionview = new AppBar.CollectionView({
                collection: AppBar.collection,
            });

            AppBar.Channel.reply("get:root", function(){
                return AppBar.collectionview;
            });

            AppBar.Channel.on("show:AppModal", function(args){
                // show app modal
                var appmodal = new AppModal("appmodal");
                var appmodalChannel = appmodal.Channel;
                appmodal.start({
                    settings: args
                });
                var appmodalView = appmodalChannel.request("get:root");

                outerRegion.show(appmodalView);
            });

            AppBar.Channel.on("show:AppModal:content", function(args){
                // show modal content
                console.log("modal content: ", args.modal)
            });
        });

        return AppBar;
    };

    return AppBarConstructor;

});
