define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/itemlist/templates/itemlist.html"
], function (Marionette, Radio, Shim, ItemListTemplate) {
    var ItemListConstructor = function(channelName){

        var ItemList = new Marionette.Application();
        ItemList.Channel = Radio.channel(channelName);

        ItemList.ItemView = Marionette.ItemView.extend({
            tagName: "li",
            className: "item",
            template: _.template(ItemListTemplate),
            onShow: function(){
                this.styling();
            },
            events: {
                "click": "changeLenguage"
            },
            initialize: function(){
                this.listenTo(this.model, "change:active", this.updateActive);
            },
            styling: function(){
                if(this.model.get("active")){
                    this.$el.css({"opacity":"1"});
                }else{
                    this.$el.css({"opacity":"0.4"});
                }
            },
            changeLenguage: function(){
                this.model.set({active: true});
            },
            updateActive: function(){
                if(this.model.get("active") === true){
                    console.log("ItemList.thisParent: ", ItemList.thisParent);

                    ItemList.Channel.trigger("change:active", {
                        model: this.model,
                        parent: ItemList.thisParent
                    });
                }
                this.styling();
            }
        });

        ItemList.CollectionView = Marionette.CollectionView.extend({
            tagname: "div",
            className: "itemlist",
            template: _.template("<ul></ul>"),
            childView: ItemList.ItemView,
            checkActive: function(model){
                this.collection.each(function(m){
                    if(model.cid != m.cid){
                        m.set({active: false});
                    }

                });
            },
            initialize: function(){
                // console.log("this.collection: ", this.collection.where({nombre:"idioma"}));
            }
        });

        ItemList.on("start", function(args){
            var theCollection = args.modalStuff;
            ItemList.thisParent = theCollection.findWhere({nombre: args.app});
            var thisData = ItemList.thisParent.get("modal")["data"];

            var collection = Backbone.Collection.extend();
            ItemList.collection = new collection(thisData);

            var thisCollection = Backbone.Collection.extend(thisData);

            ItemList.collectionview = new ItemList.CollectionView({
                collection: ItemList.collection
            });
            console.log("ItemList.collectionview: ", ItemList.collectionview);

            ItemList.Channel.reply("get:root", function(){
                return ItemList.collectionview;
            });

            ItemList.Channel.on("change:active", function(args){
                ItemList.collectionview.checkActive(args.model);

            });

        });

        return ItemList;
    };

    return ItemListConstructor;

});
