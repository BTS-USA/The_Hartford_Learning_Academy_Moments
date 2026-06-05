define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT'],
    function ($, Q, WizerApi, WizletBase, doT) {

        var HeatmapComponent = function () {
            this.type = 'HeatmapComponent';
            this.level = 1;
        };

        HeatmapComponent.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
            this.wizletInfo = wizletInfo;
            this.wizletContext = wizletContext;
            this.wizerApi = wizerApi;
            this.votesBeforeUpdate = [];
            //this.extApi = wizerApiExt.getRegistration(wizerApi);

            this.templateDefer = Q.defer();
            var self = this;
            var requirements = [];
            requirements.push(WizletBase.loadTemplate(wizletInfo, 'heatmapComponent.dot'));

            if (wizletInfo.css) {
                requirements.push(WizletBase.loadCss(wizletInfo));
            }
            require(requirements, function (doTTemplate, css) {
                self.templateDefer.resolve(doTTemplate);
            });

            if (self.wizletInfo.liveUpdate) {
                $(document).on("wizer:action:latestVoteTimeChanged", { context: self }, self.reRenderOnLiveUpdate);
            }
            //VideoPlayer.onLoad(null, info, content, wizerApi);
            return WizletBase.loadHandler({ wizlet: this, render: this.render });
        };

        HeatmapComponent.prototype.unloadHandler = function () {
            //unload wizletbase
            $(document).off("wizer:action:latestVoteTimeChanged", this.reRenderOnLiveUpdate);
            WizletBase.unloadHandler({ wizlet: this });
        };


        HeatmapComponent.prototype.reRenderOnLiveUpdate = function (event) {
            var self = event.data.context;
            delete self.rendering;
            return self.render();
        };

        HeatmapComponent.prototype.render = function (options) {
            var self = this;
            self.rendering = new Q.defer();
            return self.templateDefer.promise.then(function (template) {
                if (self.wizletInfo.sorting) {
                    if (self.wizletInfo.sorting.question.indexOf("db:") > -1) {
                        self.wizletInfo.sorting.question = self.wizletInfo.sorting.question.split("db:").pop();
                    }
                }
                if (self.wizletInfo.teamName) {
                    if (self.wizletInfo.teamName.question.indexOf("db:") > -1) {
                        self.wizletInfo.teamName.question = self.wizletInfo.teamName.question.split("db:").pop();
                    }
                }

                var questions = [], optionMap = {};
                self.wizletInfo.questions.forEach(function (q) {
                    questions.push(q.binding)
                });

                if (self.wizletInfo.teamName && self.wizletInfo.teamName.question) {
                    questions.push(self.wizletInfo.teamName.question);
                }

                self.wizletInfo.options.forEach(function (opt) {
                    var val = "opt_" + opt.val;
                    optionMap[val] = opt;
                    //console.log(optionMap);
                });

                self.isDelivery = self.wizletInfo.isDelivery || false;
                // get question votes
                self.wizerApi.getVotesByQuestionName(questions, self.wizletInfo.trackQuestion, self.wizletInfo.sorting, null, self.isDelivery).then(function (response) {
                    //console.log(response);
                    if (self.wizletInfo.heatmapType == "OPTION") {
                        self.processOptionData(response.participants, optionMap);
                    } else {
                        self.processQuestionData(response.participants, optionMap);
                    }
                    var fragment = template(self.wizletInfo);
                    self.wizletContext.html(fragment);
                    self.rendering.resolve(true);
                })

            });

            return self.rendering.promise;
            //})
            //.fail(this.wizerApi.showError)
        };
        /*
            process data for option display
        */
        HeatmapComponent.prototype.processOptionData = function (participants, optionMap) {
            var self = this;
            var columnHeaders = [self.wizletInfo.columnLabel];
            var rows = [];
            var qName, val, cls, rowHeader;
            if (self.wizletInfo.direction == "VERTICAL") {
                self.wizletInfo.options.forEach(function (option) {
                    columnHeaders.push(option.title);
                });

                participants.forEach(function (participant, index) {
                    rowHeader = participant.name;
                    if (self.wizletInfo.teamName.question &&
                        participant.questionMap[self.wizletInfo.teamName.question] &&
                        participant.questionMap[self.wizletInfo.teamName.question].value) {
                        rowHeader = participant.questionMap[self.wizletInfo.teamName.question].value;
                    }
                    var rowObj = { header: rowHeader, data: [] };
                    rows.push(rowObj);

                    var question = self.wizletInfo.questions[0].binding;
                    
                    self.wizletInfo.options.forEach(function (option) {
                        cls = "";
                        if (participant.questionMap[question] &&
                            participant.questionMap[question].value == option.val) {
                            val = participant.questionMap[question].value;
                            cls = option.class || "";
                        }
                        else {
                            val = "";
                        }
                        
                        rowObj.data.push({
                            value: val,
                            cls: cls
                        });
                    });
                });

            } else {
                participants.forEach(function (participant, index) {
                    if (self.wizletInfo.teamName &&
                        self.wizletInfo.teamName.question &&
                        participant.questionMap[self.wizletInfo.teamName.question] &&
                        participant.questionMap[self.wizletInfo.teamName.question].value) {
                        columnHeaders.push(participant.questionMap[self.wizletInfo.teamName.question].value);
                    }
                    else {
                        columnHeaders.push(participant.name);
                    }
                    //console.log(columnHeaders);
                });
                var question = self.wizletInfo.questions[0].binding;

                self.wizletInfo.options.forEach(function (option) {
                    var rowObj = { header: option.title, data: [] };
                    rows.push(rowObj);
                    participants.forEach(function (participant, index) {
                        cls = "";
                        if (participant.questionMap[question] &&
                            participant.questionMap[question].value == option.val) {
                            //val = participant.questionMap[question].value;
                            val = participant.questionMap[question].value;
                            cls = option.class || "";
                        }
                        else {
                            val = "";
                        }
                        //cls = optionMap["opt_" + val] ? optionMap["opt_" + val].class : "";
                        rowObj.data.push({
                            value: val,
                            cls: cls
                        });
                        //console.log(rowObj);
                    });
                });
            }

            self.wizletInfo.heatmapData = { columnHeaders: columnHeaders, rows: rows };
        }

        /*
            process data for option display
        */
        HeatmapComponent.prototype.processQuestionData = function (participants, optionMap) {
            var self = this;
            var columnHeaders = [self.wizletInfo.columnLabel];
            var rows = [];
            var qName, val, cls, rowHeader;
            if (self.wizletInfo.direction == "VERTICAL") {
                self.wizletInfo.questions.forEach(function (q) {
                    columnHeaders.push(q.title);
                });

                participants.forEach(function (participant, index) {
                    rowHeader = participant.name;
                    if (self.wizletInfo.teamName &&
                        self.wizletInfo.teamName.question &&
                        participant.questionMap[self.wizletInfo.teamName.question] &&
                        participant.questionMap[self.wizletInfo.teamName.question].value) {
                        rowHeader = participant.questionMap[self.wizletInfo.teamName.question].value;
                    }
                    var rowObj = { header: rowHeader, data: [] };
                    rows.push(rowObj);

                    self.wizletInfo.questions.forEach(function (q) {
                        if (participant.questionMap[q.binding]) {
                            val = participant.questionMap[q.binding].value;
                        }
                        else {
                            val = "";
                        }
                        cls = optionMap["opt_" + val] ? optionMap["opt_" + val].class : "";
                        rowObj.data.push({
                            value: val,
                            cls: cls
                        });
                    });
                });

            } else {
                participants.forEach(function (participant, index) {
                    if (self.wizletInfo.teamName &&
                        self.wizletInfo.teamName.question &&
                        participant.questionMap[self.wizletInfo.teamName.question] &&
                        participant.questionMap[self.wizletInfo.teamName.question].value) {
                        columnHeaders.push(participant.questionMap[self.wizletInfo.teamName.question].value);
                    }
                    else {
                        columnHeaders.push(participant.name);
                    }
                    //console.log(columnHeaders);
                });

                self.wizletInfo.questions.forEach(function (q) {
                    var rowObj = { header: q.title, data: [] };
                    rows.push(rowObj);
                    participants.forEach(function (participant, index) {
                        if (participant.questionMap[q.binding]) {
                            val = participant.questionMap[q.binding].value;
                            //console.log(val);
                        }
                        else {
                            val = "";
                        }
                        cls = optionMap["opt_" + val] ? optionMap["opt_" + val].class : "";
                        rowObj.data.push({
                            value: val,
                            cls: cls
                        });
                        //console.log(rowObj);
                    });
                });
            }

            self.wizletInfo.heatmapData = { columnHeaders: columnHeaders, rows: rows };
        }

        HeatmapComponent.getRegistration = function () {
            return new HeatmapComponent();
        };

        return HeatmapComponent;

    });