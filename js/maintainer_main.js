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
    "app",
    "backbone.radio"
], function (App, Radio) {
    window.Radio = Radio;

    var SomeRegion = Marionette.Region.extend();

    var somediv = new SomeRegion({
        el: ".maintainer-app"
    });

    var App = new App("maintainer-app");
    var appChannel = App.Channel;

    var url = "/darwined/backbreakers/";
    // var url = "/clients/darwined";
    // var url = "/clients/testing";

    App.startStore(url);

    appChannel.listenTo(appChannel, "app:ready", function(){
        App.start();
        somediv.show(appChannel.request("get:root"));
    });

    // Maintainer.start({
    //     channelName: "m1",
    //     dataMaintainer: {
    //         title: "MANTENEDOR DE FRANJAS",
    //         modes: [
    //             {
    //                 name:"edit1",
    //                 layout: "columnHeaderMainflip",
    //                 state: "edit",
    //                 active: true
    //             },
    //             {
    //                 name: "exportar1",
    //                 layout: "fullpage",
    //                 state: "export",
    //                 active: false
    //             },
    //             {
    //                 name: "import1",
    //                 layout: "fullpage",
    //                 state: "import",
    //                 active: false
    //             }
    //         ]
    //     }
    // });
});
