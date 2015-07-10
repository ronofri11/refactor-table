define([
    "backbone.marionette",
    "backbone.radio",
    "radio.shim",
    "text!assets/uploadDrag/templates/uploadDrag.html"
], function (Marionette, Radio, Shim, UploadDragTemplate) {
    var UploadDragConstructor = function(channelName){

        var UploadDrag = new Marionette.Application();
        UploadDrag.Channel = Radio.channel(channelName);

        UploadDrag.LayoutView = Marionette.LayoutView.extend({
            tagname: "div",
            className: "uploadDrag",
            template: _.template(UploadDragTemplate),
            events: {
                "change #fileselect": "fileChanged",
                "dragover #filedrag": "dragOver",
                "dragenter #filedrag": "dragEnter",
                "dragleave #filedrag": "dragLeave",
                "drop #filedrag": "drop"
            },
            fileChanged: function(){
                var filename = this.getfile();
                UploadDrag.Channel.trigger("upload:change", {
                    "filename": filename
                });
            },
            getfile: function(){
                var filename = this.$el.find("#fileselect").val();
                return filename;
            },
            dragOver: function(event){
                event.preventDefault();
                event.stopPropagation();
            },
            dragEnter: function(event){
                event.preventDefault();
                event.stopPropagation();
                this.$el.find("#filedrag").css({
                    "border":"2px dashed #5AA958",
                    "cursor":"copy"
                });
            },
            dragLeave: function(){
                event.preventDefault();
                event.stopPropagation();
                this.$el.find("#filedrag").css({
                    "border":"2px dashed #a9b7c2",
                    "cursor":"default"
                });
            },
            drop: function(event){
                if(event.originalEvent.dataTransfer){
                    if(event.originalEvent.dataTransfer.files.length) {
                        event.preventDefault();
                        event.stopPropagation();
                        var file = event.originalEvent.dataTransfer.files;

                        //show file data selected
                        this.datastatus(file);

                        // pass file to input file type
                        var input = this.$el.find("#fileselect");
                        input.prop("files", file)
                        .closest("form")
                          // .submit();
                    }
                }
            },
            datastatus: function(file){
                var icon = this.$el.find("#filedrag .icon");
                icon.css({"background-image": "none"});
                icon.empty().append("<div class=\"file\"><div class=\"name\">" + file[0].name + "</div><div class=\"size\">" + (file[0].size / 1000) + " Kb</div></div>");
            }
        });

        UploadDrag.on("start", function(args){
            console.log("args: ", args);

            // var data = args.modalStuff
            usermodel = Backbone.Model.extend();
            UploadDrag.Model = new usermodel(args);

            UploadDrag.layoutView = new UploadDrag.LayoutView({model:UploadDrag.Model});

            UploadDrag.Channel.reply("get:root", function(){
                return UploadDrag.layoutView;
            });

            UploadDrag.Channel.reply("get:filename", function(){
                return UploadDrag.layoutView.getfile();
            });

        });

        return UploadDrag;
    };

    return UploadDragConstructor;

});
