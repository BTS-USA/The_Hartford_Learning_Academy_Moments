define(['jquery', 'Q', 'WizerModel', 'wizer-api', 'logger', 'wizletBase', 'doT', 'jquery-ui'], function ($, Q, WizerModel, WizerApi, log, WizletBase, doT) {

    var MultipleSelect = function () {
        this.type = 'MultipleSelect';
        this.level = 1;
    };

    MultipleSelect.prototype.evalChoice = function (context) {
        var self = this;
        var currentChoices = 0;
        
        context.find('input[type="checkbox"]').each(function (idx, elm) {
            currentChoices = context.find('input[type="checkbox"]:checked').length;
            context.find("[data-submitAction]").addClass("disabled");
            context.find("[data-clearAction]").addClass("disabled");
            
            if (currentChoices == self.wizletInfo.maxChoices && !$(elm).is(":checked")) {
                context.find($(elm)).attr("disabled", "disabled");
                $(context.find($(elm)).parents("[data-checkBoxRow]")).addClass('disableLabels');
            } else if (currentChoices < self.wizletInfo.maxChoices && $(elm).attr("disabled") === "disabled") {
                context.find($(elm)).removeAttr("disabled");
                $(context.find($(elm)).parents("[data-checkBoxRow]")).removeClass('disableLabels');
            }
            else {
                $(context.find($(elm)).parents("[data-checkBoxRow]")).removeClass('disableLabels');
                
            }
            if (currentChoices >= self.wizletInfo.minChoices) {
                if (currentChoices < self.wizletInfo.maxChoices) {
                    context.find('[data-componentMessage]').html(self.wizletInfo.alert)
                }
                else if (currentChoices === self.wizletInfo.maxChoices) {
                    context.find('[data-componentMessage]').html(self.wizletInfo.submitLabel);
                }
                context.find('[data-controls]').addClass('multipleSelectButtonDisabled');
                $(context.find('[data-componentButtons]')).each(function(){
                    $(this).find('div').removeClass('multipleSelectButtonDisabled disabled').attr('buttonDisabled', false);
                });
                context.find("[data-submitAction]").removeClass("disabled");
                context.find("[data-clearAction]").removeClass("disabled");

            } else if (currentChoices < self.wizletInfo.minChoices && currentChoices !== 0) {
                context.find('[data-componentMessage]').html("");
                context.find('[data-controls]').removeClass('multipleSelectButtonDisabled');
                $(context.find('[data-componentButtons]')).each(function(){
                    $(this).find('div').removeClass('multipleSelectButtonDisabled disabled').attr('buttonDisabled', false);
                });
                context.find("[data-clearAction]").removeClass("disabled");
            }
            else if (currentChoices == 0) {
                context.find('[data-componentMessage]').html("");
                context.find('[data-controls]').removeClass('multipleSelectButtonDisabled');
                $(context.find('[data-componentButtons]')).each(function(){
                    $(this).find('div').addClass('multipleSelectButtonDisabled disabled').attr('buttonDisabled', true);
                });
            }
        });
        return context;
    };

    MultipleSelect.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
		this.wizerApi = wizerApi;
		this.wizerModel = WizerModel.getInstance() || new WizerModel({ wizerApi: this.wizerApi });
        this.templateDefer = Q.defer();
        var self = this;
        self.readOnly = false;
        var requirements = [];
        this.remainingText = wizletInfo.remainingText || "REMAINING";
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'multipleSelect.dot'));

        //requirements.push('doT!/Wizer/Content/WizletResources/MultipleSelect/html/multipleSelect.dot');
        if (wizletInfo.css) {
            requirements.push(WizletBase.loadCss(wizletInfo));
        }
        require(requirements, function (doTTemplate, css) {
            self.templateDefer.resolve(doTTemplate);
        });

        if (self.wizletInfo.minChoices == undefined || self.wizletInfo.minChoices == 0) {
            self.wizletInfo.minChoices = 1;
        }

        return WizletBase.loadHandler({
            wizlet: this,
            render: this.render
        }).then(function () {
            var base = wizletContext;
            
            if (self.wizletInfo.readOnlyQuestion && self.wizletInfo.readOnlyAnswer) {
                var questId = self.wizerApi.getQuestionIdByName(wizletInfo.readOnlyQuestion),
                questionIds = [];
                questionIds.push(questId);
                self.wizerApi.getMyVotes(questionIds).then(function(d) {
                    $.each(d.votes, function(k,v) {
                        if (v[0] === self.wizletInfo.readOnlyAnswer) {
                            self.readOnly = true;
                            self.context.find(":checkbox").prop('disabled', self.readOnly);
                            self.context.find('[data-componentButtons]').hide();
                        }
                    });
                });
			}
        
            for (var bindingKey in self.wizletInfo.bindings) {
                if (self.wizletInfo.bindings.hasOwnProperty(bindingKey)) {
                    self.wizletInfo.bindings[bindingKey].renderOptions = self.wizletInfo.bindings[bindingKey].renderOptions || {};
                    self.wizletInfo.bindings[bindingKey].renderOptions.confirmDialog = self.wizletInfo.confirmDialog || "false";
                    self.wizletInfo.bindings[bindingKey].renderOptions.confirmText = self.wizletInfo.confirmText || "Are you sure?";
                    self.wizletInfo.bindings[bindingKey].renderOptions.confirmButtonYes = self.wizletInfo.confirmButtonYes || "Yes";
                    self.wizletInfo.bindings[bindingKey].renderOptions.confirmButtonNo = self.wizletInfo.confirmButtonNo || "No";
                    self.wizletInfo.bindings[bindingKey].renderOptions.maxChoices = self.wizletInfo.maxChoices || self.wizletInfo.questions.length;
                    self.wizletInfo.bindings[bindingKey].renderOptions.minChoices = self.wizletInfo.minChoices || 0;
                }  
            }
            if (!self.readonly) {
                self.context.on('change', ':checkbox', function (e) {
                    self.evalChoice(wizletContext);
                    updateRemaining();
                    self.setSavedMessage(true);
                });
                self.context.on('valueUpdated', ':checkbox', function (e) {
                    self.evalChoice(wizletContext);
                    updateRemaining();
                    self.setSavedMessage(true);
                });

                function updateRemaining() {
                    if (wizletInfo.maxChoices) {
                        self.context.find("[data-checkRemaining]").text((parseInt(wizletInfo.maxChoices) - parseInt(self.context.find('input[type="checkbox"]:checked').length)) + "/" +
                            wizletInfo.maxChoices);
                        self.context.find("[data-checkRemainingText]").html(self.remainingText);
                    } else {

                        self.context.find("[data-checkRemaining]").text(self.context.find('input[type="checkbox"]').not(":checked").length + "/" +
                            $(":checkbox").length);
                        self.context.find("[data-checkRemainingText]").html(self.remainingText);
                    }

                }
                updateRemaining();
            }

			$(document).bind("wizer:action:newVoteAdded", { context: self }, self.newVoteAdded);
            self.evalChoice(base);

            if (self.readonly) {
                self.context.find('[data-componentMessage]').hide();
            }
			self.context.find('input[type="checkbox"]:checked').each(function () {
				$(this).parents("[data-checkBoxRow]").addClass("optionSelected");
			});
			self.context.find('[data-componentButtons]').on('click', function (event) {
				self.evalChoice(base);
				self.buttonClicked(event, base);
				updateRemaining();
			});
        });
    };

    MultipleSelect.prototype.newVoteAdded = function (event) {
        var self = event.data.context;
        self.context.find('input[type="checkbox"]').removeAttr("disabled");
        self.evalChoice(self.wizletContext);
        if (self.readOnly)
            self.context.find(":checkbox").prop('disabled', true);
    }

    MultipleSelect.prototype.buttonClicked = function (event, context) {
        var self = this;
        if (event.currentTarget.id === "multipleSelectsubmitButton") {
            var currentChoices = context.find('input[type="checkbox"]:checked').length;
            if (currentChoices >= self.wizletInfo.minChoices) {
                context.find('[data-componentMessage]').html(self.wizletInfo.submitMessage);
                self.setSavedMessage(false);
            }
        }
        else {
            if ($(event.currentTarget.id).find('div').hasClass('multipleSelectButtonDisabled') || self.wizletInfo.confirmDialog == "true") {
                return;
            }
            context.find('input[type="checkbox"]').each(function () {
                $(this).parents("[data-checkBoxRow]").removeClass("optionSelected").removeClass('disableLabels');
                $(this).removeAttr("disabled");
                $(this).prop('checked', false);
            });

            context.find('[data-componentMessage]').text("");
            context.find('[data-controls]').removeClass('multipleSelectButtonDisabled');

            $(context.find('[data-componentButtons]')[0]).find('div').addClass('multipleSelectButtonDisabled').attr('buttonDisabled', true);
            var questionName;
            
            for (var i = 0; i < self.wizletInfo.questions.length; i++) {
                if (self.wizletInfo.questions[i].value) {
                    questionName = self.wizletInfo.bindings[self.wizletInfo.questions[i].value].bind.replace('db:', '');
                }
                else {
                    questionName = self.wizletInfo.questions[i].binding;
                }
                // var questionId = self.wizerApi.getQuestionIdByName(questionName);
                // self.wizerApi.removeVotes({ votes: [{ questionId: questionId }] });
                if (questionName.indexOf('calc:') === 0) {
                    questionName = questionName.replace("calc:", "");
                    self.binders.calcBinderInstance.setValue(questionName, 0);
                }
                else {
                    questionName = questionName.replace("db:", "");
                    var questionId = self.wizerApi.getQuestionIdByName(questionName);
                    self.wizerApi.removeVotes({ votes: [{ questionId: questionId }] });
                }
                self.setSavedMessage(true);
            }

            context.find("[data-submitAction]").addClass("disabled");
            context.find("[data-clearAction]").addClass("disabled");
        }
    };

    MultipleSelect.prototype.setSavedMessage = function (clearMessage) {
        var self = this;
        var confirmMsg;
        var $submitText = self.wizletContext.find('[data-mscbuttons]').find('[data-submitButton]');
        if ($submitText.length <= 0) return;
        if (clearMessage) {
            if (self.wizletInfo.buttons) {
                confirmMsg = self.wizletInfo.buttons[1].title;
            }
            if (!confirmMsg) confirmMsg = "Submit";
            if (self.componentVersion < 2) {
                // currently not implemented in version 1
            } else {
                $submitText.removeClass('msc-savedmessage');
                $submitText.html(confirmMsg);
            }
        } else {
            if (self.wizletInfo.buttons) {
                confirmMsg = self.wizletInfo.buttons[1].message;
            }
            if (!confirmMsg) confirmMsg = "Saved";
            if (self.componentVersion < 2) {
                // currently not implemented in version 1
            } else {
                $submitText.addClass('msc-savedmessage');
                $submitText.html(confirmMsg);
            }


        }


    };
    MultipleSelect.prototype.unloadHandler = function () {
        // Note: Nothing to do
        this.context.off('valueUpdated');
        this.context.off('change');
        $(document).unbind("wizer:action:newVoteAdded", this.newVoteAdded);
        WizletBase.unloadHandler({ wizlet: this });
    };


	MultipleSelect.prototype.checkForReadOnlyCondition = function () {
		var self = this;
		var readonly = self.wizerModel.checkForReadOnlyCondition(self.wizletInfo, self.wizletInfo.questions);
		self.readonly = readonly;
		
		if (readonly) {
			self.wizletContext.addClass('readonly');
			self.wizletContext.find('[data-checkboxrowcontainer]').addClass('readonly');
			self.wizletContext.find('[data-leftcheckbox]').addClass('readonly');
			self.wizletContext.find('[data-mscbuttons]').addClass('msc-button-container--hide');
		}
	}
	

    MultipleSelect.prototype.render = function (options) {

        var self = this;
        return self.templateDefer.promise.then(function (template) {
            var fragment = template(options.wizletInfo);
            options.context.html(fragment);
			self.context = options.context;
			self.initEventHandlers(options);
			if (self.wizletInfo.readOnlyCondition) {
				self.checkForReadOnlyCondition();
			}
            return true;
        }).fail(this.wizerApi.showError);
        
    };
    
    
    MultipleSelect.prototype.initEventHandlers = function(options) {
        
        options.context.find("[data-optionContainer]").click(function(e){
                e.preventDefault();
                e.stopPropagation();
                if ($(this).hasClass('open')) {
                    $(this).removeClass('open')
                    .find('img').attr('src', '/wizer/Content/WizletResources/Shared/media/img/plus.svg');
                    $(this).parents('[data-checkBoxRowContainer]').find('[data-accordionData]').slideUp();
                } 
                else {
                    
                    $(this).addClass('open')
                    .find('img').attr('src', '/wizer/Content/WizletResources/Shared/media/img/minus.svg').end()
                    .parents('[data-checkBoxRowContainer]').find('[data-accordionData]'). slideDown();
                }
        });
    
    }

    MultipleSelect.getRegistration = function () {
        return new MultipleSelect();
    };
    return MultipleSelect;

});
