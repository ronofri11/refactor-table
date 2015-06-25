define([
	"backbone.marionette",
	"backbone.radio",
	"radio.shim",
    "assets/store/js/store",
    "assets/menu/js/menu",
    "assets/appbar/js/appbar",
    "maintainer",
    "text!templates/apptemplate.html"
], function (Marionette, Radio, Shim, Store, Menu, AppBar, Maintainer, AppTemplate) {

	var AppConstructor = function(channelName){
        var App = new Marionette.Application();
        App.Channel = Radio.channel(channelName);

        var LayoutView = Marionette.LayoutView.extend({
            className: "mantenedores",
            template: _.template(AppTemplate),
            regions: {
                "mainRegion": "#mainRegion",
                "menuContainer": "#menuContainer",
                "appBar": "header > .right",
                "outer": ".outer"
            }
        });

        App.startStore = function(url){
            var store = new Store("store");
            var storeChannel = store.Channel;

            store.start({url: url});

            var rows;
            var modelName = "Curso";

            App.Channel.listenTo(storeChannel, "end:configuration", function(){
                storeChannel.command("fetch:chain:for", {modelName: modelName});
            });

            App.Channel.listenTo(storeChannel, "store:model:loaded", function(args){
                switch(args.modelName){
                    case modelName:
                        rows = storeChannel.request("get:models", {modelName: modelName});
                        App.Channel.trigger("request:complete", args);
                        break;
                }
            });

            App.Channel.on("request:complete", function(args){
                if(rows !== undefined){
                    var schema = storeChannel.request("get:schema:for", {
                        modelName: modelName
                    });

                    App.modesDict = {
                        edit: {
                            name:"edit1",
                            layout: "fullpage",
                            channelName: "mode1",
                            components: {
                                table: {
                                    title: "",
                                    channelName: "table",
                                    region: "main",
                                    controls: [
                                        {
                                            align: "left",
                                            class: "btn addNew",
                                            states: {
                                                default: {
                                                    event: "custom:control:one",
                                                    args: {modelName: modelName},
                                                    transition: "default"
                                                }
                                            },
                                            title: "Agregar nuevo curso"
                                        },
                                        {
                                            align: "left",
                                            class: "btn trash",
                                            states: {
                                                default: {
                                                    event: "custom:control:two",
                                                    transition: "default"
                                                }
                                            },
                                            title: "Eliminar curso seleccionado"
                                        },
                                        {
                                            align: "left",
                                            class: "btn undo",
                                            states: {
                                                default: {
                                                    event: "custom:control:three",
                                                    transition: "default"
                                                }
                                            },
                                            title: "Deshacer"
                                        },
                                        {
                                            align: "right",
                                            class: "btn removeFilters",
                                            states: {
                                                default: {
                                                    event: "remove:active:filters",
                                                    transition: "default"
                                                }
                                            },
                                            title: "Limpiar filtros"
                                        },
                                        {
                                            align: "right",
                                            class: "btn filterModified",
                                            states: {
                                                default: {
                                                    event: "filter:modified",
                                                    transition: "press"
                                                },
                                                press: {
                                                    event: "remove:active:filters",
                                                    class: "press",
                                                    transition: "default"
                                                }
                                            },
                                            title: "Filtrar cursos modificados"
                                        },
                                        {
                                            align: "right",
                                            class: "btn filterNew",
                                            states: {
                                                default: {
                                                    event: "filter:new",
                                                    transition: "press"
                                                },
                                                press: {
                                                    event: "remove:active:filters",
                                                    class: "press",
                                                    transition: "default"
                                                }
                                            },
                                            title: "Filtrar cursos agregados"
                                        },
                                        {
                                            align: "right",
                                            class: "btn filterDeleted",
                                            states: {
                                                default: {
                                                    event: "filter:deleted",
                                                    transition: "press"
                                                },
                                                press: {
                                                    event: "remove:active:filters",
                                                    class: "press",
                                                    transition: "default"
                                                }
                                            },
                                            title: "Filtrar cursos eliminados"
                                        }
                                    ],
                                    asset: {
                                        class: "table",
                                        initOptions: {},
                                        startOptions:{
                                            separator: ".",
                                            recordsPerPage: 100,
                                            pagesPerSheet: 10,
                                            rows: rows,
                                            schema: schema,
                                            columns:[
                                                {
                                                    property: "sede",
                                                    nested: true
                                                },
                                                {
                                                    property: "escuela",
                                                    nested: true
                                                },
                                                {
                                                    property: "regimen",
                                                    nested: true
                                                },
                                                {
                                                    property: "jornada",
                                                    nested: true
                                                },
                                                {
                                                    property: "carrera",
                                                    nested: true
                                                },
                                                {
                                                    property: "codigo_cliente"
                                                },
                                                {
                                                    property: "nombre"
                                                },
                                                {
                                                    property: "semestre"
                                                }
                                            ]
                                        }

                                    }
                                }
                            }
                        }
                    };

                    App.Channel.trigger("app:ready");
                }
            });
        };

        App.on("start", function(options){
            App.RootView = new LayoutView();

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
                region: App.RootView.getRegion("outer")
            });

            var maintainer = new Maintainer("maintainer");
            var maintainerChannel = maintainer.Channel;
            maintainer.start({
                title: "Mantenedor Cursos",
                modes: App.modesDict
            });

            App.RootView.on("show", function(){
                var menuView = menuChannel.request("get:root");
                App.RootView.getRegion("menuContainer").show(menuView); 

                var appbarView = appbarChannel.request("get:root");
                App.RootView.getRegion("appBar").show(appbarView);

                var maintainerView = maintainerChannel.request("get:root");
                App.RootView.getRegion("mainRegion").show(maintainerView);
            });

            App.Channel.reply("get:root", function(){
                return App.RootView;
            });
        });

        return App;
    };
    return AppConstructor;
});
