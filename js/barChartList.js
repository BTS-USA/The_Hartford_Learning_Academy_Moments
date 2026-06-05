define(['jquery', 'Q', 'wizer-api', 'logger', 'wizletBase', 'doT'], function ($, Q, WizerApi, log, WizletBase, doT) {
    var BarChartList = function () {
        this.type = 'BarChartList';
        this.level = 1;
    };
    BarChartList.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;
        this.templateDefer = Q.defer();
        var self = this;
        var requirements = [];
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'barChartList.dot'));

        if (wizletInfo.css) {
            requirements.push(WizletBase.loadCss(wizletInfo));
        }
        require(requirements, function (doTTemplate, css) {
            self.templateDefer.resolve(doTTemplate);
        });
        return WizletBase.loadHandler({
            wizlet: this,
            render: this.render
        }).then(function () { });
    };
    BarChartList.prototype.unloadHandler = function () {
        //unload wizletbase
        WizletBase.unloadHandler({
            wizlet: this
        });
    };

    BarChartList.prototype.render = function (options) {
        var self = this;
       
        return self.templateDefer.promise.then(function (template) {
            //fetch all votes from api & calculate avg
            if (options.wizletInfo.type == 'SumChart') {
                var calculating = self.getSumChartVotePercentage(options.wizletInfo);
            } else {
                var calculating = self.calculateAverage(options.wizletInfo);
            }

            var sectionArray = options.wizletInfo.sections;
            self.wizletInfo = options.wizletInfo;
            options.wizletInfo.display = (options.wizletInfo.display) ? options.wizletInfo.display : "percent"
            if (typeof options.wizletInfo.filterQuestions !== 'undefined') {
                if (options.wizletInfo.filterQuestions[0]) {
                    var initialFilter = options.wizletInfo.filterQuestions[0].options[0].value;
                    var noFilterText = options.wizletInfo.filterQuestions[0].options[0].description;
                }
            }
            return calculating.then(function (response) {
                var voteArray = response.votes;
                var i = 0;
                if (voteArray.length) {
                    //Appending vote Count Percentage in wizletInfo
                    if (options.wizletInfo.type == 'SumChart') {
                        if (options.wizletInfo.display == "vote") {
                            i = 0;
                            sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == voteArray[i].questName) {
                                        question.questionId = voteArray[i].questionId;
                                        question.barCharts = [(voteArray[i].voteCountPercentage).toFixed(1)];
                                        question.ranking = [(voteArray[i].VoteCount).toFixed(0)];
                                    }
                                    i++
                                })
                            });
                        } else {
                            i = 0;
                            sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == voteArray[i].questName) {
                                        question.questionId = voteArray[i].questionId;
                                        question.barCharts = [(voteArray[i].voteCountPercentage).toFixed(1)];
                                    }
                                    i++
                                })
                            });
                        }
                        
                    } else {
                        if (options.wizletInfo.display == "average" ) {
                            i = 0;
                            sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == voteArray[i].questName) {
                                        question.questionId = voteArray[i].questionId;
                                        question.barCharts = [(voteArray[i].rankingValue).toFixed(1)];
                                        question.ranking = [(voteArray[i].Ranking).toFixed(1)];
                                    }
                                    i++
                                })
                                if (self.wizletInfo.sortingEnabled)
                                    self.sortByVotes(section.questions);
                            });
                        }else if (options.wizletInfo.display == "vote"){
                            i = 0;
                            sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == voteArray[i].questName) {
                                        question.questionId = voteArray[i].questionId;
                                        question.barCharts = [(voteArray[i].voteCountPercentage).toFixed(1)];
                                        question.ranking = [(voteArray[i].Ranking).toFixed(1)];
                                    }
                                    i++
                                })
                                if (self.wizletInfo.sortingEnabled)
                                    self.sortByVotes(section.questions);
                            });
                        } else {
                            i = 0;
                            sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == voteArray[i].questName) {
                                        question.questionId = voteArray[i].questionId;
                                        question.barCharts = [(voteArray[i].voteCountPercentage).toFixed(1)];
                                    }
                                    i++
                                })
                                if (self.wizletInfo.sortingEnabled)
                                    self.sortByVotes(section.questions);
                            });
                        }    
                    }
                }
                if (options.wizletInfo.votesAmount) {
                    options.wizletInfo.votesAmount.val = response.totalVote;
                }
                if (options.wizletInfo.average) {
                    options.wizletInfo.average.val = (response.avg).toFixed(1);
                }
                var fragment = template(options.wizletInfo);
                options.context.html(fragment);
                if (options.wizletInfo.animation) {
                    self.getAnnimationEffect(options.context);
                }
                options.context.find("[data-filter=" + initialFilter + "]").find('input[type="checkbox"]').prop('checked', true);
                var selectedFilterArray = [];
                selectedFilterArray.push({
                    "filterId": initialFilter,
                    "voteArray": voteArray
                });

                var contextId = $(options.context).attr('id');
                options.context.find('[data-bclccheckbox]').each(function () {
                    var checkBoxId = $(this).attr('id');
                    var label = $(this).siblings('label');

                    var newcheckBoxId = contextId + "-" + checkBoxId;

                    $(this).attr('id', newcheckBoxId);
                    label.attr('for', newcheckBoxId);
                });

                var componentVersion = Number(options.wizletInfo.version) || 1;
                if (componentVersion === 1) {
                    options.context.find('[data-barChartListFilter]').find('[data-barChartListFilterCheck]').off('click').on('click', function () {
                        self.clickedOnFilter({
                            initialFilter: initialFilter,
                            checkBox: this,
                            selectedFilterArray: selectedFilterArray,
                            options: options,
                            sectionArray: sectionArray,
                            noFilterText: noFilterText
                        });
                    });
                }
                else {
                    options.context.find('[data-barChartListFilter]').find('[data-bclcCheckBox]').off('change').on('change', function () {
                        self.clickedOnFilter({
                            initialFilter: initialFilter,
                            checkBox: $(this).parent()[0],
                            selectedFilterArray: selectedFilterArray,
                            options: options,
                            sectionArray: sectionArray,
                            noFilterText: noFilterText
                        });
                    });
                }
            });
        }).fail(this.wizerApi.showError)
    };

    BarChartList.prototype.clickedOnFilter = function (clickOptions) {
        // This code is specifically written for IE, because when we double click on a disabled checkbox, click event gets fired which is incorrect
        if ($(clickOptions.checkBox).find('input[type="checkbox"]').attr("disabled") === "disabled") {
            return;
        }
        //console.log(clickOptions);
        clickOptions.options.context.find("[data-filter=" + clickOptions.initialFilter + "]").find('input[type="checkbox"]').prop('checked', true);
        var count = 0;
        var self = this;
        var unSelectedFilterArray = [];
        var selectedFilter;
        var selectedFilterText;
        //push and pop values from Array, depending upon filters selected or unselected. 
        count = self.pushPopFilterValuesToArray(clickOptions.options.context, count, clickOptions.selectedFilterArray, unSelectedFilterArray);
        //Checking for number of filters selected 
        self.checkForNofFiltersSelected(clickOptions.options.context, count, unSelectedFilterArray);
        // When a filter is cheked
        if ($(clickOptions.checkBox).find('input[type="checkbox"]').is(':checked')) {
            selectedFilter = $(clickOptions.checkBox).data('filter');
            selectedFilterText = self.getFilterName(selectedFilter, clickOptions.options.wizletInfo);
            var callFilterApi;
            if (clickOptions.initialFilter == selectedFilter) {
                callFilterApi = false;
            } else {
                callFilterApi = true;
            }
            //Call Api to get Votes for Corresponding Filter Selected
            var calculatingFilterAvg = self.calculateAverage(clickOptions.options.wizletInfo, selectedFilter, callFilterApi);
            calculatingFilterAvg.then(function (response) {
                self.setTotalVotesAndAvg(clickOptions.options.context, response);
                //Appending New Votes to Section Array    
                var i
                clickOptions.selectedFilterArray.forEach(function (filter, index) {
                    if (filter.filterId == selectedFilter) {
                        if (clickOptions.options.wizletInfo.display == "average") {
                            i = 0;
                            clickOptions.sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == response.votes[i].questName) {
                                        question.questionId = response.votes[i].questionId;
                                        question.barChartsFilter = (response.votes[i].rankingValue).toFixed(1);
                                        question.rankingFilter = (response.votes[i].Ranking).toFixed(1);
                                    }
                                    i++
                                })
                                if (self.wizletInfo.sortingEnabled)
                                    self.sortByVotes(section.questions);
                            });
                        } else if (clickOptions.options.wizletInfo.display == "vote"){
                            i = 0;
                            clickOptions.sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == response.votes[i].questName) {
                                        question.questionId = response.votes[i].questionId;
                                        question.barChartsFilter = (response.votes[i].voteCountPercentage).toFixed(1);
                                        question.rankingFilter = (response.votes[i].Ranking).toFixed(1);
                                    }
                                    i++
                                })
                                if (self.wizletInfo.sortingEnabled)
                                    self.sortByVotes(section.questions);
                            });
                        } else {
                            i = 0;
                            clickOptions.sectionArray.forEach(function (section) {
                                section.questions.forEach(function (question) {
                                    if (question.name == response.votes[i].questName) {
                                        question.questionId = response.votes[i].questionId;
                                        //question.barCharts[selectedFilter] = (response.votes[i].voteCountPercentage).toFixed(1);
                                        question.barChartsFilter = (response.votes[i].voteCountPercentage).toFixed(1);
                                    }
                                    i++
                                })
                                if (self.wizletInfo.sortingEnabled)
                                    self.sortByVotes(section.questions);
                            });
                        }
                    }
                })
                if (selectedFilter != 0) {
                    self.ApplyFilter(clickOptions.options.context, clickOptions.sectionArray, clickOptions.options.wizletInfo, self, clickOptions.noFilterText, selectedFilterText, clickOptions.options.wizletInfo.display);
                }

                if (clickOptions.options.wizletInfo.animation && selectedFilter != 0) {
                    self.getAnnimationEffect(clickOptions.options.context);
                }
            })
        }
            //When a filter is Uncheked.
        else {

            var calculatingFilterAvg = self.calculateAverage(clickOptions.options.wizletInfo, selectedFilter, callFilterApi);
            calculatingFilterAvg.then(function (response) {
                self.setTotalVotesAndAvg(clickOptions.options.context, response);
            });
            //Removing votes from Section Array, when a filter is Unchecked
            clickOptions.options.context.find('[data-barChartListBarChartFilterArray]').remove();
            clickOptions.options.context.find('[data-barChartListFilterName]').html('');
            if (clickOptions.options.wizletInfo.animation && selectedFilter != 0) {
                self.getAnnimationEffect(clickOptions.options.context);
            }
        }
    };

    BarChartList.getRegistration = function () {
        return new BarChartList();
    };
    BarChartList.prototype.sortByVotes = function (voteArray) {
        var self = this;
        voteArray.sort(function (a, b) {
            if (self.wizletInfo.display == "vote") {
                if (self.wizletInfo.sortingOrder == "ASC")
                    return a.ranking - b.ranking;
                else
                    return b.ranking - a.ranking;
            }
            else if (self.wizletInfo.display == "average") {
                if (self.wizletInfo.sortingOrder == "ASC")
                    return a.ranking - b.ranking;
                else
                    return b.ranking - a.ranking;
            }
            else if (self.wizletInfo.display == "percent") {
                if (self.wizletInfo.sortingOrder == "ASC")
                    return a.barCharts - b.barCharts;
                else
                    return b.barCharts - a.barCharts;
            }
        });

    };
    BarChartList.prototype.getAnnimationEffect = function (context) {
        var myself = this;
        context.find("[data-barChartListHorizontalBarChartInner]").each(function () {
            var self = $(this);
            self.children().hide();
            var f = $(this).width();
            var pw = $(this).parent().width();
            var rate = (f / pw * 100).toFixed(1) + '%';
            $(this).width('0px');
            $(this).animate({
                width: rate
            }, 1000, function () {
                self.children().show("fast");
            });
        })
    }
    BarChartList.prototype.setTotalVotesAndAvg = function (context, response) {
        var self = this;
        context.find('[data-barChartListTotalVotesVal]').html(response.totalVote);
        context.find('[data-barChartListAvgVal]').html((response.avg).toFixed(1));
    }
    BarChartList.prototype.pushPopFilterValuesToArray = function (context, count, selectedFilterArray, unSelectedFilterArray) {
        context.find("[data-barChartListFilter]").find('input[type="checkbox"]').each(function (index) {
            if ($(this).is(':checked')) {
                var that = this;
                var pushToArray = true;
                count++;
                selectedFilterArray.forEach(function (filter) {
                    if (filter.filterId == $(that).parents('[data-barChartListFilter]').data('filter')) {
                        pushToArray = false;
                    }
                })
                if (pushToArray) {
                    selectedFilterArray.push({
                        "filterId": $(this).parents('[data-barChartListFilter]').data('filter')
                    });
                }
            } else {
                selectedFilterArray.splice(index, 1);
                unSelectedFilterArray.push($(this).parents('[data-barChartListFilter]').data('filter'));
            }
        });
        return count;
    }
    BarChartList.prototype.checkForNofFiltersSelected = function (context, count, unSelectedFilterArray) {
        if (count >= 2) {
            unSelectedFilterArray.forEach(function (filter) {
                context.find("[data-filter=" + filter + "]").addClass('barChartListdisableCheckbox');
                context.find("[data-filter=" + filter + "]").find("input[type='checkBox']").attr("disabled", "disabled");
            })
        } else {
            context.find('[data-barChartListFilter]').removeClass('barChartListdisableCheckbox');
            context.find('[data-barChartListFilterCheck]').removeClass('barChartListdisableCheckbox');
            context.find('[data-barChartListFilterCheck]').find("input[type='checkBox']").removeAttr("disabled");
        }
    }
    BarChartList.prototype.ApplyFilter = function (context, sectionArray, wizletInfo, self, noFilterText, selectedFilterText, display) {

        // define version of component
        var componentVersion = wizletInfo.version || 0;
        var self = this;
        var newQuestionArray = [];
        sectionArray.forEach(function (section) {
            section.questions.forEach(function (question) {
                newQuestionArray.push(question)
            })
        });
        context.find('[data-barChartListBarChartArray]').find('[data-barChartListFilterName]').html(noFilterText);
        var i = 0;
        // run this if version of component is 2
        if (componentVersion == 2) {
            context.find('[data-barChartListAnswer]').each(function () {
                var that = $(this);
                var el = "<div class='bclc-bar-container' data-barChartListBarChartFilterArray>"
                el += "<div class='bclc-bar cl-bar' style='width:100%'>";
                el += "<div class='bclc-bar__inner cl-bar__inner' data-barChartListHorizontalBarChartInner style='width:" + newQuestionArray[i].barChartsFilter + "%'>";
                if (display == "percent") {
                    el += "<div class='bclc-bubble cl-bubble'>" + newQuestionArray[i].barChartsFilter + "%";
                } else if (display == "average") {
                    el += "<div class='bclc-bubble cl-bubble'>" + newQuestionArray[i].rankingFilter;
                } else if (display == "vote") {
                    el += "<div class='bclc-bubble cl-bubble'>" + newQuestionArray[i].rankingFilter;
                }
                el += "</div></div>";
                el += "</div>";
                el += "<div class='bclc-filter-name'>" + selectedFilterText + "</div>";
                el += "</div>";
                that.append(el);
                i++;
            })
        }

        // run this if version of component is less than 2
        if (componentVersion < 2) {
            context.find('[data-barChartListAnswer]').each(function () {
                var that = $(this);
                var el = "<div class='barChartListBarChartFilterArray' data-barChartListBarChartFilterArray>"
                el += "<div class='barChartListHorizontalBarWraper '>";
                el += "<div class='barChartListHorizontalBarChart style='width:100%'>";
                el += "<div class='barChartListHorizontalBarChartInner' data-barChartListHorizontalBarChartInner style='width:" + newQuestionArray[i].barChartsFilter + "%'>";
                if (display == "percent") {
                    el += "<div class='barChartListBublePercentage'>" + newQuestionArray[i].barChartsFilter + "%";
                    el += "<div class='barChartListDownArrowWhite'><svg height='15' width='15'><polygon points='10,10 5,5 15,5' style='fill:white;stroke:white;stroke-width:1' /></svg>";
                } else if (display == "average") {
                    el += "<div class='barChartListBublePercentageRanking'>" + newQuestionArray[i].rankingFilter;
                    el += "<div class='barChartListDownArrowWhiteRanking'><svg height='15' width='15'><polygon points='10,10 5,5 15,5' style='fill:white;stroke:white;stroke-width:1' /></svg>";
                } else if (display == "vote") {
                    el += "<div class='barChartListBublePercentageVoteFilter'>" + newQuestionArray[i].rankingFilter;
                    el += "<div class='barChartListDownArrowWhiteVoteFilter'><svg height='15' width='15'><polygon points='10,10 5,5 15,5' style='fill:white;stroke:white;stroke-width:1' /></svg>";
                }
                el += "</div></div>";
                el += "</div>";
                el += "</div></div>";
                el += "<div class='barChartListFilterName  '>" + selectedFilterText + "</div>";
                el += "</div>";
                that.append(el);
                i++;
            })
        }
    }
    BarChartList.prototype.getFilterName = function (index, wizletInfo) {
        var filterName
        wizletInfo.filterQuestions[0].options.forEach(function (filter) {
            if (filter.value == index) {
                filterName = filter.description;
            }
        })
        return filterName;
    }
   

    BarChartList.prototype.calculateAverage = function (info, selectedFilter, callFilterApi) {
        var self = this;
        var questionIds = [];
        var newArr = [];
        var countArr = [];
        var questName = [];
        var isDelivery = self.wizletInfo.isDelivery;
        var thingsToWaitForBeforeRendering;
        $.each(info.sections, function (index, section) {
            $.each(section.questions, function (ind, question) {
                var q = question.name;
                var qid = self.wizerApi.getQuestionIdByName(q);
                questionIds.push(qid);
                questName.push(q);
            });
        });
        self.questionIds = questionIds;
        var defer = Q.defer();
        
        var fetching;
        var gettingMyVoteOnTrack;
        // filter is applied
        if (callFilterApi) {
            if (info.trackQuestion && info.trackQuestion !== '') {
                return;
            } else {
                var filterQuestionid = self.wizerApi.getQuestionIdByName(info.filterQuestions[0].binding);
                fetching = self.wizerApi.getVotePercentage({
                    shortNames: questName,
                    filterQuestionId: filterQuestionid,
                    filterText: selectedFilter,
                    isDelivery: isDelivery
                });
                thingsToWaitForBeforeRendering = [fetching];

                Q.all(thingsToWaitForBeforeRendering)
                       .then(function (response) {
                           vote = self.getVotes(response[0], info);
                           defer.resolve(vote);
                       })
            }
        }
            // No Filter is applied
        else {
            
            if (info.trackQuestion && info.trackQuestion !== '') {
                var trackQuestionId = self.wizerApi.getQuestionIdByName(self.wizletInfo.trackQuestion);
                gettingMyVoteOnTrack = self.wizerApi.getMyVotes([trackQuestionId]);
                gettingMyVoteOnTrack.then(function (votes) {
                    self.myVoteonTrack = votes.votes[trackQuestionId];
                    if (!self.myVoteonTrack)
                        Wizer.Api.showError("No Votes of this user on trackQuestion: " + self.wizletInfo.trackQuestion);

                   fetching = self.wizerApi.getVotePercentage({
                        shortNames: questName,
                        filterQuestionId: trackQuestionId,
                        filterText: self.myVoteonTrack[0],
                        sortingOrder: self.wizletInfo.sortingOrder,
                        sortingEnabled: self.wizletInfo.sortingEnabled,
                        isDelivery: isDelivery
                   });

                   thingsToWaitForBeforeRendering = [fetching];

                   Q.all(thingsToWaitForBeforeRendering)
                       .then(function (response) {
                           vote = self.getVotes(response[0], info);
                           defer.resolve(vote);
                       })
                });
            } else {

                    fetching = self.wizerApi.getVotePercentage({
                        shortNames: questName,
                        filterQuestionId: null,
                        filterText: "",
                        sortingOrder: self.wizletInfo.sortingOrder,
                        sortingEnabled: self.wizletInfo.sortingEnabled,
                        isDelivery: isDelivery
                    });

                    thingsToWaitForBeforeRendering = [fetching];
                    Q.all(thingsToWaitForBeforeRendering)
                    .then(function (response) {
                        vote = self.getVotes(response[0], info);
                        defer.resolve(vote);
                    });
            }
        }
        return defer.promise;
    }

    BarChartList.prototype.getVotes = function (response, info) {
        var vote = {};
        var avgArr = [];
        var i = 0;
        var self = this;
        if (info.display == 'percent') {           
            if (info.sections.length > 0) {
                for (var s = 0; s < info.sections.length; s++) {
                    for (var q = 0; q < info.sections[s].questions.length; q++) {
                        var avgPercent = (info.sections[s].questions[q].maxValue - info.sections[s].questions[q].minValue) / 100;
                        if (response.votes[0].list[i].totalVotes > 0) {
                            avg = (response.votes[0].list[i].totalVotes / response.votes[0].list[i].totalCount - info.sections[s].questions[q].minValue);
                            avg = avg / avgPercent;
                            avgArr.push({
                                questName: response.votes[0].list[i].questName,
                                questionId: response.votes[0].list[i].questionId,
                                voteCountPercentage: avg
                            });
                        } else {
                            avg = 0;
                            avgArr.push({
                                questName: response.votes[0].list[i].questName,
                                questionId: response.votes[0].list[i].questionId,
                                voteCountPercentage: avg
                            });
                        }
                        if (q < info.sections[s].questions.length - 1) {
                            i++;
                        }
                    }
                    i++;
                }
            }
        } else {
            var maxValueArray = [];
            info.sections.forEach(function (section) {
                section.questions.forEach(function (question) {
                    maxValueArray.push({
                        questName: question.name,
                        maxValue: question.maxValue
                    });
                });
            });
            for (var i = 0; i < response.votes[0].list.length; i++) {
                var averageVotes = response.votes[0].list[i].averageVotes;
                if (maxValueArray[i].questName == response.votes[0].list[i].questName) {
                    var avgRank = (response.votes[0].list[i].averageVotes / maxValueArray[i].maxValue) * 100;
                }
                if (info.display == 'average') {
                    avgArr.push({
                        questName: response.votes[0].list[i].questName,
                        questionId: response.votes[0].list[i].questionId,
                        Ranking: averageVotes,
                        rankingValue: avgRank
                    });
                } else if (info.display == 'vote') {
                    i = 0;
                    if (info.sections.length > 0) {
                        for (var s = 0; s < info.sections.length; s++) {
                            for (var q = 0; q < info.sections[s].questions.length; q++) {
                                var avgPercent = (info.sections[s].questions[q].maxValue - info.sections[s].questions[q].minValue) / 100;
                                if (response.votes[0].list[i].totalVotes > 0) {
                                    avg = (response.votes[0].list[i].totalVotes / response.votes[0].list[i].totalCount - info.sections[s].questions[q].minValue);
                                    avg = avg / avgPercent;
                                    avgArr.push({
                                        questName: response.votes[0].list[i].questName,
                                        questionId: response.votes[0].list[i].questionId,
                                        Ranking: response.votes[0].list[i].totalVotes,
                                        rankingValue: response.votes[0].list[i].totalVotes,
                                        voteCountPercentage: avg
                                    });
                                } else {
                                    avg = 0;
                                    avgArr.push({
                                        questName: response.votes[0].list[i].questName,
                                        questionId: response.votes[0].list[i].questionId,
                                        Ranking: response.votes[0].list[i].totalVotes,
                                        rankingValue: response.votes[0].list[i].totalVotes,
                                        voteCountPercentage: avg
                                    });
                                }
                                if (q < info.sections[s].questions.length - 1) {
                                    i++;
                                }
                            }
                            i++;
                        }
                    }
                }

            }
        }
        vote.votes = avgArr;
        vote.avg = response.averageVotes;
        vote.totalVote = response.totalVoteCount;

        if (self.wizletInfo.votesAmount) {
            self.wizletInfo.votesAmount.val = vote.totalVote;
        }
        if (self.wizletInfo.average) {
            self.wizletInfo.average.val = (vote.avg).toFixed(1);
        }

        return vote;
    }
    BarChartList.prototype.getSumChartVotePercentage = function (info) {
        var self = this;
        var defer = Q.defer();
        var percentArr = [];
        var vote = {};
        var questionNames = [];
        var questionIds = [];
        var avgPercent;

        for (var s = 0; s < info.sections.length; s++) {
            for (var q = 0; q < info.sections[s].questions.length; q++) {
                questionNames.push(info.sections[s].questions[q].name);
                questionIds.push(self.wizerApi.getQuestionIdByName(info.sections[s].questions[q].name));
                avgPercent = (info.sections[s].questions[q].maxValue - info.sections[s].questions[q].minValue) / 100;
            }
        }

        if (info.trackQuestion) {
            var trackDiffer = new Q.defer();
            //fetch the trackQuestionId and my vote on that trackQuestion. This then becomes the new filterQuestionId and filterText
            var trackQuestionId = self.wizerApi.getQuestionIdByName(info.trackQuestion);
            var gettingMyVoteOnTrack = self.wizerApi.getMyVotes([trackQuestionId]);
            gettingMyVoteOnTrack.then(function (votes) {
                self.myVoteonTrack = votes.votes[trackQuestionId];
                if (self.myVoteonTrack) {
                    trackDiffer.resolve(true);
                }
                else {
                    trackDiffer.resolve(true);
                    Wizer.Api.showError("No Votes of this user on trackQuestion: " + self.wizletInfo.trackQuestion);
                }
            });

            trackDiffer.promise.then(function () {
                self.wizerApi.getSumChartVotePercentage({
                    questionIds: questionIds,
                    trackQuestionId: trackQuestionId,
                    meetingCode: self.myVoteonTrack ? self.myVoteonTrack[0] : ''
                }).then(function (votePercentage) {
                    if (votePercentage.success) {
                        percentArr = self.processVotes(votePercentage, questionNames);
                    }
                    vote.votes = percentArr;
                    defer.resolve(vote);
                });
            });

        } else {
            self.wizerApi.getSumChartVotePercentage({
                questionIds: questionIds
            }).then(function (votePercentage) {
                if (votePercentage.success) {
                    percentArr = self.processVotes(votePercentage, questionNames);
                }
                vote.votes = percentArr;
                defer.resolve(vote);
            });
        }
        return defer.promise;
    };

    BarChartList.prototype.processVotes = function (votePercentage, questionNames) {
        var percentArr = [];
        votePercentage.counts.forEach(function (response) {
            percentArr.push({
                //voteCountPercentage: response.Percentage * avgPercent,
                voteCountPercentage: response.Percentage,
                questionId: response.QuestionId,
                VoteCount: response.VoteCount
            });
        });
        var i = 0;
        percentArr.forEach(function (vote) {
            vote.questName = questionNames[i];
            i++;
        });
        return percentArr;
    }

    return BarChartList;
});