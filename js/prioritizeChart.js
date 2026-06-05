define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT', 'highcharts-styled', 'css!lib/highcharts/code/css/highcharts.css', 'numeral', 'jsCalcLib/numberFormatting', 'WizerModel'], function ($, Q, WizerApi, WizletBase, doT, Highcharts, HighchartsCss, numeral, numberFormatting, WizerModel) {

    var PrioritizeChart = function () {
        this.type = 'PrioritizeChart';
        this.level = 1;
    };

    PrioritizeChart.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        var self = this;

        self.wizletInfo = wizletInfo;
        self.wizletContext = wizletContext;
        self.wizerApi = wizerApi;
        self.wizerModel = WizerModel.getInstance() || new WizerModel({ wizerApi: this.wizerApi });
        self.templateDefer = Q.defer();

        var requirements = [];
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'prioritizeChart.dot'));


        if (wizletInfo.css) {
            requirements.push('css!' + wizletInfo.css);
        }

        require(requirements, function (doTTemplate, likesTemplates, css) {
            var templates = [doTTemplate, likesTemplates];

            self.templateDefer.resolve(templates);
        });

        return WizletBase.loadHandler({ wizlet: self, render: self.render });
    };

    PrioritizeChart.prototype.unloadHandler = function () {
        WizletBase.unloadHandler({ wizlet: this });
    };

    PrioritizeChart.prototype.render = function (options) {
        var self = this;
        var rendering = new Q.defer();

        return self.templateDefer.promise.then(function (templates) {
            self.templates = templates;

            var fragment = self.templates[0](options.wizletInfo);
            options.context.html(fragment);

            return self.renderDecisionInChart().then(function () {
                rendering.resolve(true);
            });

        })
            .fail(self.wizerApi.showError);
        return rendering.promise;
    };

    PrioritizeChart.prototype.renderDecisionInChart = function () {

        var self = this;
        var rendering = new Q.defer();

        var chartDefaults = {
            'yAxis': {
                'min': 0,
                'title': {
                    'text': '',
                    'align': 'middle',
                    'margin': 10
                },
                'labels': {
                    'overflow': 'justify',
                    'style': { 'color': '#333' }
                },
                'stackLabels': {
                    'enabled': false,
                    'style': {
                        'fontWeight': 'bold',
                        'color': 'gray'
                    }
                }
            },
            'tooltip': {
                'headerFormat': '<b>{point.x}</b><br/>',
                'formatter': function () {
                    return '<b>' + this.x + '</b>' + '<br/>' + '<b>' + this.series.name + '</b>: ' + Highcharts.numberFormat(this.point.y, 2) + ' %';
                }
            },
            'plotOptions': {
                'bar': {
                    'dataLabels': {
                        'enabled': true,
                        'formatter': function () {
                            return Highcharts.numberFormat(this.point.y, 2) + ' %';
                        }
                    }
                },
                'series': {
                    'stacking': ''
                }
            }
        };

        var chartOptions = self.wizletInfo.chartConfig;

        chartOptions = $.extend(true, {}, chartDefaults, chartOptions);

        if (typeof self.wizletInfo.questions !== "undefined") {

            return self.fetchVotes().then(function (data) {


                var series = [{
                    'name': 'Vote',
                    'data': []
                }];

                if (data) {

                    var totalVotes = 0;
                    for (var i = 0; i < data.length; i++) {
                        totalVotes += data[i].votes.length;
                        var votesSum = 0;
                        data[i]['votesSum'] = 0;
                        for (var j = 0; j < data[i].votes.length; j++) {
                            votesSum += Number(data[i].votes[j].Response);

                        }
                        data[i]['votesSum'] = votesSum;

                    }

                    // on updated array

                    for (var i = 0; i < data.length; i++) {

                        var votesSum = 0;
                        data[i]['votePercentage'] = 0;

                        data[i]['votePercentage'] = (data[i]['votesSum'] / totalVotes) * 100;

                    }

                    // sort based on no of votes by particpants
                    sortedArray = data.sort((a, b) => (b.votes.length - a.votes.length)).slice(0, 5);


                    // sort based on avarage votes Percentage
                    sortedArray = sortedArray.sort((a, b) => (b.votePercentage - a.votePercentage)).slice(0, 5);


                    for (var i = 0; i < self.wizletInfo.questions.questions.length; i++) {


                        var seriesDataArray = sortedArray.filter(function (ser) {
                            return ser.question == self.wizletInfo.questions.questions[i].binding;
                        })[0];

                        if (seriesDataArray && seriesDataArray.votes.length > 0) {
                            // push avarage votes Percentage to display in graphs
                            series[0].data.push((seriesDataArray.votePercentage));
                        } else {
                            series[0].data.push(0);
                        }

                        chartOptions.xAxis.categories.push(self.wizletInfo.questions.questions[i].title);
                    }
                }

                self.renderChartData.call(self, series, chartOptions, self.wizletContext.find('[data-chart-container]'));
                rendering.resolve(true);
            });
        }
        else {
            rendering.resolve(false);
        }

        return rendering.promise;

    };

    PrioritizeChart.prototype.fetchVotes = function () {

        var self = this;
        var gettingVotes = new Q.defer();
        var questions = [];
        var submissionQuestion = [];
        self.seriesData = [];

        for (var i = 0; i < self.wizletInfo.questions.questions.length; i++) {
            questions.push(self.wizletInfo.questions.questions[i].binding);
        }

        self.wizerApi.getCascadeMeetingResults(Wizer.EventId, questions, self.wizletInfo.decisionFilters, self.wizletInfo.meetingCode).then(function (res) {

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
            self.wizerApi.getSubmissionStatusTime(Wizer.EventId, self.wizletInfo.SubmissionStatusQuestions, self.wizletInfo.decisionFilters, self.wizletInfo.meetingCode).then(function (res) {
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
            self.wizerApi.getSubmissionStatusTime(Wizer.EventId, self.wizletInfo.SubmissionDebriefQuestions, self.wizletInfo.decisionFilters, self.wizletInfo.meetingCode).then(function (res) {
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

    PrioritizeChart.prototype.processVotes = function (votes) {

    }

    PrioritizeChart.prototype.getAverageTime = function (durations) {
        var sum = durations.reduce(function (a, b) { return a + +new Date('1970T' + b + 'Z'); }, 0);
        return new Date(sum / durations.length + 500).toJSON().slice(11, 19);
    };

    PrioritizeChart.prototype.renderChartData = function (data, chartOptions, chartElem) {

        chartOptions.series = data;
        chartElem.highcharts(chartOptions);
    };

    PrioritizeChart.getRegistration = function () {
        return new PrioritizeChart();
    };

    return PrioritizeChart;

});