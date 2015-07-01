define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "../../appmodal/js/appmodal",
    "../../itemlist/js/itemlist",
    "../../selector/js/selector",
    "text!assets/appbar/templates/escenarios.html",
    "text!assets/appbar/templates/menuapps.html",
    "text!assets/appbar/templates/messages.html",
    "text!assets/appbar/templates/loginbar.html",
    "text!assets/appbar/templates/idioma.html",
], function (Marionette, Radio, Shim, AppModal, ItemList, Selector, EscenariosTemplate, MenuAppsTemplate, MessagesTemplate, LoginBarTemplate, IdiomaTemplate) {
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
                    case "idioma":
                        return _.template(IdiomaTemplate);
                        break;
                }
            },
            templateHelpers: function(){
                var active = _.findWhere(this.model.get("modal").data, {active: true});

                switch(this.model.get("nombre")){
                    case "escenarios":
                        return{
                            escenario: function(){
                                return active.name;
                            }()
                        }
                    case "idioma":
                        return{
                            id: function(){
                                return active.id;
                            }(),
                            nombre: function(){
                                return active.nombre;
                            }(),
                            sigla: function(){
                                return active.sigla;
                            }(),
                            icon: function(){
                                return active.icon;
                            }()
                        }
                        break;
                }
            },
            events: {
                "click": "OpenAppModal"
            },
            OpenAppModal: function(event){
                var modalStuff = this.model.get("modal");
                var eventId = event.target.id;

                AppBar.Channel.trigger("show:AppModal", {
                    top: 67,
                    right: 20,
                    width: 400,
                    height: 250,
                    target: eventId
                });
                // show content modal
                AppBar.Channel.trigger("show:AppModal:content", {
                    modal: modalStuff,
                    appName: event.target.id
                });
            },
            modelEvents: {
                'change': 'fieldsChanged'
            },
            fieldsChanged: function() {
                this.render();
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
                // add region for content modal
                var contentRegion = new Marionette.RegionManager();
                contentRegion.addRegions({
                  contentmodalregion: ".appmodal .content"
                });

                // show modal content
                switch(args.modal.asset){
                    case "itemlist":
                        var contentmodal = new ItemList("contentmodal");
                        var contentmodalChannel = contentmodal.Channel;

                        contentmodal.start({
                            // modalStuff: args.modal.data
                            modalStuff: AppBar.collection,
                            app: args.appName
                        });

                        var ContentmodalView = contentmodalChannel.request("get:root");
                        contentRegion.get("contentmodalregion").show(ContentmodalView);
                        break;

                    case "selector":
                        var contentmodal = new Selector("selector");
                        var contentmodalChannel = contentmodal.Channel;
                        // parse data
                        var modaldata = args.modal.data;
                        var thedata = [];
                        _.each(modaldata, function(item){
                            var item = {
                                id: item.id,
                                name: item.name,
                                content: item.comment,
                                data1: item.procesos,
                                data2: item.mejor
                            }
                            thedata.push(item);
                        });
                        // optionArray.push({id: 17, name: "mosca", content: "azul"});

                        // create collection
                        var datacollection = Backbone.Collection.extend();
                        var selectorcollection = new datacollection(thedata);

                        contentmodal.start({
                            childTemplate: "EscenarioOptionTemplate",
                            separator: "__",
                            displayKeys: ["name", "content"],
                            models: selectorcollection,
                        });

                        var ContentmodalView = contentmodalChannel.request("get:root");
                        contentRegion.get("contentmodalregion").show(ContentmodalView);

                        break;
                }




                //
                AppBar.Channel.listenTo(contentmodalChannel, "change:active", function(args){

                    var dataModal = AppBar.collection.findWhere({nombre: args.parent.get("nombre")}).get("modal");
                    var modalData = dataModal.data;
                    modalData.forEach(function(modal, i){
                        if( modalData[i].nombre == args.model.get("nombre") ){
                            modalData[i].active = true;
                        }else{
                            modalData[i].active = false;
                        }
                    });
                    dataModal.data = modalData;
                    var appNombre = AppBar.collection.findWhere({nombre: args.parent.get("nombre")});
                    appNombre.set({"modal":dataModal});

                    appNombre.trigger("change");

                });
            });


        });

        return AppBar;
    };

    return AppBarConstructor;

});
