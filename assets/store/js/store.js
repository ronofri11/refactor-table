define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "../js/darwinclasses"
], function (Marionette, Radio, Shim, DarwinClasses) {

    var StoreConstructor = function(channelName, configUrl){
        //default value
        if(configUrl === undefined){
            configUrl = "assets/store/js/json/configuration.json";
        }
        //this App works as the full darwin store component
        var Store = new Marionette.Application();
        Store.Channel = Radio.channel(channelName);
        Store.configUrl = configUrl;

        Store.on("before:start", function(args){
            Store.base_url = args.url;
            Store.setInitHandlers();
        });

        Store.on("start", function(args){
            Store.Channel.trigger("start:configuration");
            Store.setInteractionHandlers();
        });

        Store.setInitHandlers = function(){
            Store.Channel.on("start:configuration", function(){
                Store.Channel.trigger("fetch:definitions");
            });

            Store.Channel.on("fetch:definitions", function(){
                var definitions;
                $.ajax({
                    type: "GET",
                    url: Store.configUrl,
                    dataType: "json"
                }).done(function(data){
                    definitions = data;
                    Store.Channel.trigger("generate:store:structure", {
                        definitions: definitions
                    });
                });
            });

            Store.Channel.on("generate:store:structure", function(args){
                Store.Definitions = new DarwinClasses.Definitions(args.definitions);
                Store.Models = {};
                Store.Collections = {};
                Store.Extractors = {};
                Store.Undoers = {};

                var base_url = Store.base_url;

                Store.Definitions.each(function(def){
                    var modelName = def.get("name");
                    var collectionName = def.get("collectionName");

                    // Create a new Model class
                    var model = DarwinClasses.DarwinModel.extend({
                        // URL root for this model
                        urlRoot: base_url + def.get("urlRoot")
                    });

                    // Backbone Collection
                    var collection = DarwinClasses.DarwinCollection.extend({
                        url: base_url + def.get("urlRoot"),
                    });

                    //Extractor part is missing from the store version used in table-component

                    //Save classes
                    Store.Models[modelName] = model;
                    Store.Collections[collectionName] = collection;
                    // Store.Extractors[modelName] = extractor;
                });

                Store.Channel.trigger("build:collection:instances");
            });

            Store.Channel.on("build:collection:instances", function(){
                Store.models = {};
                Store.Definitions.each(function(def){
                    var modelName = def.get("name");
                    var collectionName = def.get("collectionName");
                    var collection = Store.Collections[collectionName];
                    Store.models[modelName] = new collection();
                });

                Store.Channel.trigger("end:configuration");
                console.log("Store models:", Store.models);
            });
        };

        Store.setInteractionHandlers = function(){
            Store.Channel.reply("get:dependencies:for", function(args){
                var modelName = args.modelName;

                console.log("Fetching chain for ", modelName);
                var initial_model = Store.Definitions.get(modelName);

                // Dependency list
                var dependency_chain = [];

                // If any deps, proceed
                if (initial_model.get("deps").length > 0) {
                    var visited_models = {};

                    // Model names => ["Sede", "Sala", ...]
                    var dependencies = _.pluck(initial_model.get("deps"), "model");

                    // Loop
                    while (dependencies.length > 0) {
                        // Pick a dependency
                        var dependency = dependencies.shift();

                        // Only proceed if we haven't seen it already
                        if (visited_models[dependency]) {
                            continue;
                        }

                        // Add it to the dependency list
                        dependency_chain.push(dependency);

                        // Fetch the actual model using its name
                        var dependency_model = Store.Definitions.get(dependency);

                        // Add its deps to the list
                        dependencies.push.apply(
                            dependencies, _.pluck(dependency_model.get("deps"), "model"));

                        // Mark it as visited
                        visited_models[dependency] = true;
                    }
                }
                return dependency_chain;
            });
            Store.Channel.comply("fetch:chain:for", function(args){
                var modelName = args.modelName;

                // First, get the chain of collections we need to fetch
                var dependencies = Store.Channel.request("get:dependencies:for", args);
                // Build requests
                var requests = _.map(dependencies, function(dep){
                    // Get collection
                    var collection = Store.models[dep];
                    // Store.Channel.listenTo(collection, "change", function(args){
                    //     console.log("Store: changed model ", args);
                    // });

                    // Already fetched
                    if (collection.size() > 0) {
                        return false;
                    } else {
                        return collection.fetch({complete: function(){
                            console.log(dep + " cargado(a)");
                        }});
                    }
                });

                // Filter the already done
                requests = _.reject(requests, function(r) { return r == false });

                // Also, perform the actual fetch for the requested model
                var current_collection = Store.models[modelName];
                requests.unshift(current_collection.fetch());

                // Perform all in parallel and build links when done
                $.when.apply($, requests).done(function() {
                    // Build links
                    console.log("All Requests done");

                    // Build links for the model
                    Store.Channel.command("build:relationships:for", {modelName: modelName});

                    // And its dependencies
                    _.each(dependencies, function(dep) {
                        Store.Channel.command("build:relationships:for", {modelName: dep});
                    });

                    console.log("Store models full", Store.models);
                    Store.Channel.trigger("store:model:loaded", {modelName: modelName});
                });
            });

            Store.Channel.comply("build:relationships:for", function(args){
                var modelName = args.modelName;

                // Get definition
                var definition = Store.Definitions.get(modelName);

                // Build deps
                _.each(definition.get('deps'), function(dep) {
                    // Where to look
                    var target_collection = Store.models[dep.model];

                    // Now, for each item in the collection
                    var collection = Store.models[modelName];
                    collection.each(function(model) {
                        // Get lookup key
                        var nested_type = dep.nested;
                        var lookup_value = model.get(dep.lookup);

                        if(nested_type !== undefined){
                            if(nested_type === "array"){
                                var target_array = [];
                                for(var i = 0; i < lookup_value.length; i++){
                                    target_array.push(target_collection.get(lookup_value[i]));
                                }
                                var setArgs = {};
                                setArgs[dep.key] = target_array;
                                model.set(setArgs, {silent: true});
                            }
                            else if(nested_type === "dictionary_array"){
                                var target_array = [];
                                for(var i = 0; i < lookup_value.length; i++){
                                    var atributo = target_collection.get(lookup_value[i].atributo_id);
                                    target_array.push({"atributo": atributo, "prioridad": lookup_value[i].prioridad});
                                }
                                var setArgs = {};
                                setArgs[dep.key] = target_array;
                                model.set(setArgs, {silent: true});
                            }
                        }
                        else{
                            var target_model = target_collection.get(lookup_value);

                            var setArgs = {};
                            setArgs[dep.key] = target_model;
                            model.set(setArgs, {silent: true});
                        }
                    });
                });

                var virtualSchema = [];

                _.each(definition.get("schema"), function(rule){
                    var key = rule.key;
                    var virtualKey;

                    if(rule.virtual === undefined){
                        virtualKey = key + "_virtual";
                    }
                    else{
                        virtualKey = rule.virtual;
                    }
                    
                    var virtualRule = {};
                    virtualRule["key"] = rule.key;
                    virtualRule["type"] = rule.type;
                    virtualRule["default"] = rule.default;
                    virtualRule["title"] = rule.title;
                    virtualRule["virtual"] = virtualKey;
                    virtualSchema.push(virtualRule);

                    var collection = Store.models[modelName];
                    collection.each(function(model) {
                        var setArgs = {};
                        setArgs[virtualKey] = model.get(key);
                        model.set(setArgs, {silent: true});
                    });
                });

                definition.set({"schema": virtualSchema});
            });
            
            Store.Channel.reply("get:models", function(args){
                var modelName = args.modelName;
                return Store.models[modelName];
            });

            Store.Channel.reply("get:collection:class", function(args){
                var modelName = args.modelName;

                var definition = Store.Definitions.findWhere({"name": modelName});
                if(definition !== undefined){
                    return Store.Collections[definition.get("collectionName")];
                }
                return undefined;
            });

            Store.Channel.reply("get:schema:for", function(args){
                var modelName = args.modelName;
                var definition = Store.Definitions.findWhere({"name": modelName});
                if(definition !== undefined){
                    var fields = [];
                    var deps = definition.get("deps");
                    _.each(deps, function(dep){
                        if(dep.nested === undefined || dep.nested === null || dep.nested === false){
                            var field = {};
                            field["title"] = dep.title;
                            field["key"] = dep.key;
                            field["originalKey"] = dep.lookup;
                            field["filterKey"] = dep.filterKey;
                            field["filterDisplay"] = dep.filterDisplay;
                            field["type"] = "model"; //or nested
                            field["default"] = null;
                            field["options"] = Store.Channel.request("get:models", {
                                modelName: dep.model
                            }).toArray();
                            field["enabled"] = true;

                            fields.push(field);
                        }
                    });

                    var schema = definition.get("schema");
                    _.each(schema, function(rule){
                        var field = {};
                        field["title"] = rule.title;
                        field["key"] = rule.virtual;
                        field["originalKey"] = rule.key;
                        field["type"] = rule.type;
                        field["default"] = rule.default;
                        field["enabled"] = true;

                        if(rule.type !== "array"){
                            fields.push(field);
                        }

                    });

                    return fields;
                }
            });

            Store.Channel.comply("update:model:changes", function(args){
                var modelName = args.modelName;
                var model = args.model;
                
                var modelChanged = Store.Channel.request("is:model:modified", args);

                if(!model.get("new") && !model.get("deleted")){
                    model.set({"changed": modelChanged}, {silent: true});
                }

                model.trigger("model:modified");
            });

            Store.Channel.reply("get:empty:model", function(args){
                var modelName = args.modelName;
                var definition = Store.Definitions.findWhere({"name": modelName});
                if(definition !== undefined){
                    var EmptyModel = Backbone.Model.extend();
                    var emptyModel = new EmptyModel();

                    var schema = definition.get("schema");
                    _.each(schema, function(rule){
                        var setArgs = {};
                        setArgs[rule.key] = rule.default;
                        setArgs[rule.virtual] = rule.default;
                        emptyModel.set(setArgs, {silent: true});
                    });

                    var deps = definition.get("deps");
                    _.each(deps, function(dep){
                        var setArgs = {};
                        switch(dep.nested){
                            case undefined:
                            case null:
                            case false:
                                setArgs[dep.key] = null;
                                emptyModel.set(setArgs, {silent: true});
                                break;
                            case "array":
                                setArgs[dep.key] = [];
                                emptyModel.set(setArgs, {silent: true});
                                break;
                        }
                    });

                    emptyModel.set({"id": emptyModel.cid, "new": true}, {silent: true});
                    return emptyModel;
                }
            });

            Store.Channel.comply("mark:deleted", function(args){
                var model = args.model;
                if(model.get("new")){
                    model.collection.remove(model);
                }
                else{
                    model.set({"deleted": true}, {silent: true});
                    model.trigger("model:modified");
                }
            });

            Store.Channel.comply("undo:changes:for", function(args){
                var model = args.model;
                var modelName = args.modelName;

                if(!model.get("new")){
                    var undoers = Store.Channel.request("get:undoers:for", {
                        model: model,
                        modelName: modelName
                    });

                    _.each(undoers, function(undoer){
                        undoer(model);
                    });
                }

                if(model.get("changed")){
                    model.set({"changed": false}, {silent: true});
                }
                if(model.get("deleted")){
                    model.set({"deleted": false}, {silent: true});
                }

                model.trigger("model:modified");
            });

            Store.Channel.comply("undo:changes:for:row", function(args){
                var model = args.model;
                var modelName = args.modelName;

                if(!model.get("new")){
                    var undoers = Store.Channel.request("get:undoers:for", {
                        model: model,
                        modelName: modelName
                    });

                    _.each(undoers, function(undoer){
                        undoer(model);
                    });
                }

                if(model.get("changed")){
                    if(model.get("changed").length > 0){
                        model.set({"changed": []}, {silent: true});
                    }
                }
                if(model.get("deleted")){
                    model.set({"deleted": false}, {silent: true});
                }

                model.trigger("model:modified");
            });

            Store.Channel.comply("undo:changes:for:selection", function(args){
                var models = args.selection.rows;
                var modelName = args.modelName;

                _.each(models, function(model){
                    Store.Channel.command("undo:changes:for:row", {
                        model: model,
                        modelName: modelName
                    });
                });
            });

            Store.Channel.reply("get:new:models", function(args){
                return Store.models[args.modelName].filter(function(model){
                    return model.get("new") === true;
                });
            });

            Store.Channel.reply("get:deleted:models", function(args){
                return Store.models[args.modelName].filter(function(model){
                    return model.get("deleted") === true;
                });
            });

            Store.Channel.reply("get:extractors:for", function(args){
                var modelName = args.modelName;

                if(Store.Extractors[modelName] === undefined){
                    var extractors = [];

                    var definition = Store.Definitions.findWhere({"name": modelName});
                    if(definition !== undefined){
                        _.each(definition.get("deps"), function(dep){
                            switch(dep.nested){
                                case undefined:
                                case null:
                                case false:
                                    //here virtualDep is a single Backbone Model
                                    extractors.push(function(model, setChanges){
                                        var virtualDep = model.get(dep.key);
                                        if(virtualDep !== undefined && virtualDep !== null){
                                            if(JSON.stringify(model.get(dep.lookup)) != JSON.stringify(virtualDep.get("id"))){
                                                if(setChanges){
                                                    model.set({"changed": true}, {silent: true});
                                                    var setArgs = {};
                                                    setArgs[dep.lookup] = virtualDep.get("id");
                                                    model.set(setArgs, {silent: true});
                                                }
                                                return true;
                                            }
                                            return false;
                                        }
                                        return true;
                                    });
                                    break;
                                case "array":
                                    //here virtualDep is an array of Backbone Models
                                    extractors.push(function(model, setChanges){
                                        var virtualDepArray = model.get(dep.key);

                                        var newArray = _.filter(virtualDepArray, function(virtualDep){
                                            return virtualDep.get("state") != "deleted";
                                        });
                                        var filteredArray = _.map(newArray, function(virtualDep){
                                            return virtualDep.get("id");
                                        });

                                        var sortedArray = _.sortBy(filteredArray, function(id){
                                            return id;
                                        });

                                        var sortedPrevious = _.sortBy(model.get(dep.lookup), function(id){
                                            return id;
                                        });

                                        if(JSON.stringify(sortedArray) != JSON.stringify(sortedPrevious)){
                                            if(setChanges){
                                                model.set({"changed": true}, {silent: true});
                                                var setArgs = {};
                                                setArgs[dep.lookup] = sortedArray;
                                                model.set(setArgs, {silent: true});
                                            }
                                            return true;
                                        }
                                        return false;
                                    });
                                    break;
                            }
                        });

                        _.each(definition.get("schema"), function(rule){
                            extractors.push(function(model, setChanges){
                                var virtualValue = model.get(rule.virtual);
                                var originalValue = model.get(rule.key);

                                if(JSON.stringify(virtualValue) != JSON.stringify(originalValue)){
                                    if(setChanges){
                                        model.set({"changed": true}, {silent: true});
                                        var setArgs = {};
                                        setArgs[rule.key] = virtualValue;
                                        model.set(setArgs, {silent: true});
                                    }
                                    return true;
                                }
                                return false;
                            });
                        });
                    }

                    Store.Extractors[modelName] = extractors;
                }
                return Store.Extractors[modelName];
            });

            Store.Channel.reply("get:undoers:for", function(args){
                var modelName = args.modelName;

                if(Store.Undoers[modelName] === undefined){
                    var undoers = [];

                    var definition = Store.Definitions.findWhere({"name": modelName});
                    if(definition !== undefined){
                        _.each(definition.get("deps"), function(dep){
                            var target_collection = Store.models[dep.model];
                            switch(dep.nested){
                                case undefined:
                                case null:
                                case false:
                                    //here virtualDep is a single Backbone Model
                                    undoers.push(function(model){
                                        var lookup_value = model.get(dep.lookup);
                                        var target_model = target_collection.get(lookup_value);
                                        var setArgs = {};
                                        setArgs[dep.key] = target_model;
                                        model.set(setArgs, {silent: true});
                                    });
                                    break;
                                case "array":
                                    //here virtualDep is an array of Backbone Models
                                    undoers.push(function(model){
                                        var lookup_value = model.get(dep.lookup);
                                        var target_array = [];
                                        for(var i = 0; i < lookup_value.length; i++){
                                            target_array.push(target_collection.get(lookup_value[i]));
                                        }
                                        var setArgs = {};
                                        setArgs[dep.key] = target_array;
                                        model.set(setArgs, {silent: true});
                                    });
                                    break;
                            }
                        });

                        _.each(definition.get("schema"), function(rule){
                            undoers.push(function(model){
                                var virtualValue = model.get(rule.virtual);
                                var originalValue = model.get(rule.key);

                                var setArgs = {};
                                setArgs[rule.virtual] = model.get(rule.key);
                                model.set(setArgs, {silent: true});
                            });
                        });
                    }

                    Store.Undoers[modelName] = undoers;
                }
                return Store.Undoers[modelName];
            });

            Store.Channel.reply("get:changed:models", function(args){
                var modelName = args.modelName;
                var setChanges = args.setChanges;

                if(setChanges === undefined){
                    setChanges = false;
                }

                var extractors = Store.Channel.request("get:extractors:for", args);

                var changedModels = Store.models[modelName].filter(function(model){
                    var relevant = false;
                    _.each(extractors, function(extractor){
                        relevant = (relevant || extractor(model, setChanges));
                    });
                    return relevant;
                });
                console.log("changedModels:", changedModels);
                return changedModels;
            });

            Store.Channel.reply("is:model:modified", function(args){
                var model = args.model;
                var modelName = args.modelName;

                var extractors = Store.Channel.request("get:extractors:for", {
                    modelName: modelName
                });

                var modified = false;
                _.each(extractors, function(extractor){
                    modified = (modified || extractor(model, false));
                });
                return modified;
            });

            Store.Channel.reply("save:models", function(args){
                var changedModels = Store.Channel.request("get:changed:models", {
                    modelName: args.modelName,
                    setChanges: true
                });

                var deletedModels = Store.Channel.request("get:deleted:models", {
                    modelName: args.modelName
                });

                var newModels = Store.Channel.request("get:new:models", {
                    modelName: args.modelName
                });

                return {
                    newModels: newModels,
                    changedModels: changedModels,
                    deletedModels: deletedModels
                };
            });

            Store.Channel.reply("validate:form:data", function(args){
                var formData = args.formData;
                var modelName = args.modelName;
                // var models = args.selection.rows;
                // var column = args.selection.column;

                // var value = formData[column.get("key")];
                // var type = column.get("type");

                var schema = Store.Channel.request("get:schema:for", {modelName: modelName});
                
                var isValid = true;
                var errorKeys = [];
                _.each(schema, function(property){
                    var value = formData[property.key];
                    var type = property.type;
                    var isFieldValid;
                    switch(type){
                        case "model":
                            isFieldValid = value !== null;
                            break;
                        case "number":
                            isFieldValid = !isNaN(value);
                            break;
                        case "string":
                            isFieldValid = typeof value === "string" && value !== "";
                            break;
                        case "boolean":
                            isFieldValid = typeof value === "boolean";
                            break;
                    }

                    if(!isFieldValid){
                        errorKeys.push(property.key);
                    }
                    isValid = isValid && isFieldValid;
                });

                return {
                    isValid: isValid,
                    errorKeys: errorKeys
                };
            });

            Store.Channel.comply("save:form:data", function(args){
                var formData = args.formData;
                var models = args.selection.rows;
                var column = args.selection.column;
                var modelName = args.modelName;

                // var key = column.get("key");
                // var value = formData[key];

                // var changed = [];
                // changed.push(key);

                // var changes = {};
                // changes["changed"] = changed;
                // changes[key] = value;

                _.each(models, function(model){
                    // var previousChanges = model.get("changed");
                    // if(previousChanges !== undefined){
                    //     changes["changed"] = _.uniq(changes["changed"].concat(previousChanges));
                    // }

                    var changed = Store.Channel.request("get:changed:properties", {
                        modelName: modelName,
                        model: model,
                        formData: formData
                    });
                    if(changed.length > 0){
                        model.set("changed", changed);
                        model.trigger("model:modified");
                    }
                });
            });

            Store.Channel.reply("get:changed:properties", function(args){
                var model = args.model;
                var modelName = args.modelName;
                var formData = args.formData;

                var changed = [];

                var schema = Store.Channel.request("get:schema:for", {modelName: modelName});
                
                _.each(schema, function(property){
                    var value = formData[property.key];
                    var modelValue = model.get(property.key);
                    var type = property.type;

                    var hasChanges = value !== modelValue;

                    if(hasChanges){
                        model.set(property.key, value);
                        changed.push(property.key);
                    }
                });

                var previousChanges = model.get("changed");
                if(previousChanges !== undefined){
                    changed = _.uniq(changed.concat(previousChanges));
                }

                return changed;
            });

        };


        return Store;
    };

    return StoreConstructor;
});
