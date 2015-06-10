"use strict";

require.config({
    paths : {
        backbone : "../bower_components/backbone/backbone",
        underscore : "../bower_components/underscore/underscore",
        jquery : "../bower_components/jquery/dist/jquery",
        "backbone.marionette" : "../bower_components/backbone.marionette/lib/core/backbone.marionette",
        "backbone.radio" : "../bower_components/backbone.radio/build/backbone.radio",
        "backbone.babysitter" : "../bower_components/backbone.babysitter/lib/backbone.babysitter",
        text: "../bower_components/requirejs-text/text",
        "assets": "../assets"
    },
    enforceDefine: true,
    map: {
        '*': {
            'backbone.wreqr': 'backbone.radio'
        }
    }
});

define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "mode",
    "../assets/notification/js/notification",
    "../assets/store/js/store"
], function (Marionette, Radio, Shim, Mode, Notification, Store) {
    window.Radio = Radio;

    var App = new Marionette.Application();
    App.Channel = Radio.channel("main");

    var store = new Store("store");
    var storeChannel = store.Channel;

    // store.start({url: "/darwined/backbreakers/"});
    store.start({url: "/clients/darwined"});
    // store.start({url: "/clients/testing"});

    var asignaturas;
    var modelName = "Curso";

    App.Channel.listenTo(storeChannel, "end:configuration", function(){
        storeChannel.command("fetch:chain:for", {modelName: modelName});
    });

    App.Channel.listenTo(storeChannel, "store:model:loaded", function(args){
        switch(args.modelName){
            case modelName:
                asignaturas = storeChannel.request("get:models", {modelName: modelName});
                App.Channel.trigger("request:complete", args);
                break;
        }
    });

    App.Channel.on("request:complete", function(args){
        if(asignaturas !== undefined){
            var schema = storeChannel.request("get:schema:for", {
                modelName: modelName
            });
            var dataMode = {
                name:"edit1",
                layout: "fullpage",
                channelName: "mode1",
                components: {
                    table: {
                        title: modelName,
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
                                }
                            },
                            {
                                align: "left",
                                class: "btn trash",
                                states: {
                                    default: {
                                        event: "custom:control:two",
                                        transition: "default"
                                    }
                                }
                            },
                            {
                                align: "left",
                                class: "btn undo",
                                states: {
                                    default: {
                                        event: "custom:control:three",
                                        transition: "default"
                                    }
                                }
                            },
                            {
                                align: "right",
                                class: "btn removeFilters",
                                states: {
                                    default: {
                                        event: "remove:active:filters",
                                        transition: "default"
                                    }
                                }
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
                                }
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
                                }
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
                                }
                            }
                        ],
                        asset: {
                            class: "table",
                            initOptions: {},
                            startOptions:{
                                separator: ".",
                                pages: 33,
                                rows: asignaturas
                            }
                        }
                    }
                }
            };

            var SomeRegion = Marionette.Region.extend();

            var somediv = new SomeRegion({
                el: ".container"
            });


            var notification = new Notification("notifications");
            var notificationChannel = notification.Channel;
            var notificationRegion = new SomeRegion({
                el: ".notifications"
            });

            // global assets
            notification.start();
            var notificationView = notificationChannel.request("get:root");
            notificationRegion.show(notificationView);

            var mode1 = new Mode(dataMode);
            var mode1Channel = mode1.Channel;
            App.Channel.listenTo(mode1Channel, "notify", function(args){
                notificationChannel.command("notify", args);
            });

            mode1.start();
            var mode1View = mode1Channel.request("get:mode:root");
            somediv.show(mode1View);

            App.Channel.on("sync:db", function(){
                mode1Channel.command("update:selection:data");
                var commit = storeChannel.request("get:changed:models", {modelName: modelName});
            });

            App.Channel.listenTo(mode1Channel, "create:new:model", function(args){
                var modelName = args.modelName;
                var emptyModel = storeChannel.request("get:empty:model", {modelName: modelName});
                mode1Channel.command("add:empty:model", {model: emptyModel});
            });

            App.Channel.listenTo(mode1Channel, "delete:model", function(args){
                storeChannel.command("mark:deleted", {model: args.model});
            });

            App.Channel.listenTo(mode1Channel, "undo:changes:for", function(args){
                storeChannel.command("undo:changes:for", args);
            });

            App.Channel.listenTo(mode1Channel, "update:model:changes", function(args){
                storeChannel.command("update:model:changes", args);
            });

            App.Channel.listenTo(mode1Channel, "save:models", function(args){
                var commit = storeChannel.request("save:models", args);
                var message = "Sincronizando: " + commit.newModels.length + " registros creados.\n";
                message += commit.changedModels.length + " registros modificados.\n";
                message += commit.deletedModels.length + " registros modificados.\n";
                notificationChannel.command("notify", {
                    message: message,
                    type: "info"
                });
            });
        }


    });

});
