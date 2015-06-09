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
    "app"
], function (App) {
    App.start();
});