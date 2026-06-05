define(['jquery', 'Q', 'wizer-api', 'logger', 'wizletBase', 'doT'], function($, Q, WizerApi, log, WizletBase, doT) {
    var StackedBar = function() {
        this.type = 'StackedBar';
        this.level = 1;
    };
    StackedBar.prototype.loadHandler = function(unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;
        this.templateDefer = Q.defer();
        var self = this;
        var requirements = [];
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'stackedBar.dot'));

        if (wizletInfo.css) {
            requirements.push(WizletBase.loadCss(wizletInfo));
        }
        require(requirements, function(doTTemplate, css) {
            self.templateDefer.resolve(doTTemplate);
        });
        return WizletBase.loadHandler({
            wizlet: this,
            render: this.render
        }).then(function() {});
    };
    StackedBar.prototype.unloadHandler = function() {
        //unload wizletbase
        WizletBase.unloadHandler({
            wizlet: this
        });
    };
    StackedBar.getRegistration = function() {
        return new StackedBar();
    };
    StackedBar.prototype.render = function(options) {
        var rendering = new Q.defer();
        var self = this;
        return self.templateDefer.promise.then(function(template) {
            //fetch all votes from api & calculate avg
            var optionArray = options.wizletInfo.responseOptions;
            var questionName = options.wizletInfo.questions[0].binding;
            var questionArray = options.wizletInfo.questions;
            var responseOptions = [];
            var questionNameArray = [];
            if (typeof options.wizletInfo.filterQuestions !== 'undefined') {
                if (options.wizletInfo.filterQuestions[0]) {
                    var initialFilter = options.wizletInfo.filterQuestions[0].options[0].value;
                }
            }
            questionArray.forEach(function(question) {
                question.qId = self.wizerApi.getQuestionIdByName(question.binding);
                questionNameArray.push(question.binding);
            })

            self.wizerApi.getMyTrackVote(self.wizletInfo.trackQuestion)
                .then(function(trackVote) {
                    var filterQUestion = self.wizletInfo.trackQuestion;
                    var filterText = trackVote;

                    var calculating = self.getAverage(questionNameArray, true, filterQUestion, filterText);
                    calculating.then(function(response) {
                        var voteArray = response.votes;
                        questionArray.forEach(function(question) {
                            var barChartArray = [];
                            var widthArray = [];
                            voteArray.forEach(function(vote) {
                                if (question.qId == vote.qId) {
                                    vote.list.forEach(function(list) {
                                        barChartArray.push((list.value).toFixed(1));
                                        widthArray.push(list.value);
                                    })
                                }
                            })
                            question.barChartArray = barChartArray;
                            question.widthArray = widthArray;
                        })
                        var fragment = template(options.wizletInfo);
                        options.context.html(fragment);
                        if (options.wizletInfo.animation) {
                            self.getAnnimationEffect(options, questionArray);
                        }
                        $("[data-filter=" + initialFilter + "]").find('input[type="checkbox"]').prop('checked', true);
                        var selectedFilterArray = [];
                        selectedFilterArray.push({
                            "filterId": initialFilter,
                            "voteArray": voteArray
                        });

                        var contextId = $(options.context).attr('id');
                        options.context.find('[data-sbccheckbox]').each(function() {
                            var checkBoxId = $(this).attr('id');
                            var label = $(this).siblings('label');

                            var newcheckBoxId = contextId + "-" + checkBoxId;

                            $(this).attr('id', newcheckBoxId);
                            label.attr('for', newcheckBoxId);
                        });

                        var componentVersion = Number(options.wizletInfo.version) || 1;
                        if (componentVersion === 1) {
                            $('[data-stackedBarFilter]').find('[data-stackedBarFilterCheck]').on('click', function() {
                                self.clickedOnFilter(options, self, this, initialFilter, selectedFilterArray, responseOptions, questionArray, questionNameArray, true);
                            });
                        } else {
                            $('[data-stackedBarFilter]').find('[data-sbccheckbox]').on('change', function() {
                                self.clickedOnFilter(options, self, $(this).parent()[0], initialFilter, selectedFilterArray, responseOptions, questionArray, questionNameArray, true);
                            });
                        }
                        rendering.resolve();
                    });
                    //return true;
                    return rendering.promise;
                })
        }).fail(this.wizerApi.showError)
    };

    StackedBar.prototype.clickedOnFilter = function(options, self, that, initialFilter, selectedFilterArray, responseOptions, questionArray, questionNameArray, check) {
        // This code is specifically written for IE, because when we double click on a disabled checkbox, click event gets fired which is incorrect
        if ($(that).find('input[type="checkbox"]').attr("disabled") === "disabled") {
            return;
        }
        options.context.find("[data-filter=" + initialFilter + "]").find('input[type="checkbox"]').prop('checked', true);
        var count = 0;
        var unSelectedFilterArray = [];
        var selectedFilter;
        var selectedFilterText;
        var noFilterText = options.wizletInfo.filterQuestions[0].options[0].description;
        //push and pop values from Array, depending upon filters selected or unselected. 
        count = self.pushPopFilterValuesToArray(options, count, selectedFilterArray, unSelectedFilterArray);
        //Checking for number of filters selected 
        self.checkForNofFiltersSelected(options, count, unSelectedFilterArray);
        // When a filter is cheked
        if ($(that).find('input[type="checkbox"]').is(':checked')) {
            selectedFilter = $(that).data('filter');
            var callFilterApi;
            if (initialFilter == selectedFilter) {
                callFilterApi = false;
            } else {
                callFilterApi = true;
            }
            var filterQuestionName = options.wizletInfo.filterQuestions[0].binding;
            var filterText = $(that).data('filter');
            //Call Api to get Votes for Corresponding Filter Selected
            var calculatingFilterAvg = self.getAverage(questionNameArray, callFilterApi, filterQuestionName, filterText);
            calculatingFilterAvg.then(function(response) {
                //Appending New Votes to Option Array    
                questionArray.forEach(function(question) {
                    var barChartFilterArray = [];
                    response.votes.forEach(function(vote) {
                        if (question.qId == vote.qId) {
                            vote.list.forEach(function(list) {
                                barChartFilterArray.push(list.value);
                            })
                        }
                    })
                    question.barChartFilterArray = barChartFilterArray;
                })
                options.wizletInfo.filterQuestions[0].options.forEach(function(option) {
                    if (option.value == selectedFilter) {
                        selectedFilterText = option.description
                    }
                })
                if (selectedFilter != 0) {
                    self.ApplyFilter(options, questionArray, options.wizletInfo, selectedFilterText, noFilterText);
                }
                var animationWithFilter = true;
                if (options.wizletInfo.animation && selectedFilter != 0) {
                    self.getAnnimationEffect(options, questionArray, animationWithFilter);
                }
            })
        }
        //When a filter is Uncheked.
        else {
            //Removing votes from Question Array, when a filter is Unchecked
            var index = $(that).data('filter');
            $('[data-stackedBarBarChartFilterArray]').remove();
            $('[data-stackedBarBarChartArray]').find('[data-stackedBarFilterName]').html("");
            if (options.wizletInfo.animation && selectedFilter != 0) {
                self.getAnnimationEffect(options, questionArray);
            }
        }

    }

    StackedBar.prototype.getAnnimationEffect = function(options, questionArray, animationWithFilter) {

        var animationWidthArray = [];
        var ele;
        if (animationWithFilter) {
            ele = $('[data-stackedBarBarChartFilterArray]');
            var i = 0;
            options.context.find('[data-stackedBarAnswer]').each(function() {
                questionArray[i].barChartFilterArray.forEach(function(width) {
                    animationWidthArray.push(width);
                })
                i++;
            })
        } else {
            ele = $('[data-stackedBarBarChartArray]');
            var i = 0;
            options.context.find('[data-stackedBarAnswer]').each(function() {
                questionArray[i].barChartArray.forEach(function(width) {
                    animationWidthArray.push(width);
                })
                i++;
            })
        }
        var j = 0;
        options.context.find(ele).find("[data-stackedBarHorizontalBarChartInner]").each(function() {
            var self = $(this);
            applyAnimation(self, animationWidthArray[j]);
            j++;
        })

        function applyAnimation(self, width) {
            self.children().hide();
            self.width('0px');
            self.animate({
                width: width + '%'
            }, 1000, function() {
                self.children().show("fast");
            });
        }
    }
    StackedBar.prototype.pushPopFilterValuesToArray = function(options, count, selectedFilterArray, unSelectedFilterArray) {

        options.context.find("[data-stackedBarFilter]").find('input[type="checkbox"]').each(function(index) {
            if ($(this).is(':checked')) {
                var that = this;
                var pushToArray = true;
                count++;
                selectedFilterArray.forEach(function(filter) {
                    if (filter.filterId == $(that).parents('[data-stackedBarFilter]').data('filter')) {
                        pushToArray = false;
                    }
                })
                if (pushToArray) {
                    selectedFilterArray.push({
                        "filterId": $(this).parents('[data-stackedBarFilter]').data('filter')
                    });
                }
            } else {
                selectedFilterArray.splice(index, 1);
                unSelectedFilterArray.push($(this).parents('[data-stackedBarFilter]').data('filter'));
            }
        });
        return count;
    }
    StackedBar.prototype.checkForNofFiltersSelected = function(options, count, unSelectedFilterArray) {
        if (count >= 2) {
            unSelectedFilterArray.forEach(function(filter) {
                options.context.find("[data-filter=" + filter + "]").addClass('stackedBardisableCheckbox');
                options.context.find("[data-filter=" + filter + "]").find("input[type='checkBox']").attr("disabled", "disabled");
            })
        } else {
            options.context.find('[data-stackedBarFilter]').removeClass('stackedBardisableCheckbox');
            options.context.find('[data-stackedBarFilterCheck]').removeClass('stackedBardisableCheckbox');
            options.context.find('[data-stackedBarFilterCheck]').find("input[type='checkBox']").removeAttr("disabled");
        }
    }
    StackedBar.prototype.ApplyFilter = function(options, questionArray, wizletInfo, selectedFilterText, noFilterText, check) {
        var componentVersion = options.wizletInfo.version || 0;
        // Runs this for newer version of component
        if (componentVersion == 2) {
            options.context.find('[data-stackedBarBarChartArray]').find('[data-stackedBarFilterName]').html(noFilterText);
            var i = 0;
            options.context.find('[data-stackedBarAnswer]').each(function() {
                var that = $(this);
                var el = '<div class="sbc-bar-container" data-stackedBarBarChartFilterArray>'
                el += '<div class="sbc-bar cl-bar">';
                var j = 0;
                questionArray[i].barChartFilterArray.forEach(function(barChartFilter) {
                    barChartFilter = (barChartFilter).toFixed(1);
                    el += '<div class="sbc-bar__inner cl-bar__inner" data-stackedBarHorizontalBarChartInner style="width:' + barChartFilter + '%; background-color:' + wizletInfo.questions[0].options[j].color + '">';
                    if (barChartFilter != 0) {
                        el += '<div class="sbc-bubble cl-bubble" data-stackedBarBublePercentage>' + barChartFilter + '%';
                        el += "</div>";
                    }
                    el += "</div>";
                    j++;
                })
                el += "</div>";
                el += '<div class="sbc-filter-name" data-stackedBarFilterName>' + selectedFilterText + '</div>';
                el += "</div>";
                that.append(el);
                i++;
            });
        }

        // Runs this for older version of component
        if (componentVersion < 2) {
            options.context.find('[data-stackedBarBarChartArray]').find('[data-stackedBarFilterName]').text(noFilterText);
            var i = 0;
            options.context.find('[data-stackedBarAnswer]').each(function() {
                var that = $(this);
                var el = "<div class='stackedBarBarChartFilterArray' data-stackedBarBarChartFilterArray >"
                el += "<div class='stackedBarHorizontalBarWraper '>";
                el += "<div class='stackedBarHorizontalBarChart'>";
                var j = 0;
                questionArray[i].barChartFilterArray.forEach(function(barChartFilter) {
                    barChartFilter = (barChartFilter).toFixed(1);
                    el += "<div data-stackedBarHorizontalBarChartInner class='stackedBarHorizontalBarChartInner' style='width:" + barChartFilter + "%; background-color:" + wizletInfo.questions[0].options[j].color + "'>";
                    if (barChartFilter != 0) {
                        el += "<div data-stackedBarBublePercentage class='stackedBarBublePercentage'>" + barChartFilter + "%";
                        el += "<div class='stackedBarDownArrowWhite'><svg height='15' width='15'><polygon points='10,10 5,5 15,5' style='fill:white;stroke:white;stroke-width:1' /></svg>";
                        el += "</div></div>";
                    }
                    el += "</div>";
                    j++;
                })
                el += "</div></div>";
                el += "<div class='stackedBarFilterName' data-stackedBarFilterName >" + selectedFilterText + "</div>";
                el += "</div>";
                that.append(el);
                i++;
            });
        }
    }
    StackedBar.prototype.getAverage = function(questionNameArray, callFilterApi, filterQuestionName, filterText) {
        var self = this;
        var defer = Q.defer();
        var filterQuestionId = '';
        var filterTextValue = '';
        if (callFilterApi) {
            filterQuestionId = self.wizerApi.getQuestionIdByName(filterQuestionName);
            filterTextValue = filterText;
        }
        var sN = questionNameArray;
        var args = {
            shortNames: sN,
            filterQuestionId: filterQuestionId,
            filterText: filterTextValue,
            showAverage: true,
            showVoteCount: true,
            seed: Math.random().toString().replace(".", "")
        };
        var waiting = self.wizerApi.getStackedBarChartResults(args);
        waiting.then(function(result) {
            var vote = {};
            vote.votes = result.questionResults;
            defer.resolve(vote);
        });
        return defer.promise;
    }
    return StackedBar;
});