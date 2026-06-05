define(['jquery', 'Q', 'wizer-api', 'logger', 'wizletBase', 'doT', 'WizerModel'], function ($, Q, WizerApi, log, WizletBase, doT, WizerModel) {

    var SingleSelectList = function () {
        this.type = 'SingleSelectList';
        this.level = 1;
    };

    SingleSelectList.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;
        this.wizerModel = WizerModel.getInstance() || new WizerModel({ wizerApi: this.wizerApi });
        this.templateDefer = Q.defer();
        var self = this;
        var requirements = [];
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'singleSelectList.dot'));

        if (wizletInfo.css) {
            requirements.push(WizletBase.loadCss(wizletInfo));
        }
        require(requirements, function (doTTemplate, css) {
            self.templateDefer.resolve(doTTemplate);
        });

        return WizletBase.loadHandler({
            wizlet: this,
            render: this.render
        }).then(function () {
            // Set width for bars under input range
            if (!self.wizletInfo.updatedSlider) {
                self.wizletContext.find("[data-singleSelectListBar]").each(function () {
                    var width = $(this).width();
                    span = $(this).find('span');
                    spanWidth = 100 / (wizletInfo.axisTextHigh + 1);
                    span.css({ width: spanWidth + "%" });
                });
            } else {
                self.wizletContext.find("[data-singleSelectListBar]").each(function () {
                    var step = 1;
                    if (wizletInfo.step) {
                        step = wizletInfo.step;
                    }
                    var spanWidth = 100 / ((parseInt(wizletInfo.max) - parseInt(wizletInfo.min)) / step);
                    span = $(this).find('span');

                    for (var i = 0; i < span.length; i++) {
                        if (i === 0) {
                            $(span[i]).css({ left: "0%" });
                        } else {
                            if (!wizletInfo.steps) {
                                $(span[i]).css({ left: "98%" });
                            } else {
                                $(span[i]).css({ left: (spanWidth * i) - i + "%" });
                            }
                        }
                    }
                });
            }
        });
    };

    SingleSelectList.prototype.unloadHandler = function () {
        //unload wizletbase
        WizletBase.unloadHandler({ wizlet: this });
    };

    SingleSelectList.prototype.render = function (options) {
        var self = this;
        return self.templateDefer.promise.then(function (template) {
            var fragment = template(options.wizletInfo);
            options.context.html(fragment);

            options.context.find('[data-button="submit"]').off('click').on('click', function () {
                self.setSavedMessage(false);
            });

            options.context.on('valueUpdated', function (e) {
                self.setSavedMessage(true);
            });

            options.context.find('[data-button="clear"]').off('click').on('click', function () {
                self.reset(options, self);
            });

            if (self.wizletInfo.isReadOnlyEnabled) {
                self.wizletContext.find('[data-button="submit"]').addClass('apum__readOnly');
                self.wizletContext.find('[data-singleselect-slider]').addClass('apum__readOnly');

            }

            if (self.wizletInfo.readOnlyCondition) {
                self.checkForReadOnlyCondition();
            }

            return true;
        })
            .fail(this.wizerApi.showError);
    };

    SingleSelectList.prototype.checkForReadOnlyCondition = function () {
        var self = this;
        var readonly = self.wizerModel.checkForReadOnlyCondition(self.wizletInfo, self.wizletInfo.questions);

        if (readonly) {
            self.wizletContext.addClass('readonly');
            self.wizletContext.find('[data-button]').addClass('ssl-button--hide');
        }
    };

    SingleSelectList.prototype.setSavedMessage = function (clearMessage) {
        var self = this;
        var confirmMsg;
        var $submitText = self.wizletContext.find('[data-button="submit"]');
        if ($submitText.length <= 0) return;
        if (clearMessage) {
            if (self.wizletInfo.buttons) {
                confirmMsg = self.wizletInfo.buttons[0].text;
            }
            if (!confirmMsg) confirmMsg = "Submit";
            if (self.componentVersion < 2) {
                // currently not implemented in version 1
            } else {
                $submitText.removeClass('ssl-savedmessage');
                $submitText.html(confirmMsg);
            }
        } else {
            if (self.wizletInfo.buttons) {
                confirmMsg = self.wizletInfo.buttons[0].message;
            }
            if (!confirmMsg) confirmMsg = "Saved";
            if (self.componentVersion < 2) {
                // currently not implemented in version 1
            } else {
                $submitText.addClass('ssl-savedmessage');
                $submitText.html(confirmMsg);
            }
        }
    };

    SingleSelectList.getRegistration = function () {
        return new SingleSelectList();
    };

    SingleSelectList.prototype.reset = function (options, self) {
        var votes = [];
        options.wizletInfo.questions.forEach(function (q) {
            votes.push({ questionId: self.wizerApi.getQuestionIdByName(q.binding) });
        })
        self.wizerApi.removeVotes({ votes : votes }).then(function (response) {
            //self.render(options);
        })
        var sliderEle = document.querySelectorAll('.ui-slider-range');
        var dotEle = document.querySelectorAll('.ui-slider-handle');
        sliderEle.forEach(function (value){value.style.width = '0%';})
        dotEle.forEach(function (value){value.style.left = '0%';});
        
    }

    return SingleSelectList;

});