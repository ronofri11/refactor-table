define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "./../../searchbar/js/searchbar",
    "text!./../templates/cardsform.html",
], function (Marionette, Radio, Shim, SearchBar, CardsFormTemplate) {

    var CardsFormConstructor = function(channelName){

        var CardsForm = new Marionette.Application();

        CardsForm.Channel = Radio.channel(channelName);

        var CardsFormView = Marionette.LayoutView.extend({
            tagName: "div",
            className: "cardsform",
            template: _.template(CardsFormTemplate),
            regions: {
                top: ".top",
                bottom: ".bottom"
            },
            onShow: function(){
                this.setDimensions();

                // get searchbar
                var searchbar = new SearchBar({
                    channelName : "search1"
                });
                var searchbarview = searchbar.Channel.request("get:root");
                this.getRegion("top").show(searchbarview);

            },
            setDimensions: function(){
                var containerHeight = this.$el.parent().innerHeight();
                var topHeight = this.$el.find(".top").outerHeight();
                var bottomPadding = parseInt( this.$el.find(".bottom").css("padding") ) * 2;
                var bottomHeight = containerHeight - topHeight - bottomPadding;
                this.$el.find(".bottom").height(bottomHeight);
            }
        });

        CardsForm.RootView = new CardsFormView();

        CardsForm.Channel.reply("get:root", function(){
            return CardsForm.RootView;
        });

        return CardsForm;

    };

    return CardsFormConstructor;
});
