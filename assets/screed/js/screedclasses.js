define([
    "backbone.marionette",
    "assets/typeahead/js/typeahead",
    "text!assets/screed/templates/numbertemplate.html",
    "text!assets/screed/templates/stringtemplate.html",
    "text!assets/screed/templates/booleantemplate.html",
    "text!assets/screed/templates/nestedtemplate.html",
    "text!assets/screed/templates/disabledtemplate.html",
    "text!assets/screed/templates/disablednestedtemplate.html",
], function (Marionette, TypeAhead, NumberTemplate, StringTemplate, BooleanTemplate, NestedTemplate, DisabledTemplate, DisabledNestedTemplate) {

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

    ScreedClasses.EmptyCollection = Backbone.Collection.extend();

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
            var self = this;
            this.view.Screed = this.view.getOption("screed");
            this.view.broadcastEvent = function(event){
                event.preventDefault();
                event.stopPropagation();
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
            this.model.set({"collectedData": data});
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

    ScreedClasses.EditorNestedView = Marionette.LayoutView.extend({
        behaviors: {
          EditorBehavior: {}
        },
        className: "editorLayout",
        template: _.template("<div class=\"layoutEditor\"></div>"),
        regions: {
        "layout": ".layoutEditor"
        },
        initialize: function(){
        // data
        var options = this.model.get("availableOptions");
        // console.log("availableOptions: ", options);
        // var arrayCollection = Backbone.Collection.extend();
        // var optionArrayCollection = new arrayCollection(options);
        // console.log("optionArrayCollection: ", optionArrayCollection);

        // show typeahead
        this.typeahead = new TypeAhead("typeahead_" + this.model.get("alias"));
        this.typeahead.start({
          containerHeight: this.$el.outerHeight(),
          separator: "__",
          displayKeys: ["value"],
          models: this.model.get("availableOptions")
        });

        },
        onShow: function(){
        var typeaheadChannel = this.typeahead.Channel;
        var typeaheadView = typeaheadChannel.request("get:root");
        this.getRegion("layout").show(typeaheadView);

        },

        setCurrentData: function(){
            var data = this.getCurrentData();
            this.model.set({"data": data});
            this.model.set({"collectedData": data});
        },

        getCurrentData: function(){
            // var option = this.$el.find("select option:selected");
            // var optionValue = option.attr("data-value");

            // if(optionValue !== ""){
            //     var optionModel = this.optionlookup(optionValue);

            //     return optionModel;
            // }
            // else{
            //     return null;
            // }
            return null;
        },

        optionlookup: function(value){
            console.log("looking up options for:", value);
            var self = this;
            var relevants = _.filter(this.model.get("options"), function(option){
                var optionValue = self.model.getValue(option);
                if(optionValue == value){
                    return true;
                }
                return false;
            });

            console.log("relevants were:", relevants);

            if(relevants.length > 0){
                return relevants[0];
            }

            return null;
        },

        optionSelected: function(){
            this.model.trigger("set:current:data");
            this.model.trigger("option:selected", {editor: this.model});
            // var currentOption = this.getCurrentData();
            // this.Screed.Channel.trigger("editor:nested:change", {
            //     value: currentOption,
            //     editor: this.model
            // });
        }
    });

    // ScreedClasses.EditorNestedView = Marionette.ItemView.extend({
    //     behaviors: {
    //         EditorBehavior: {}
    //     },

    //     events: {
    //         "change select": "optionSelected",
    //         "focusin select": "focusinSelect"
    //     },

    //     initialize: function(){
    //         this.listenTo(this.model.get("availableOptions"), "reset", this.render);
    //     },

    //     getTemplate: function(){
    //         if(!this.model.get("enabled")){
    //             return _.template(DisabledNestedTemplate);
    //         }
    //         else{
    //             return _.template(NestedTemplate);
    //         }
    //     },

    //     templateHelpers: function(){
    //         var availableOptions = this.model.get("availableOptions").toArray();
    //         var dataValue = this.model.getValue(this.model.get("data"));
    //         return {
    //             availableOptions: availableOptions,
    //             dataValue: dataValue
    //         };
    //     },

    //     setCurrentData: function(){
    //         var data = this.getCurrentData();
    //         this.model.set({"data": data});
    //         this.model.set({"collectedData": data});
    //     },

    //     getCurrentData: function(){
    //         var option = this.$el.find("select option:selected");
    //         var optionValue = option.attr("data-value");

    //         if(optionValue !== ""){
    //             var optionModel = this.optionlookup(optionValue);

    //             return optionModel;
    //         }
    //         else{
    //             return null;
    //         }
    //     },

    //     optionlookup: function(value){
    //         console.log("looking up options for:", value);
    //         var self = this;
    //         var relevants = _.filter(this.model.get("options"), function(option){
    //             var optionValue = self.model.getValue(option);
    //             if(optionValue == value){
    //                 return true;
    //             }
    //             return false;
    //         });

    //         console.log("relevants were:", relevants);

    //         if(relevants.length > 0){
    //             return relevants[0];
    //         }

    //         return null;
    //     },

    //     optionSelected: function(){
    //         this.model.trigger("set:current:data");
    //         this.model.trigger("option:selected", {editor: this.model});
    //         // var currentOption = this.getCurrentData();
    //         // this.Screed.Channel.trigger("editor:nested:change", {
    //         //     value: currentOption,
    //         //     editor: this.model
    //         // });
    //     },

    //     focusinSelect: function(){
    //         console.log("focus in select", this.model.get("alias"));
    //     }
    // };

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

            this.listenTo(this.collection, "option:selected", this.updateNestedOptions);
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
               offsetTop = 70;
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

            $(".canvastable .table .tbody").delay(400).animate({
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
            console.log("cancel");
            this.Screed.Channel.trigger("close:screed");
        },

        okBtn: function(){
            console.log("ok");
            this.Screed.Channel.trigger("save:form:data");
        },

        collectFormData: function(){
            var formData = {};
            this.collection.each(function(editor){
                console.log("collecting for editor: ", editor.get("alias"));
                var editorData = editor.trigger("set:current:data");
                formData[editor.get("key")] = editor.get("collectedData");
            });
            return formData;
        },

        updateNestedOptions: function(args){
            console.log(args.editor);
            var emitterEditor = args.editor;
            var affectedEditors = this.collection.filter(function(editor){
                return (editor.get("key") === emitterEditor.get("key"));
            });

            var optionFilters = {};

            _.each(affectedEditors, function(editor){
                optionFilters[editor.get("alias")] = {
                    value: editor.getValue(editor.get("collectedData")),
                    editor: editor
                };
            });

            var filteredOptions = _.filter(emitterEditor.get("options"), function(option){
                var relevant = true;
                _.each(optionFilters, function(filter){
                    var editor = filter.editor;
                    var value = filter.value;

                    if(value !== null){
                        relevant = relevant && (editor.getValue(option) === value);
                    }
                });
                return relevant;
            });

            _.each(affectedEditors, function(editor){
                var options = _.map(filteredOptions, function(option){
                    var id = option.get("id");
                    var value = editor.getValue(option);
                    return {
                        id: id,
                        value: value
                    };
                });
                var distinctOptions = _.sortBy(_.uniq(options, function(option){
                    return option.value;
                }), function(option){
                    return option.value;
                });

                editor.get("availableOptions").reset(distinctOptions);
            });
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
