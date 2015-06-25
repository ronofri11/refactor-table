define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "../assets/menu/js/menu",
    "../assets/appbar/js/appbar",
    "text!templates/maintainer.html",
    "text!templates/modes.html",
    "text!templates/regions/fullpage.html",
    "text!templates/regions/columnHeaderMainflip.html"
], function (Marionette, Radio, Shim, Menu, AppBar, TemplateMaintainer, TemplateModes, FullPageTemplate, ColumnHeaderMainflip) {
    // Enviroment
    var App = new Marionette.Application();

    // Example div target
    var ExampleLayout = Marionette.LayoutView.extend({
        el: "#mainRegion",
        template: _.template("<div id=\"somediv\" style=\"width:100%;\"></div>"),
        className: "component"
    });

    // Main menu region
    var Target = new ExampleLayout();
    Target.addRegion("main", "#somediv");
    var menuregion = Marionette.Region.extend({
        el: "#menucontainer"
    });
    Target.addRegion("mainMenu", new menuregion());
    Target.render();

    // Appbar region
    var Target2 = new ExampleLayout();
    Target2.addRegion("headerRight", "header .right");
    var appBarregion = Marionette.Region.extend({
        el: "header .right"
    });
    Target2.addRegion("appbar", new appBarregion());
    Target2.render();

    // Outer region
    var Target3 = new ExampleLayout();
    Target3.addRegion("outer", ".outer");
    var outerRegion = Marionette.Region.extend({
        el: ".outer"
    });
    Target3.addRegion("outer", new outerRegion());
    Target3.render();

    // Maintainer Module!
    App.module("Maintainer", function(Maintainer, App){
        this.startWithParent = false;

        // Modes stuff
        var ModeView = Marionette.ItemView.extend({
            tagName: "li",
            template: _.template("<span></span>"),
            onRender: function(){
                this.$el.attr( "id" , this.model.get("name") );
                this.$el.addClass( this.model.get("state") );
                switch( this.model.get("active") ){
                    case true:
                        this.$el.addClass("hide");
                        break;
                    case false:
                        this.$el.removeClass("hide");
                        break;
                }
            }
        });

        var ModesView = Marionette.CompositeView.extend({
            childView: ModeView,
            template: _.template(TemplateModes),
            childViewContainer: ".options",
            templateHelpers: function(){
                var modeActive = this.collection.findWhere({
                                    "active": true
                                 }).toJSON();
                return {
                    modeActiveName: modeActive.name,
                    modeActiveState: modeActive.state,
                };
            }
        });

        // Maintainer stuff
        var MaintainerModel = Backbone.Model.extend();
        var MaintainerModes = Backbone.Collection.extend();
        var MaintainerLayout = Marionette.LayoutView.extend({
            tagName: "div",
            className: "maintainer",
            template: _.template(TemplateMaintainer),
            regions: {
                headerLeft: ".header .left",
                headerRight: ".header .right",
                container: ".container",
                outer: ".outer"
            },

            events: {
                "mouseenter .modes" : "modeButton",
                "mouseleave .modes" : "hideOptions",
                "click .modes .options li span": "changeMode",
                "click .actionButton": "action"
            },

            modeButton: function(event){
                this.$el.find(".options").toggleClass("hide");
            },

            hideOptions: function(event){
                this.$el.find(".options").addClass("hide");
            },

            changeMode: function(event){
                // change modes active options
                var ModeName = $(event.target).parent().attr("id");
                var ModeState = $(event.target).parent().attr("class");

                Maintainer.Channel.command("set:layout", {
                    modeName: ModeName
                });

                // actionButton
                var activeMode = Maintainer.modes.findWhere({"active": true});
                var activeState = activeMode.get("state");
                this.$el.find(".actionButton li").removeClass();
                this.$el.find(".actionButton li").addClass(activeState);

            },

            action: function(event){
                var eventName = "action:button:" + event.type;
                Maintainer.Channel.trigger(eventName, {eventName: eventName});
            },


            broadcastEvent: function(event){

            },

            onShow: function()
            {
                // set Modes
                Maintainer.ModeButtons = new ModesView({collection: Maintainer.modes});
                Maintainer.Layout.getRegion("modes").show(Maintainer.ModeButtons);

                // start regions
                var Regions = App.module("Maintainer.Regions");
                var regionsChannelName = Maintainer.Channel.channelName + "_regions";
                Regions.start({
                    channelName: regionsChannelName,
                    modes: Maintainer.modes
                });

                // actionButton
                var activeMode = Maintainer.modes.findWhere({"active": true});
                var activeState = activeMode.get("state");
                this.$el.find(".actionButton li").addClass(activeState);

                // tunes region channel
                var regionsChannel = Radio.channel(regionsChannelName);
                var regionsView = regionsChannel.request("get:regions:root");

                // show regions
                Maintainer.Layout.getRegion("container").show(regionsView);

                // re-renderizar modes
                Maintainer.Channel.listenTo(regionsChannel, "change:mode", function(args){
                    Maintainer.ModeButtons.render();
                });
            }


        });

        this.on("start", function(options){

            var dataMaintainer = options.dataMaintainer;
            this.Channel = Radio.channel(options.channelName);

            this.model = new MaintainerModel(dataMaintainer);
            this.Layout = new MaintainerLayout({model: this.model});

            // add region and create Modes instances
            var modesRegion = Marionette.Region.extend();
            var modeSelector = this.Layout.$el.find(".modes");
            this.Layout.addRegion("modes", modeSelector);
            this.modes = new MaintainerModes(this.model.get("modes"));

            //publish module API through Radio
            this.Channel.reply("get:maintainer:root", function(){
                return Maintainer.Layout;
            });

            // update mode
            this.Channel.comply("set:layout", function(args){
                var NewActiveMode = Maintainer.modes.findWhere({ "name": args.modeName });
                NewActiveMode.set("active", true);
            });


        });


    });


    // Regions Submodule!
    App.module("Maintainer.Regions", function(Regions, App){
        this.startWithParent = false;

        var RegionsLayout = Marionette.LayoutView.extend({
            initialize: function(options){
                this.modes = options.modes;
                this.listenTo(this.modes, "change:active", this.changeActiveMode);
            },
            changeActiveMode: function(args){
                this.modes.each(function(mode){
                    if( mode.get("name") !== args.get("name") ){
                        mode.set({ "active": false }, { silent: true });
                    }
                });
                this.render();
                Regions.Channel.trigger("change:mode", {
                    modeName: args.get("name")
                });
            },
            getTemplate: function(){
                var modes = this.modes;
                var defaultMode = modes.findWhere({
                    "active": true
                });
                var layout;
                if(defaultMode !== undefined){
                    layout = defaultMode.get("layout");
                }

                var template;
                switch(layout){
                    case "fullpage":
                        template = _.template(FullPageTemplate);
                        break;
                    case "columnHeaderMainflip":
                        template = _.template(ColumnHeaderMainflip);
                        break;
                }
                return template;
            },
            regions: {
                main: ".region .main",
                columnLeft: ".region .columnLeft",
                header: ".region .header",
                mainflip: ".region .mainflip"
            }
        });

        this.on("start", function(options){
            this.Channel = Radio.channel(options.channelName);
            this.Layout = new RegionsLayout({modes: options.modes});

            //publish module API through Radio
            this.Channel.reply("get:regions:root", function(){
                return Regions.Layout;
            });
        });
    });

    // Action!
    App.on("start", function(options){
        App.Channel = Radio.channel(options.channelName);

        var Maintainer = App.module("Maintainer");
        var maintainerChannelName = options.channelName + "_maintainer";

        Maintainer.start({
            dataMaintainer: options.dataMaintainer,
            channelName: maintainerChannelName
        });

        var maintainerChannel = Radio.channel(maintainerChannelName);
        var maintainerView = maintainerChannel.request("get:maintainer:root");

        Target.main.show(maintainerView);


        App.Channel.on("change:layout", function(args){
            maintainerChannel.command("set:layout", args);
        });

        App.Channel.listenTo(maintainerChannel, "action:button:click", function(){
            alert("click action desactivado (no modify)");
        });






        // show main menu
        // data items
        var dataitems = [
            {
                nombre: "infraestructura",
                icon: "infraestructura",
                subitems: [
                    {
                        nombre: "sedes",
                        link: "#"
                    },
                    {
                        nombre: "edificios",
                        link: "#"
                    },
                    {
                        nombre: "salas",
                        link: "#"
                    }
                ]
            },
            {
                nombre: "institución",
                icon: "institucion",
                subitems: [
                    {
                        nombre: "facultades",
                        link: "#"
                    },
                    {
                        nombre: "escuelas",
                        link: "#"
                    },
                    {
                        nombre: "regímenes",
                        link: "#"
                    },
                    {
                        nombre: "carreras",
                        link: "#"
                    }
                ]
            },
            {
                nombre: "agenda",
                icon: "agenda",
                subitems: [
                    {
                        nombre: "periodos",
                        link: "#"
                    },
                    {
                        nombre: "semanas",
                        link: "#"
                    },
                    {
                        nombre: "bloques",
                        link: "#"
                    }
                ]
            },
            {
                nombre: "programación",
                icon: "programacion",
                subitems: [
                    {
                        nombre: "asignaturas",
                        link: "#"
                    },
                    {
                        nombre: "demandas",
                        link: "https://www.youtube.com/watch?v=oHg5SJYRHA0"
                    }
                ]
            },
            {
                nombre: "planta docente",
                icon: "profesor",
                subitems: [
                    {
                        nombre: "profesores",
                        link: "#"
                    },
                    {
                        nombre: "oferta de profesores",
                        link: "#"
                    }
                ]
            }
        ]

        // start menu
        var menu = new Menu("menu");
        var menuChannel = menu.Channel;
        menu.start({
            items : dataitems  
        });
        var menuView = menuChannel.request("get:root");
        Target.getRegion("mainMenu").show(menuView);


        // show Appbar
        // json scenarios
        var scenarios = [{"id":5,"environment":"planner","database":"darwined_siglo21_planner_5","name":"20151 - SC","comment":"Escenario Base con Sede \u00danica","active":false,"enabled":true,"created":"2014-11-05 09:52:17","modified":"2014-11-05 09:52:31"},{"id":6,"environment":"planner","database":"ko","name":"esc2","comment":"otro","active":false,"enabled":true,"created":"2014-12-17 00:00:00","modified":"2014-12-17 00:00:00"},{"id":7,"environment":"planner","database":"ko","name":"esc2","comment":"otro","active":false,"enabled":true,"created":"2014-12-17 00:00:00","modified":"2014-12-17 00:00:00"},{"id":8,"environment":"planner","database":"ko","name":"esc3","comment":"otro","active":false,"enabled":true,"created":"2014-12-17 00:00:00","modified":"2014-12-17 00:00:00"},{"id":9,"environment":"planner","database":"ko","name":"esc4","comment":"otro","active":false,"enabled":true,"created":"2014-12-17 00:00:00","modified":"2014-12-17 00:00:00"},{"id":10,"environment":"planner","database":"ko","name":"esc5","comment":"otro","active":false,"enabled":true,"created":"2014-12-17 00:00:00","modified":"2014-12-17 00:00:00"},{"id":11,"environment":"planner","database":"ko","name":"esc6","comment":"otro","active":false,"enabled":true,"created":"2014-12-17 00:00:00","modified":"2014-12-17 00:00:00"},{"id":12,"environment":"planner","database":"ko","name":"esc7","comment":"otro","active":false,"enabled":true,"created":"2014-12-17 00:00:00","modified":"2014-12-17 00:00:00"},{"id":13,"environment":"planner","database":"darwined_uniminuto_planner_23","name":"UNIMINUTO","comment":null,"active":false,"enabled":true,"created":"2015-02-19 00:00:00","modified":"2015-02-20 00:00:00"},{"id":14,"environment":"planner","database":"darwined_aiep_barriouniversitario_10","name":"AIEP","comment":"jojo","active":false,"enabled":true,"created":"2015-03-20 00:00:00","modified":"2015-03-27 00:00:00"},{"id":15,"environment":"planner","database":"darwined_fuaa_medellin_43","name":"fuaa medellin","comment":null,"active":false,"enabled":true,"created":"2015-02-19 00:00:00","modified":"2015-02-20 00:00:00"},{"id":16,"environment":"planner","database":"darwined_upn_planner_2","name":"upn 2 2015","comment":"domingos proceso 32","active":true,"enabled":true,"created":"2015-03-20 00:00:00","modified":"2015-03-27 00:00:00"}]
        var active_scenario = _.where(scenarios, {active: true});

        // data
        var dataAppbar = [
            {
                nombre: "escenarios",
                active_scenario: active_scenario[0].name,
                template: "escenarios",
                modal: {
                    asset: "selector",
                    template: "escenarios",
                    scenarios: scenarios
                }
            },
            {
                nombre: "menuapps",
                icon: "menuapps",
                template: "menuapps",
                modal: {
                    asset: "listItems",
                    template: "menuapps",
                    apps: [
                        {
                            nombre: "mantenedores",
                            active: true,
                            icon: "mantenedores"
                        },
                        {
                            nombre: "procesos",
                            active: false,
                            icon: "procesos"
                        }
                    ]
                }
            },
            {
                nombre: "messages",
                icon: "messages",
                template: "messages",
                modal: {
                    asset: "listItems",
                    template: "messages",
                    messages: [
                        {
                            id: "r654r",
                            content: "mensaje1",
                            type: "message",
                            from: "user12"
                        },
                        {
                            id: "re5re",
                            content: "mensaje2",
                            type: "warning",
                            from: "system"
                        },
                        {
                            id: "o988w",
                            content: "mensaje2",
                            type: "succes",
                            from: "system"
                        }
                    ]
                }
            },
            {
                nombre: "loginbar",
                active_user: {
                    nombre: "Felipe Meneses",
                    thumbnail: "4908651.png"
                },
                template: "escenarios",
                modal: {
                    asset: "userstatus",
                    template: "userstatus",
                    info: {
                        id: "8y87a6y8a7",
                        nombre: "Felipe Meneses",
                        thumbnail: "4908651.png",
                        profile: "admin"
                    }
                }
            }
        ];

        // start appbar
        var appbar = new AppBar("appbar");
        var appbarChannel = appbar.Channel;
        appbar.start({
            items : dataAppbar,
            region: Target3.getRegion("outer")
        });
        var appbarView = appbarChannel.request("get:root");
        Target2.getRegion("appbar").show(appbarView);
    });

    return App;
});
