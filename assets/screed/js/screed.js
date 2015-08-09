define([
    "backbone.radio",
    "radio.shim",
    "../js/screedclasses"
], function(Radio, Shim, Classes){

    var ScreedConstructor = function(channelName){

        var Screed = new Marionette.Application();

        Screed.Channel = Radio.channel(channelName);

        Screed.on("start", function(options){
            var columns = options.columns.map(function(col){
                return col.toJSON();
            });
            Screed.Editors = new Classes.Editors(columns);
            Screed.initEditors();

            Screed.RootView = new Classes.EditorCollectionView({
                collection: Screed.Editors,
                screed: Screed
            });

            Screed.Channel.reply("get:root", function(){
                return Screed.RootView;
            });

            Screed.Channel.on("reset:screed:values", function(args){
                console.log("params: SELECTION -> ", args);
                Screed.selection = args;
                Screed.populateEditorValues(args);
                Screed.populateDistinctOptions();
                console.log("SCREED EDITORS:", Screed.Editors);
            });

            Screed.Channel.on("open:screed", function(){
                Screed.RootView.open();
            });

            Screed.Channel.on("close:screed", function(){
                Screed.RootView.close();
            });

            Screed.Channel.on("save:form:data", function(){
                var formData = Screed.RootView.collectFormData();
                Screed.Channel.trigger("send:form:data", {
                    formData: formData,
                    successCallback: function(){
                        //maybe display some notification
                        Screed.Channel.trigger("close:screed");
                    },
                    failCallback: function(args){
                        Screed.Channel.trigger("display:errors", args);
                    },
                    selection: Screed.selection
                });
            });

            Screed.Channel.on("display:errors", function(args){
                console.log(args.errorMessage);
            });
        });

        Screed.initEditors = function(){
            Screed.Editors.each(function(editor){
                if(editor.get("type") == "model"){
                    editor.set({
                        "availableOptions": new Classes.EmptyCollection()
                    });

                    if(editor.getValue === undefined){
                        editor.getValue = function(model){
                            if(model !== null && model !== undefined){
                                var filterDisplay = editor.get("filterDisplay");
                                var count = 0;
                                var value = "";
                                _.each(filterDisplay, function(key){
                                    count += 1;
                                    value += model.get(key);
                                    if(count < filterDisplay.length){
                                        value += " : ";
                                    }
                                });
                                return value;
                            }
                            else{
                                return null;
                            }
                        };
                    }
                }
            });
        };

        Screed.populateEditorValues = function(params){
            var rows = params.rows;
            var column = params.column;

            Screed.Editors.each(function(editor){
                var value;
                var dataValue;
                for(var i = 0; i < rows.length; i++){
                    var rowValue = rows[i].get(editor.get("key"));
                    var valueComparator;
                    if(editor.get("type") == "model"){
                        valueComparator = editor.getValue(rowValue);
                    }
                    else{
                        valueComparator = rowValue;
                    }
                    if(value === undefined){
                        dataValue = rowValue;
                        value = valueComparator;
                    }
                    if(value != valueComparator){
                        dataValue = editor.get("default");
                        break;
                    }
                }
                editor.set("data", dataValue);
                if(editor.get("type") != "model"){
                    editor.trigger("model:data:changed");
                }
            });
        };

        Screed.populateDistinctOptions = function(){
            var properties = _.uniq(Screed.Editors.pluck("key"));

            _.each(properties, function(key){
                var editors = Screed.Editors.where({"key": key});
                _.each(editors, function(editor){
                    if(editor.get("type") == "model"){
                        var options = _.map(editor.get("options"), function(option){
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
                        editor.trigger("set:selected:option");
                    }
                });
            });
        };

        return Screed;
    };

    return ScreedConstructor;
});
