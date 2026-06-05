define(['jquery', 'Q', 'wizer-api', 'logger', 'wizletBase', 'doT', "events/The_Hartford_Learning_Academy_Moments/js/inputRenderer"], function ($, Q, WizerApi, log, WizletBase, doT, InputRenderer) {

    var TeamName = function () {
        this.type = 'TeamName';
        this.level = 1;
    };

    TeamName.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;
        this.saving = false;
        this.templateDefer = Q.defer();
        var self = this;
        var requirements = [];

        requirements.push(WizletBase.loadTemplate(wizletInfo, 'input.dot'));

        if (wizletInfo.css) {
            requirements.push('css!' + "/wizer/Pages/" + wizletInfo.css);
        }
        require(requirements, function (doTTemplate, css) {
            self.templateDefer.resolve(doTTemplate);
        });

        return WizletBase.loadHandler({
            wizlet: this,
            render: this.render
        });
    };

    TeamName.prototype.unloadHandler = function () {
        //unload wizletbase
        WizletBase.unloadHandler({ wizlet: this });
    };

    TeamName.prototype.render = function (options) {

        var self = this;
        var rendering = new Q.defer();
        self.templateDefer.promise.then(function (template) {
            var fragment = template(options.wizletInfo);
            options.context.html(fragment);
            self.$submitBtn = self.wizletContext.find("[data-submit-button]");
            self.$clearBtn = self.wizletContext.find("[data-clear-button]");
            self.fetchVotes().then(function (result) {
                self.wizletInfo.questions.forEach(function (q) {
                    var renderer = new InputRenderer();
                    var $question = self.wizletContext.find("[data-question-name=" + q.question + "]");
                    // console.log($question);
                    renderer.init(q, $question, self.wizerApi);
                });

                self.initListeners();
                self.enableSubmit();

                rendering.resolve(true);
                self.wizletContext.find("[data-input]").focus();
            });

        })
            .fail(this.wizerApi.showError)
        //.done();
        return rendering.promise;
    };
    TeamName.prototype.initListeners = function () {
        var self = this;
        var $question = self.wizletContext.find("[data-question-name]");
        $question.on("wizer-render-input-update", function (event, data) {
            // TODO: save if auto save is true
            // console.log(data);
            self.saving = false;
            self.enableSubmit(); 
        })
        .on("wizer-render-input-enter", function (event, data) {
            // save if save on blur true
            // console.log(data);
            self.submit();
        });
        self.$submitBtn.on("click", function (e) {
            self.submit();
        })
    }

    TeamName.prototype.fetchVotes = function () {
        var self = this;
        var questions = [];
        self.wizletInfo.questions.forEach(function (q) {
            questions.push(q.question);
        });

        return self.wizerApi.getMyVotesByQuestionName(questions).then(function (response) {
            self.wizletInfo.questions.forEach(function (q) {
                var vote = response.questionMap[q.question];
                // console.log(vote);
                q.questionId = vote.qid;
                q.value = vote.value || "";
                q.renderOptions.value = vote.value || "";
            });
            return response;
        });

    }

    TeamName.prototype.submit = function () {
        var self = this;
        if(self.saving)return;
        var values = self.hasValues();
        if (!values) return;
        self.saving = true;

        var obj = { votes: [] };
        self.wizletInfo.questions.forEach(function (q) {
            obj.votes.push({ questionId: q.questionId, responseText: q.renderOptions.value });
        });

        var savedMsg = self.wizletInfo.buttons[0].message || "Saved";
        self.wizerApi.addVotes(obj).then(function (result) {
            self.saving = false;
            $(self.$submitBtn).addClass('inputSavedMessage').html(savedMsg);
            var NameContainer = document.getElementById('menuParticipantName');
            NameContainer.innerHTML = self.wizletInfo.questions[0].renderOptions.value;
        })

    }

    TeamName.prototype.hasValues = function () {
        var self = this;
        var values = true;
        self.wizletInfo.questions.forEach(function (q) {
            if (!q.renderOptions.value.trim()) {
                values = false;
            }
        });
        return values;
    }

    TeamName.prototype.enableSubmit = function () {
        var self = this;
        var values = self.hasValues();
        // console.log(values);
        self.$submitBtn.toggleClass("disabled", !values);
        self.$clearBtn.toggleClass("disabled", !values);
        var submitMsg = self.wizletInfo.buttons[0].text || "Submit";
        $(self.$submitBtn).removeClass('inputSavedMessage').html(submitMsg);
    }

    TeamName.getRegistration = function () {
        return new TeamName();
    };

    return TeamName;

});