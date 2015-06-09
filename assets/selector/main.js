"use strict";

require.config({
    paths : {
        backbone : "../bower_components/backbone/backbone",
        underscore : "../bower_components/underscore/underscore",
        jquery : "../bower_components/jquery/dist/jquery",
        "backbone.marionette" : "../bower_components/backbone.marionette/lib/core/backbone.marionette",
        "backbone.radio" : "../bower_components/backbone.radio/build/backbone.radio",
        "backbone.babysitter" : "../bower_components/backbone.babysitter/lib/backbone.babysitter",
        text: "../bower_components/requirejs-text/text"
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
    "app"
], function (Marionette, Radio, Shim, App) {
    window.Radio = Radio;

    var OptionCollection = Backbone.Collection.extend();

    var optionArray = [];
    optionArray.push({id: 1, name: "gato", content: "gris"});
    optionArray.push({id: 2, name: "perro", content: "blanco"});
    optionArray.push({id: 3, name: "ardilla", content: "rojo"});
    optionArray.push({id: 4, name: "mono", content: "cafe"});
    optionArray.push({id: 5, name: "paloma", content: "amarillo"});
    optionArray.push({id: 6, name: "conejo", content: "gris"});
    optionArray.push({id: 7, name: "avestruz", content: "blanco"});
    optionArray.push({id: 8, name: "gusano", content: "rojo"});
    optionArray.push({id: 9, name: "pollo", content: "cafe"});
    optionArray.push({id: 10, name: "rinoceronte", content: "amarillo"});
    optionArray.push({id: 11, name: "polilla", content: "negra"});
    optionArray.push({id: 12, name: "mantis", content: "verde"});
    optionArray.push({id: 13, name: "koala", content: "blanco"});
    optionArray.push({id: 14, name: "garza", content: "amarilla"});
    optionArray.push({id: 15, name: "hormiga", content: "cafe"});
    optionArray.push({id: 16, name: "pulga", content: "fuxia"});
    optionArray.push({id: 17, name: "mosca", content: "azul"});

    var optionCollection1 = new OptionCollection(optionArray);
    var optionCollection2 = new OptionCollection(optionArray);

    var SomeRegion = Marionette.Region.extend();

    var somediv = new SomeRegion({
        el: "#somediv"
    });

    var app1 = new App("se1");

    app1.start({
        containerHeight: somediv.$el.outerHeight(),
        separator: "__",
        displayKeys: ["content", "name"],
        models: optionCollection1
    });

    var app1Channel = Radio.channel("se1");
    var app1View = app1Channel.request("get:selector:root");

    somediv.show(app1View);

    var someotherdiv = new SomeRegion({
        el: "#someotherdiv"
    });

    var app2 = new App("se2");

    app2.start({
        containerHeight: someotherdiv.$el.outerHeight(),
        separator: "__",
        displayKeys: ["name", "content"],
        models: optionCollection2
    });

    var app2Channel = Radio.channel("se2");
    var app2View = app2Channel.request("get:selector:root");

    someotherdiv.show(app2View);


});
