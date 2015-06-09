define([
    "jquery"
], function ($) {

    var Parser = function(){};

    Parser.prototype.getData = function (url){
        var blocks = {"grid": {}};
        $.ajax({
            dataType: "json",
            url: url,
            async: false,
            success: function(result){
                blocks = result[0];
                // blocks = result;   
            }
        });
        return blocks;
    };

    Parser.prototype.getLimits = function(blocks){

        if(!blocks.grid.length){
            return {};
        }

        var min = blocks["grid"][0]["start"];
        var max = blocks["grid"][0]["end"];

        for(var b in blocks["grid"]){
            var start = blocks["grid"][b]["start"];
            var end = blocks["grid"][b]["end"];
            if(min > start){
                min = start;
            }
            if(max < end){
                max = end;
            }
        }

        return {min: min, max: max};
    };

    Parser.prototype.getTime = function(strTime){
        var arrayTime = strTime.split(":");
        for(var i in arrayTime){
            arrayTime[i] = parseInt(arrayTime[i]);
        }

        return arrayTime;
    };

    Parser.prototype.absoluteTime = function(strTime){
        var arrayTime = this.getTime(strTime);
        var seconds = arrayTime[2];
        var minutes = arrayTime[1];
        var hours = arrayTime[0];

        return seconds + (60 * minutes) + (3600 * hours);
    };

    Parser.prototype.correctedTime = function(strTime1, strTime2){
        return this.absoluteTime(strTime2) - this.absoluteTime(strTime1);
    };

    Parser.prototype.parse = function(datasource){

        var blocks;
        switch(typeof datasource){
            case "object"://if datasource is a Backbone Schedule Model
                blocks = {grid: datasource.get("grid")};
                break;
            case "string"://if datasource is a url
                blocks = this.getData(datasource);
                break;
        }

        var limits = this.getLimits(blocks);

        var totalSeconds = this.correctedTime(limits.min, limits.max);
        var minSeconds = this.absoluteTime(limits.min);

        var columns = {};

        for(var b in blocks["grid"]){
            var start = blocks["grid"][b]["start"];
            var end = blocks["grid"][b]["end"];
            var code = blocks["grid"][b]["code"];

            var arrayCode = code.split(".");
            var x = parseInt(arrayCode[0]);
            var y = parseInt(arrayCode[1]);

            var start_trimmed = start.split(":");
            var end_trimmed = end.split(":");

            var cell = {};
            cell["start"] = this.correctedTime(limits.min, start)/totalSeconds;
            cell["end"] = this.correctedTime(limits.min, end)/totalSeconds;
            cell["code"] = code;
            cell["start_time"] = start_trimmed[0] + ":" + start_trimmed[1];
            cell["end_time"] = end_trimmed[0] + ":" + end_trimmed[1];
            cell["x"] = x;
            cell["y"] = y;
            cell["bloque_id"] = blocks["grid"][b]["bloque_id"];

            if(columns[x] === undefined){
                columns[x] = [];
            }

            columns[x].push(cell);
        }

        var result = {
            columns:[]
        }

        for(var c in columns){
            columns[c].sort(function(b1, b2){
                return b1["x"] - b2["x"] || b1["y"] - b2["y"];
            });

            result["columns"].push({
                index: c,
                cells: columns[c]
            });
        }

        return result;
    };

    return Parser;
});
