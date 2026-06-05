define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT', 'highcharts-styled', 'highcharts-styled-more', 'css!lib/highcharts/code/css/highcharts-modified.css', 'numeral', 'jsCalcLib/numberFormatting', 'WizerModel'], function ($, Q, WizerApi, WizletBase, doT, Highcharts, HighchartsMore, HighchartsCss, numeral, numberFormatting, WizerModel) {

    var SubmissionStatus = function () {
        this.type = 'SubmissionStatus';
        this.level = 1;
    };

    SubmissionStatus.getRegistration = function () {
        return new SubmissionStatus();
    };

    SubmissionStatus.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi, calledFrom) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;
        this.wizerModel = WizerModel.getInstance() || new WizerModel({ wizerApi: this.wizerApi });
        this.calledFrom = calledFrom;
        this.templateDefer = Q.defer();
        var self = this;
        var requirements = [];
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'submissionStatus.dot'));


        requirements.push(WizletBase.loadTemplate(wizletInfo, 'pendingParticipantGauge.dot'));

        requirements.push(WizletBase.loadTemplate(wizletInfo, 'pendingParticipantList.dot'));


        if (wizletInfo.css) {
            requirements.push(WizletBase.loadCss(wizletInfo));
        }
        require(requirements, function (doTTemplate, pendingParticipantGaugeTemplate, pendingParticipantListTemplate, css) {
            var templates = [doTTemplate, pendingParticipantGaugeTemplate, pendingParticipantListTemplate]
            self.templateDefer.resolve(templates);
        });

        if (self.wizletInfo.liveUpdate === undefined || self.wizletInfo.liveUpdate === null) {
            self.wizletInfo.liveUpdate = true;
        }

        if (self.wizletInfo.showStatusGauge === undefined || self.wizletInfo.showStatusGauge === null) {
            self.wizletInfo.showStatusGauge = true;
        }

        if (self.wizletInfo.showStatusParticipantList === undefined || self.wizletInfo.showStatusParticipantList === null) {
            self.wizletInfo.showStatusParticipantList = true;

        }

        if (self.wizletInfo.showPercentagecomplete === undefined || self.wizletInfo.showPercentagecomplete === null) {
            self.wizletInfo.showPercentagecomplete = false;
        }

        if (self.wizletInfo.pendingParticipantListNumber === undefined || self.wizletInfo.pendingParticipantListNumber === null) {
            self.wizletInfo.pendingParticipantListNumber = 5;
        }


        if (self.wizletInfo.liveUpdate) {
            $(document).off("wizer:actionSubmit:command:change", self.handleSubmissionStatusCommands.bind(self)).on("wizer:actionSubmit:command:change", self.handleSubmissionStatusCommands.bind(self));
        }

        return WizletBase.loadHandler({
            wizlet: this,
            render: this.render
        });
    };


    SubmissionStatus.prototype.unloadHandler = function () {

        //unload wizletbase
        $(document).off("wizer:actionSubmit:command:change", this.handleSubmissionStatusCommands);
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.setCacheInterval) {
            clearInterval(this.setCacheInterval);
        }
        if (this.timerQsnId) {
            self.wizerApi.addVotes({ votes: [{ questionId: this.timerQsnId, responseText: this.currentTimerValue }] });
        }

        WizletBase.unloadHandler({
            wizlet: this
        });
    };

    SubmissionStatus.prototype.render = function (options) {
        var self = this;
        var getPromise = Q.defer();
        self.options = options;

        return self.templateDefer.promise.then(function (templates) {
            self.templates = templates;
            var trackQuestion = self.wizletInfo.trackQuestion;
            var qsnId = self.wizerApi.getQuestionIdByName(self.wizletInfo.trackQuestion + '_FOREMAN');

            return self.wizerApi.getVotesByParticipant([qsnId]).then(function (response) {
                if (response && response.votes && response.votes[qsnId].length > 0) {
                    return self.wizerApi.getLeaderCode(qsnId, trackQuestion).then(function (code) {
                        if (code) {
                            self.meetingCode = code;

                            var fragment = self.templates[0](options.wizletInfo);
                            options.context.html(fragment);
                            self.wizletContext.find('[data-tssccontent]').addClass('tssc-content--collapse');
                            if (!self.wizletInfo.showPendingParticipantList) {
                                self.wizletContext.find('[data-tssccontentbody]').addClass('tssc-content__body--hidden');
                                self.wizletContext.find('[data-tssccontent]').addClass('tssc-content--collapse');
                                self.wizletContext.find('[data-pendingparticipantcount]').addClass('tssc-participant__count--shown');
                                self.wizletContext.find('[data-tssccontentexpandcollapse]').addClass('cl-icon--pointUp');
                            } else {
                                self.wizletContext.find('[data-tssccontentexpandcollapse]').addClass('cl-icon--pointDown');
                                self.wizletContext.find('[data-tssccontentbody]').addClass('tssc-content__body--hidden');
                                self.wizletContext.find('[data-pendingparticipantcount]').addClass('tssc-participant__count--shown');
                            }

                            self.wizletContext.find('[data-tssccontentheader]').off('click').on('click', function () {
                                self.wizletContext.find('[data-tssccontentbody]').toggleClass('tssc-content__body--hidden');
                                self.wizletContext.find('[data-tssccontent]').toggleClass('tssc-content--collapse');
                                self.wizletContext.find('[data-pendingparticipantcount]').toggleClass('tssc-participant__count--shown');

                                if (self.wizletContext.find('[data-tssccontentexpandcollapse]').hasClass('cl-icon--pointUp')) {
                                    self.wizletContext.find('[data-tssccontentexpandcollapse]').addClass('cl-icon--pointDown').removeClass('cl-icon--pointUp');
                                } else {
                                    self.wizletContext.find('[data-tssccontentexpandcollapse]').addClass('cl-icon--pointUp').removeClass('cl-icon--pointDown');
                                }
                            });

                            return self.wizerApi.getCurrentAction().then(function (resp) {
                                if (resp) {
                                    self.actionName = resp.scriptName;

                                    self.wizerApi.saveQuestion('SubmissionStatus_' + self.actionName).then(function (response) {

                                        if (response.success) {
                                            self.timerQsnId = response.question.questionId;
                                        }
                                     

                                        self.wizerApi.getVotesByParticipant([self.timerQsnId]).then(function (response) {
                                            if (response && response.votes && response.votes[self.timerQsnId].length > 0) {
                                                self.currentTimerValue = response.votes[self.timerQsnId][0];
                                            } else {
                                                self.currentTimerValue = self.wizletContext.find('[data-tssctimer] p').html();
                                            }

                                            if (self.timerQsnId) {
                                                self.wizerApi.addVotes({ votes: [{ questionId: self.timerQsnId, responseText: self.currentTimerValue }] });
                                            }


                                            var interval = self.wizletInfo.setCacheInterval ? (self.wizletInfo.setCacheInterval * 1000) : 10000;
                                            self.setCacheInterval = setInterval(function () {

                                                if (self.timerQsnId) {
                                                    self.wizerApi.addVotes({ votes: [{ questionId: self.timerQsnId, responseText: self.currentTimerValue }] });
                                                }

                                            }, interval);

                                            self.startTimer();
                                            if (self.calledFrom !== 'test') {
                                                self.timerInterval = setInterval(function () {
                                                    self.startTimer();
                                                }, 1000);
                                            }


                                        });
                                    });
                                }

                                return self.renderGaugeAndPendingParticipantsList().then(function () {
                                    getPromise.resolve(true);
                                });

                            });



                        } else {
                            var fragment = self.templates[0](options.wizletInfo);
                            options.context.html(fragment);

                            getPromise.resolve(true);
                        }
                    });
                } else {
                    getPromise.resolve(false);
                }
            });
        })
            .fail(self.wizerApi.showError);
        return getPromise.promise;
    };

    SubmissionStatus.prototype.renderGaugeAndPendingParticipantsList = function () {
        var self = this;
        var pendingParticipantGaugeTemplate;
        var pendingParticipantListTemplate;
        var rendering = new Q.defer();

        return self.getSubmissionStatus().then(function (result) {

        

                self.processParticipantData(result);
                pendingParticipantGaugeTemplate = self.templates[1]();
                self.wizletContext.find('[data-tsscpendingparticipantdetails]').html(pendingParticipantGaugeTemplate);

                if (self.wizletInfo.showStatusParticipantList) {
                    pendingParticipantListTemplate = self.templates[2]({ participantArray: self.pendingParticipantArray, wizletInfo: self.wizletInfo, showPendingParticipantList: self.wizletInfo.showStatusParticipantList, pendingParticipantListNumber: self.wizletInfo.pendingParticipantListNumber });

                    self.wizletContext.find('[data-tssclistcontainer]').html(pendingParticipantListTemplate);
                }

                if (self.wizletInfo.showStatusParticipantList || self.wizletInfo.showStatusGauge) {
                    self.wizletContext.find('[data-pendingparticipantcount]').attr('data-pendingparticipantcount', self.pendingParticipantCount);
                }

                if (self.wizletInfo.showStatusGauge) {

                    return self.renderDecisionInChart().then(function () {
                        rendering.resolve(true);
                    });
                }

          
        });

        return rendering.promise;
    };

    SubmissionStatus.prototype.renderGaugeAndPendingParticipantsListOnListUpdate = function () {
        var self = this;
        var pendingParticipantListTemplate;
        var rendering = new Q.defer();

        return self.getSubmissionStatus().then(function (result) {
          
            self.processParticipantData(result);

                if (self.wizletInfo.showStatusParticipantList) {

                    pendingParticipantListTemplate = self.templates[2]({ participantArray: self.pendingParticipantArray, wizletInfo: self.wizletInfo, showPendingParticipantList: self.wizletInfo.showStatusParticipantList, pendingParticipantListNumber: self.wizletInfo.pendingParticipantListNumber });
                    self.wizletContext.find('[data-tssclistcontainer]').html('').html(pendingParticipantListTemplate);

                }

                if (self.wizletInfo.showStatusGauge) {
                    var chartElem = self.wizletContext.find('[data-tsscgaugecontainer]');
                    var chart = chartElem.highcharts();

                    if (chart) {
                        if (self.wizletInfo.showPercentagecomplete && self.percentageparticipantcompleted !== undefined) {
                            chart.series[0].points[0].update(Number(self.percentageparticipantcompleted));
                            $(chart.series[0].points[0].dataLabel.div).find('div span[data-tsscgaugedatalabel]').html(self.percentageparticipantcompleted + '%');
                        }
                        else {
                            chart.series[0].points[0].update(self.completedParticipantCount);
                            $(chart.series[0].points[0].dataLabel.div).find('div span[data-tsscgaugedatalabel]').html(self.pendingParticipantArray.length);
                        }


                    }




                }


                if (self.wizletInfo.showStatusGauge || self.wizletInfo.showStatusParticipantList) {
                    self.wizletContext.find('[data-pendingparticipantcount]').attr('data-pendingparticipantcount', self.pendingParticipantCount);
                }

                rendering.resolve(true);
           
        });

        return rendering.promise;
    };

    SubmissionStatus.prototype.startTimer = function () {
        var self = this;

        var ss = self.currentTimerValue.split(":");
        var dt = new Date();
        dt.setHours(ss[0]);
        dt.setMinutes(ss[1]);
        dt.setSeconds(ss[2]);

        var dt2 = new Date(dt.valueOf() + 1000);
        var temp = dt2.toTimeString().split(" ");
        var ts = temp[0].split(":");
        var timeToShow = ts[0] + ":" + ts[1] + ":" + ts[2];

        self.wizletContext.find('[data-tssctimer] p').html(timeToShow);
        self.currentTimerValue = timeToShow;
    };

    SubmissionStatus.prototype.renderDecisionInChart = function () {
        var self = this;
        var renderingChart = new Q.defer();
        var chartDefaults = {};
        var yaxisLabel = 0;

        require(['highcharts-styled-solid-gauge'], function () {
            var chartOptions = self.wizletInfo.chartConfig;

            if (self.wizletInfo.showPercentagecomplete) {
                yaxisLabel = 100;
            }
            else {
                yaxisLabel = self.participantCount;
            }

            if (chartOptions.yAxis) {
                chartOptions.yAxis.min = 0;
                chartOptions.yAxis.max = yaxisLabel;
            } else {
                chartOptions.yAxis = {
                    'min': 0,
                    'max': yaxisLabel
                }
            }

            if (window.innerWidth <= 767) {
                chartOptions.pane.center = ['50%', '35%'];
            }
            chartOptions.yAxis.tickPositions = [chartOptions.yAxis.min, chartOptions.yAxis.max];
          
            if (self.wizletInfo.showPercentagecomplete && self.percentageparticipantcompleted !== undefined) {
                chartOptions.series[0].data.push(Number(self.percentageparticipantcompleted));
            }
            else {
                chartOptions.series[0].data.push(self.completedParticipantCount);
            }

            if (self.wizletInfo.showPercentagecomplete) {
                chartOptions.series[0].dataLabels.format = "<div style='text-align:center'><span data-tsscgaugedatalabel>" + self.percentageparticipantcompleted + "%</span><br/><span>Complete</span></div>";
            }
            else {
                chartOptions.series[0].dataLabels.format = "<div style='text-align:center'><span data-tsscgaugedatalabel>" + self.pendingParticipantCount + "</span><br/><span>Pending</span></div>";
            }
            chartOptions = $.extend(true, {}, chartDefaults, chartOptions);

            self.renderChartData.call(self, chartOptions, self.wizletContext.find('[data-tsscgaugecontainer]'));
            renderingChart.resolve(true);
        });

        return renderingChart.promise;
    };

    SubmissionStatus.prototype.renderChartData = function (chartOptions, chartElem) {
        var self = this;
        self.chart = chartElem.highcharts(chartOptions);
    };

    SubmissionStatus.prototype.getSubmissionStatus = function () {
        var self = this;
        var getting = new Q.defer();

        self.wizerApi.getPendingParticipantList(self.meetingCode).then(function (result) {
            if (result.success) {
                getting.resolve(result);
            } else {
                getting.resolve(false);
            }
        });

        return getting.promise;
    };

    SubmissionStatus.prototype.processParticipantData = function (result) {
        var participantList = result.ParticipantList;
        var self = this;
      

        self.pendingParticipantArray = [];

        if (participantList && participantList.length > 0) {
            self.participantCount = participantList.length;

            var participants = participantList.filter(function (participant) {
                return participant.IsResponseSubmitted === 0;
            });

            if (participants && participants.length > 0) {

                for (var i = 0; i < participants.length; i++) {
                    self.pendingParticipantArray.push({
                        'name': participants[i].Name,
                        'id': participants[i].ParticipantId
                    });
                }
                
              
            }

            self.pendingParticipantCount = self.pendingParticipantArray.length;
            self.completedParticipantCount = self.participantCount - self.pendingParticipantArray.length;
            self.percentageparticipantcompleted = ((self.completedParticipantCount / self.participantCount) * 100).toFixed(0);
          
        };

      
       
    }

        SubmissionStatus.prototype.handleSubmissionStatusCommands = function (event, options, command) {
            var self = this;
            switch (options.type) {
                case "ParticipantActionSubmit":
                    self.renderGaugeAndPendingParticipantsListOnListUpdate();
                    break;
                default:
                    break;
            }
        };

        return SubmissionStatus;
    });