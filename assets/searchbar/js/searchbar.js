define([
	"backbone.marionette",
	"backbone.radio",
	"radio.shim",
    "./../../typeahead/js/typeahead",
    "text!./../templates/searchbar.html",
], function (Marionette, Radio, Shim, TypeAhead, SearchBarTemplate) {

	var SearchBarConstructor = function(channelName){

        var SearchBar = new Marionette.Application();
        SearchBar.Channel = Radio.channel(channelName);

        var SearchBarView = Marionette.LayoutView.extend({
            tagName: "div",
            className: "searchbar",
            template: _.template(SearchBarTemplate),
            regions: {
                left: ".left"
            },
            onShow: function(){
                // collection
                var collection = Backbone.Collection.extend();
                var animals = [
                    {
                        "name":"perro",
                        "color": "red",
                        "id":"1"
                    },
                    {
                        "name":"cobra",
                        "color": "green",
                        "id":"2"
                    },
                    {
                        "name":"castor",
                        "color": "brown",
                        "id":"3"
                    }
                ]
                var optionCollection = new collection(animals);
                // get typeahead
                var typeahead = new TypeAhead({
                    channelName : "type1"
                });

                typeahead.start({
                    models: optionCollection,
                    displayKeys: ["name","color"]
                });

                var typeaheadview = typeahead.Channel.request("get:root");
                // console.log(this.getRegion("typeahead"));
                this.getRegion("left").show(typeaheadview);
            }
        });

        SearchBar.RootView = new SearchBarView();

        SearchBar.Channel.reply("get:root", function(){
            return SearchBar.RootView;
        });

        return SearchBar;
    };

    return SearchBarConstructor;
});
