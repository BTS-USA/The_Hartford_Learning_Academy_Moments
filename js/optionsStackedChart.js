define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT', 'highcharts-styled', 'css!lib/highcharts/code/css/highcharts.css', 'numeral', 'jsCalcLib/numberFormatting', 'WizerModel'], function($, Q, WizerApi, WizletBase, doT, Highcharts, HighchartsCss, numeral, numberFormatting, WizerModel) {

    var OptionsStackedChart = function() {
        this.type = 'OptionsStackedChart';
        this.level = 1;
    };

    OptionsStackedChart.prototype.loadHandler = function(unused, wizletInfo, wizletContext, wizerApi) {
        var self = this;

        self.wizletInfo = wizletInfo;
        self.wizletContext = wizletContext;
        self.wizerApi = wizerApi;
        self.wizerModel = WizerModel.getInstance() || new WizerModel({ wizerApi: this.wizerApi });
        self.templateDefer = Q.defer();

        var requirements = [];
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'optionsStackedChart.dot'));


        if (wizletInfo.css) {
            requirements.push('css!' + wizletInfo.css);
        }

        require(requirements, function(doTTemplate, likesTemplates, css) {
            var templates = [doTTemplate, likesTemplates];

            self.templateDefer.resolve(templates);
        });

        return WizletBase.loadHandler({ wizlet: self, render: self.render });
    };

    OptionsStackedChart.prototype.unloadHandler = function() {
        WizletBase.unloadHandler({ wizlet: this });
    };

    OptionsStackedChart.prototype.render = function(options) {
        var self = this;
        var rendering = new Q.defer();

        return self.templateDefer.promise.then(function(templates) {
                self.templates = templates;

                var fragment = self.templates[0](options.wizletInfo);
                options.context.html(fragment);

                return self.renderDecisionInChart().then(function() {
                    rendering.resolve(true);
                });

            })
            .fail(self.wizerApi.showError);
        return rendering.promise;
    };

    OptionsStackedChart.prototype.renderDecisionInChart = function() {
        var self = this;
        var rendering = new Q.defer();

        var chartDefaults = {};
        var series = [];
        var chartElem = self.wizletContext.find('[data-chart-container]');
        var chartOptions = self.wizletInfo.chartConfig;
        var sortedArray = [];

        chartOptions = $.extend(true, {}, chartDefaults, chartOptions);

        if (typeof self.wizletInfo.questionsObject !== 'undefined') {

            return self.fetchVotes().then(function(data) {


                if (data) {
                    var totalVotes = 0;
                    for (var i = 0; i < data.length; i++) {
                        totalVotes += data[i].votes.length;
                    }

                    // sortedArray = data.sort((a,b) => (b.votes.length-a.votes.length)).slice(0,5);
                    sortedArray = data;



                    for (var i = 0; i < self.wizletInfo.options.length; i++) {
                        var option = self.wizletInfo.options[i];
                        option.total = 0;
                        var categories = []

                        for (var q = 0; q < self.wizletInfo.questionsObject.questions.length; q++) {
                            var question = self.wizletInfo.questionsObject.questions[q].binding;
                            categories.push(question);
                            option[question] = { question: question, value: 0 };
                        }
                        //console.log(option);

                        for (var d = 0; d < data.length; d++) {
                            var qName = data[d].question;
                            var votes = data[d].votes;
                            var qObj = option[qName];

                            for (var v = 0; v < votes.length; v++) {
                                var val = votes[v].Response;
                                if (val == option.value) {
                                    qObj.value++;
                                }
                            }

                        }

                        var seriesData = [];

                        for (var q = 0; q < self.wizletInfo.questionsObject.questions.length; q++) {
                            var question = self.wizletInfo.questionsObject.questions[q].binding;
                            var qObj = option[question]
                            seriesData.push(qObj.value);
                        }

                        series.push({ name: option.label, data: seriesData });


                    }
                    //console.log(self.wizletInfo.options);

                    // for (var i = 0; i < self.wizletInfo.questions.questions.length; i++) {
                    //     var seriesData = [];

                    //     var tempSortedArray = sortedArray.filter(function (ser) {
                    //         return ser.question == self.wizletInfo.questions.questions[i].binding;
                    //     })[0];

                    //     if (tempSortedArray && tempSortedArray.votes.length > 0) {
                    //         seriesData.push({
                    //             'option': self.wizletInfo.questions.questions[i].description,
                    //             'value': self.wizletInfo.questions.questions[i].value,
                    //             'responses': tempSortedArray.votes.length
                    //         });
                    //     }




                    //     for (var k = 0; k < seriesData.length; k++) {

                    //         var tempArray = [];
                    //         tempArray.push(seriesData[k].option);
                    //         tempArray.push((seriesData[k].responses / totalVotes) * 100)
                    //         if (!isNaN(tempArray[1])) {
                    //             series.push(tempArray);
                    //         }

                    // }

                    // }



                    self.renderChartData.call(self, series, chartOptions, chartElem);
                }

                rendering.resolve(true);
            });
        } else {
            rendering.resolve(true);
        }

        return rendering.promise;

    };

    OptionsStackedChart.prototype.fetchVotes = function() {

        var self = this;
        var gettingVotes = new Q.defer();
        var questions = [];
        var submissionQuestion = [];
        self.seriesData = [];

        for (var i = 0; i < self.wizletInfo.questionsObject.questions.length; i++) {
            questions.push(self.wizletInfo.questionsObject.questions[i].binding);
        }

        self.wizerApi.getCascadeMeetingResults(Wizer.EventId, questions, self.wizletInfo.decisionFilters, self.wizletInfo.meetingCode).then(function(res) {

            if (res.success) {
                var result = res.CascadeMeetingResult;
                var votes = [];

                if (result && result.length > 0) {
                    for (var i = 0; i < result.length; i++) {
                        votes.push({});
                        votes[i]['question'] = result[i].Question;
                        if (result[i].MeetingParticipantList) {
                            votes[i]['votes'] = [];
                            for (var j = 0; j < result[i].MeetingParticipantList.length; j++) {
                                if (result[i].MeetingParticipantList[j].MeetingVoteList) {
                                    for (var k = 0; k < result[i].MeetingParticipantList[j].MeetingVoteList.length; k++) {
                                        votes[i]['votes'].push(result[i].MeetingParticipantList[j].MeetingVoteList[k]);
                                    }
                                }
                            }
                        }
                    }
                }
                gettingVotes.resolve(votes);
            }

            var durations = []
            self.wizerApi.getSubmissionStatusTime(Wizer.EventId, self.wizletInfo.SubmissionStatusQuestions, self.wizletInfo.decisionFilters, self.wizletInfo.meetingCode).then(function(res) {
                if (res.success) {
                    var counter = 0;
                    for (var i = 0; i < res.submissionStatusTimeList.length; i++) {
                        durations.push(res.submissionStatusTimeList[i]["SubmissionStatusTime"]);
                        counter++;
                    }

                    if (durations.length > 0) {

                        var totaltime = self.getAverageTime(durations);
                        // var totaltime = '00:00:45';
                        var timeArr = totaltime.split(':');
                        var timestr = '';
                        if (timeArr[0] > 0) {
                            timestr = timeArr[0] + " hour" + timeArr[1] + ":" + timeArr[2] + " minutes";
                        } else {
                            timestr = timeArr[1] + ":" + timeArr[2] + " minutes";
                        }

                        self.wizletContext.find("[data-averageactivitytime]").text(timestr);
                    }
                }
            });

            var debriefTimeDurations = []
            self.wizerApi.getSubmissionStatusTime(Wizer.EventId, self.wizletInfo.SubmissionDebriefQuestions, self.wizletInfo.decisionFilters, self.wizletInfo.meetingCode).then(function(res) {
                if (res.success) {
                    var counter = 0;
                    for (var i = 0; i < res.submissionStatusTimeList.length; i++) {
                        debriefTimeDurations.push(res.submissionStatusTimeList[i]["SubmissionStatusTime"]);
                        counter++;
                    }

                    if (debriefTimeDurations.length > 0) {

                        var totaltime = self.getAverageTime(debriefTimeDurations);
                        // var totaltime = '00:00:45';
                        var timeArr = totaltime.split(':');
                        var timestr = '';
                        if (timeArr[0] > 0) {
                            timestr = timeArr[0] + " hour" + timeArr[1] + ":" + timeArr[2] + " minutes";
                        } else {
                            timestr = timeArr[1] + ":" + timeArr[2] + " minutes";
                        }

                        self.wizletContext.find("[data-averageDebriefTime]").text(timestr);
                    }
                }
            });

        });

        return gettingVotes.promise;
    };

    OptionsStackedChart.prototype.processVotes = function(votes) {

    }

    OptionsStackedChart.prototype.getAverageTime = function(durations) {
        var sum = durations.reduce(function(a, b) { return a + +new Date('1970T' + b + 'Z'); }, 0);
        return new Date(sum / durations.length + 500).toJSON().slice(11, 19);
    };

    OptionsStackedChart.prototype.renderChartData = function(data, chartOptions, chartElem) {

        chartOptions.series = data;
        chartElem.highcharts(chartOptions);
    };

    OptionsStackedChart.getRegistration = function() {
        return new OptionsStackedChart();
    };

    return OptionsStackedChart;

});