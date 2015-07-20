define([
    "backbone.marionette",
    "text!assets/screed/templates/numbertemplate.html",
    "text!assets/screed/templates/stringtemplate.html",
    "text!assets/screed/templates/booleantemplate.html",
    "text!assets/screed/templates/nestedtemplate.html",
    "text!assets/screed/templates/disabledtemplate.html",
    "text!assets/screed/templates/disablednestedtemplate.html",
], function (Marionette, NumberTemplate, StringTemplate, BooleanTemplate, NestedTemplate, DisabledTemplate, DisabledNestedTemplate) {

    var ScreedClasses = {};

    ScreedClasses["Behaviors"] = {};

    Marionette.Behaviors.behaviorsLookup = function() {
        return ScreedClasses.Behaviors;
    };

    ScreedClasses.Editor = Backbone.Model.extend({
        initialize: function(){
            if(this.get("data") === undefined){
                this.set({"data": this.get("default")}, {silent: true});
            }
            this.set({"valid": true, "modified": false}, {silent: true});
        }
        // setDataFromModel: function(model){
        //     var originalKey = this.get("originalKey");
        //     var virtualKey = this.get("key");

        //     var virtualValue = model.get(virtualKey);
        //     var originalValue = model.get(originalKey);

        //     if(virtualValue instanceof Backbone.Model){
        //         virtualValue = virtualValue.get("id");
        //     }

        //     if(virtualValue != originalValue){
        //         this.set({"modified": true}, {silent: true});
        //     }
        //     else{
        //         this.set({"modified": false}, {silent: true});
        //     }

        //     this.set({"data": model.get(this.get("key"))}, {silent: true});

        //     this.trigger("model:data:changed");
        // }
    });

    ScreedClasses.Editors = Backbone.Collection.extend({
        model: ScreedClasses.Editor
    });

    var EditorBehavior = Marionette.Behavior.extend({
        modelEvents: {
            "change:enabled": "editorRender",
            "set:current:data": "editorSetData",
            "model:data:changed": "editorRender"
        },

        initialize: function(){
            this.view.Screed = this.view.getOption("screed");
            this.view.broadcastEvent = function(event){
                var eventName = "editor:" + event.type;
                this.Screed.Channel.trigger(eventName, {
                    eventName: eventName,
                    model: this.model,
                    type: this.model.get("type")
                });
            };
        },

        editorRender: function(){
            this.view.render();
        },

        editorSetData: function(){
            this.view.setCurrentData();
        },

        onRender: function(){
            this.styling();
        },

        styling: function(){
            this.$el.addClass("editor");
            this.$el.attr("data-key", this.view.model.get("key"));
            // set column width
            this.$el.css({
                "width": this.view.model.get("max_text_width") + "px"
            });
            if(!this.view.model.get("active")){
                this.$el.removeClass("activeEditor");
            }
            else{
                this.$el.addClass("activeEditor");
            }
            if(!this.view.model.get("modified")){
                this.$el.removeClass("modify");
            }
            else{
                this.$el.addClass("modify");
            }
            if(this.view.model.get("valid")){
                this.$el.removeClass("error");
            }
            else{
                this.$el.addClass("error");
            }
        }
    });

    ScreedClasses.Behaviors["EditorBehavior"] = EditorBehavior;

    ScreedClasses.EditorNormalView = Marionette.ItemView.extend({

        behaviors: {
            EditorBehavior: {}
        },

        events: {
            "focusout input": "broadcastEvent"
        },

        getTemplate: function(){
            if(!this.model.get("enabled")){
                return _.template(DisabledTemplate);
            }
            else{
                switch(this.model.get("type")){
                    case "number":
                        return _.template(NumberTemplate);
                    case "string":
                        return _.template(StringTemplate);
                    case "boolean":
                        return _.template(BooleanTemplate);
                }
            }
        },

        setCurrentData: function(){
            var data = this.getCurrentData();
            this.model.set({"data": data});
        },

        getCurrentData: function(){
            switch(this.model.get("type")){
                case "number":
                    return parseInt(this.$el.find("input").val());
                case "string":
                    return this.$el.find("input").val();
                case "boolean":
                    return this.$el.find("input").prop("checked");
            }
        },
    });

    ScreedClasses.EditorNestedView = Marionette.ItemView.extend({
        behaviors: {
            EditorBehavior: {}
        },

        events: {
            "change select": "broadcastEvent"
        },

        getTemplate: function(){
            if(!this.model.get("enabled")){
                return _.template(DisabledNestedTemplate);
            }
            else{
                return _.template(NestedTemplate);
            }
        },

        templateHelpers: function(){
            var self = this;
            var caption = function(option){
                var text;
                _.each(self.model.get("filterDisplay"), function(displayKey){
                    if(text === undefined){
                        text = "" + option.get(displayKey);
                    }
                    else{
                        text = text + ":" + option.get(displayKey);
                    }
                });
                return text;
            };
            return {
                caption: caption
            };
        },

        setCurrentData: function(){
            var data = this.getCurrentData();
            this.model.set({"data": data});
        },

        getCurrentData: function(){
            var option = this.$el.find("select option:selected");
            var optionValue = option.attr("data-value");

            if(optionValue !== ""){
                var optionModel = this.optionlookup(optionValue);

                return optionModel;
            }
            else{
                return null;
            }
        },

        optionlookup: function(value){
            var filterKey = this.model.get("filterKey");

            var relevants = _.filter(this.model.get("options"), function(option){
                if(option.get(filterKey) == value){
                    return true;
                }
                return false;
            });

            if(relevants.length > 0){
                return relevants[0];
            }

            return null;
        }
    });

    ScreedClasses.EditorCollectionView = Marionette.CollectionView.extend({
        tagName: "div",
        className: "screed",
        events: {
            "click .cancel": "cancelBtn",
            "click .ok": "okBtn"
        },

        getChildView: function(model){
            switch(model.get("type")){
                case "number":
                case "string":
                case "boolean":
                    return ScreedClasses.EditorNormalView;
                case "model":
                    return ScreedClasses.EditorNestedView;
            }
            return ScreedClasses.EditorNormalView;
        },

        initialize: function(options){
            this.Screed = options.screed;
            this.childViewOptions = {
                screed: this.Screed
            };
        },

        exportData: function(){
            var formData = {};
            this.collection.each(function(editor){
                formData[editor.get("key")] = editor.get("data");
            });

            return formData;
        },

        setformData: function(){
            this.collection.each(function(editor){
                editor.trigger("set:current:data");
            });
        },

        onShow: function(){
            this.$el.css({
                display:"none"
            });
        },

        open: function(){
            var offsetTop = 126;

            if ($(window).width() <= 1366) {
               offsetTop = 88;
            }

            this.$el.fadeIn().animate({
                height: [ "70px", "swing" ]},
                200,
                function() {
                //callback
            });

            $(".canvastable .table .tbody").css({
                "top": "0"
            }).animate({
                top: [ offsetTop, "swing" ]},
                400,
                function() {
                //callback
            });

            this.showButtons();
        },

        close: function(){

            if ($(window).width() <= 1366) {
                var ftop = "0px"
            }else{
                var ftop = "56px"
            }

            this.$el.fadeOut().css({
                "height": "70px"
            }).animate({
                height: [ "0px", "swing" ]},
                200,
                function() {
                //callback
            });

            $(".canvastable .table .tbody").animate({
                top: [ ftop, "swing" ]},
                400,
                function() {
                //callback
            });

            this.hideButtons();
        },

        showButtons: function(){
            this.$el.append("<div class=\"buttons\"><div class=\"cancel\"></div><div class=\"ok\"></div></div>");

            var offsetTop = this.$el.offset().top;
            var offsetleft = $(".canvastable").offset().left + $(".canvastable").width();
            var buttonsHeight = "67px";
            var buttonsWidth = $(".region").css("padding");
            console.log("btn width: ", buttonsWidth);
            this.$el.find(".buttons").css({
                "top": offsetTop,
                "left": offsetleft,
                "height": buttonsHeight,
                "width": buttonsWidth
            });
            this.$el.find(".buttons").delay(400).fadeIn();
        },

        hideButtons: function(){
            $(".tscreed > .buttons").css({
                "top": "0px"
            });
            this.$el.find(".buttons").delay(400).fadeOut();

        },

        cancelBtn: function(){
            alert("cancel");
            this.close();
            this.hideButtons();
        },

        okBtn: function(){
            alert("ok");
            this.close();
            this.hideButtons();
        }
        // setDataFromModel: function(){
        //     var model = this.Screed.Model;
        //     this.collection.each(function(editor){
        //         editor.setDataFromModel(model);
        //     });
        // },
    });

    return ScreedClasses;
});
