define([
	"backbone.marionette",
	"backbone.radio",
	"radio.shim"
], function (Marionette, Radio, Shim) {

	var App = new Marionette.Application();

	var channel = Radio.channel('global');
    console.log(channel);


    // App = new Marionette.Application();
    // App.listenTo(App, "start", function(){
    //     alert("Hello World!");
    // });
    return App;
});
