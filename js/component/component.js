define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "../../assets/table/js/table",
    "../../assets/schedule/js/schedule",
    "../../assets/cardsform/js/cardsform",
    "../../assets/simpleform/js/simpleform",
    "../../assets/uploadDrag/js/uploadDrag",
    "../../assets/options/js/options",
    "../../assets/download/js/download",
    "text!component/templates/componentTemplate.html"
], function (Marionette, Radio, Shim, Table, Schedule, CardsForm, SimpleForm, UploadDrag, Options, Download, ComponentTemplate) {

var ComponentConstructor = function(dataComponent){
        var Component = new Marionette.Application();
        // modelo
        var ComponentModel = Backbone.Model.extend();

        var ComponentCollection = Backbone.Collection.extend({
            model: ComponentModel
        });

        var ControlModel = Backbone.Model.extend();

        var ControlView = Marionette.ItemView.extend({
            tagName: "li",
            className: "btn",
            template: _.template(''),
            events: {
                "click": "clickActiveState"
            },
            initialize: function(){
                this.stateEvents = {};
                var states = this.model.get("states");
                var self = this;
                _.each(states, function(state, s){
                    if(this.activeState == undefined){
                        this.activeState = s;
                    }
                    this.stateEvents[s] = function(){
                        Component.Asset.Channel.trigger(state.event, state.args);
                        self.activeState = state.transition;
                    };
                }, this);
            },
            onShow: function(){
                this.$el.addClass(this.model.get("class"));
                this.$el.attr("title", this.model.get("title"));
            },
            clickActiveState: function(){
                this.stateEvents[this.activeState]();
                var stateClass = this.model.get("states")[this.activeState].class;
                var defaultClasses = this.model.get("class");
                this.$el.removeClass();
                this.$el.addClass(defaultClasses);
                if(stateClass != undefined){
                    this.$el.addClass(stateClass);
                }
            }
        });

        var ControlRegion = Marionette.Region.extend({
            attachHtml: function(view){
                this.$el.append(view.el);
            }
        });

        var ComponentItemView = Marionette.LayoutView.extend({
            tagName: "div",
            className: "component",
            template: _.template(ComponentTemplate),
            regions: {
                title: ".title",
                controls: ".controls",
                content: ".content"
            },

            onShow: function(){
                var selectorRight = this.$el.find(".right");
                var selectorLeft = this.$el.find(".left");

                Component.controlRegions = {};
                Component.controlRegions["right"] = new ControlRegion({
                    el: selectorRight,
                });
                Component.controlRegions["left"] = new ControlRegion({
                    el: selectorLeft,
                });

                this.createControls();
                this.setDimensions();
            },

            createControls: function(){
                var controls = this.model.get("controls");

                _.each(controls, function(control, i){
                    var controlModel = new ControlModel(control);
                    var controlView = new ControlView({model: controlModel});

                    var selector = controlModel.get("align");

                    var currentRegion = Component.controlRegions[selector];

                    currentRegion.show(controlView, {preventDestroy: true});
                });
            },

            setDimensions: function(){
                var title = this.model.get("title");
                var controls = this.model.get("controls");
                var header = this.$el.find(".header");
                var controlsPointer = this.$el.find(".controls");
                var content = this.$el.find(".content");

                if(title === "" && controls.length == 0){
                    // eliminate header
                    header.hide();

                    // eliminate controls
                    controlsPointer.hide();

                    // put height full height
                    this.$el.find(".content").css({"height": "100%"});
                }else{
                    if(title === "" || title === null || title === undefined){
                        // eliminate header
                        header.hide();

                        // add title height to content height
                        var titleHeight = 0;
                    }else{
                        var titleHeight = header.outerHeight();
                    }

                    if(controls.length == 0 || controls == null){
                        // eliminate controls
                        controlsPointer.hide();
                        // add title height to content height
                        var controlsHeight = 0;
                    }else{
                        var controlsHeight = controlsPointer.outerHeight();
                    }

                    // get region parent dimentions
                    var regionHeight = this.$el.parent().outerHeight() - parseInt( this.$el.parent().css("padding") ) * 2;


                    // set content height
                    var baseContentHeight = regionHeight - titleHeight - controlsHeight;

                    if(baseContentHeight < 65){
                        baseContentHeight = 65;
                    }

                    // put height to content
                    this.$el.find(".content").height(baseContentHeight + "px");

                }

            }
        });

        Component.Model = new ComponentModel(dataComponent);
        Component.RootView = new ComponentItemView({
            model: Component.Model
        });

        Component.Channel = Radio.channel(dataComponent.channelName);

        Component.on("before:start", function(options){
            var AssetClass = Component.getAsset();
            Component.Asset = new AssetClass(Component.Model.get("channelName"));
        });
        Component.on("start", function(options){

            Component.Asset.start(Component.Model.get("asset").startOptions);
            Component.Channel.reply("get:component:root", function(){
                return Component.RootView;
            });
            Component.RootView.on("show", function(){
                var assetView = Component.Asset.Channel.request("get:root");

                Component.RootView.getRegion("content").show(assetView);
            });
        });

        Component.getAsset = function(){
            switch(Component.Model.get("asset").class){
                case "table":
                    return Table;
                case "schedule":
                    return Schedule;
                case "cardsform":
                    return CardsForm;
                case "simpleform":
                    return SimpleForm;
                case "selector":
                    return Selector;
                case "uploadDrag":
                    return UploadDrag;
                case "options":
                    return Options;
                case "download":
                    return Download;
                default:
                    return Table;
                //to be continued...
            }
        };

        return Component;
    };
    return ComponentConstructor;
});
