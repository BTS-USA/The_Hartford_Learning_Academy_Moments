define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT'], function ($, Q, WizerApi, WizletBase, doT) {

    var NavigationComponent = function () {
        this.type = 'NavigationComponent';
        this.level = 1;
    };

    NavigationComponent.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;
        this.votesBeforeUpdate = [];

        this.templateDefer = Q.defer();
        var self = this;
        var requirements = [];
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'navigationComponent.dot'));

        if (wizletInfo.css) {
            requirements.push(WizletBase.loadCss(wizletInfo));
        }
        require(requirements, function (doTTemplate, css) {
            self.templateDefer.resolve(doTTemplate);
        });

        $(this.wizletContext).bind("wizer:action:wizletBase:scope-reFetch:complete", function () {
            self.reDraw();
        });

        //VideoPlayer.onLoad(null, info, content, wizerApi);
        return WizletBase.loadHandler({ wizlet: this, render: this.render });

    };

    NavigationComponent.prototype.unloadHandler = function () {
        //unload wizletbase
        $(this.wizletContext).unbind("wizer:action:wizletBase:scope-reFetch:complete");
        WizletBase.unloadHandler({ wizlet: this });
    };

    NavigationComponent.prototype.render = function (options) {
        var self = this;
        return self.templateDefer.promise.then(function (template) {
            var fragment = template(options.wizletInfo);
            options.context.html(fragment);

            options.context.find("[data-previousAction]").off("click").on("click", function (e) {
                var actionId = $(this).attr("data-action");
                var history = $(this).attr("data-history");

                if (actionId != '' && actionId !== undefined) {
                    self.wizerApi.jump(actionId, history);

                }
                else {
                    window.sendAndPrevious();
                }
            });

            options.context.find("[data-nextAction]").off("click").on("click", function (e) {
                var actionId = $(this).attr("data-action");
                var history = $(this).attr("data-history");

                if (actionId != '' && actionId !== undefined) {
                    self.wizerApi.jump(actionId, history);

                }
                else {
                    window.sendAndNext();
                }
            });

            options.context.find("#aggregator").off("click").on("click", function (e) {


                var navTarget = $(this).attr("data-aggregatorActionXML");
				var history = $(this).attr("data-history");
                if (navTarget != '' && navTarget !== undefined) {
                    self.RunFollowersAggregator(navTarget,(history !== undefined && history != '')? history: false,false);
                }
            });
            options.context.find('[data-info-area-element]').on('click', function() {
                var element = $(this);
                var navTarget = element.data('navigation-target');
                var $dataPopupContainer = $('<div data-popup-container></div>');
                self.wizletContext.find('[data-ia-container]').after($dataPopupContainer);
                self.wizerApi.showActionAsPopUp(navTarget, self.wizletContext, $dataPopupContainer, 'info-popup');
            });

            options.context.find("[data-btntype-home]").off().on("click", function(){
                var optionId = $(this).attr("data-action-option");
                options.context.find("[data-activepopup]").removeClass("disablepopup");
                self.wizletContext.find('[data-navigatepopup]').off().on("click", function(){
                    options.context.find("[data-activepopup]").addClass("disablepopup");
                    self.getMeetings(self.wizletInfo.menuOptions[optionId].navigation.target).then(function(response){
                        if(response.success){
                            if(self.wizletInfo.menuOptions[optionId].navigation.target){
                                self.wizerApi.jump(self.wizletInfo.menuOptions[optionId].navigation.target);
                            }
                            else{
                                return true;
                            }
                        }
                    });
                })
                self.wizletContext.find('[data-closepopup]').off().on("click", function(){
                    options.context.find("[data-activepopup]").addClass("disablepopup");
                })
            });
           

            return true;
        })
            .fail(this.wizerApi.showError);
    };
    NavigationComponent.prototype.getMeetings = function (actionName) {
        var self = this;


            return $.ajax({
                url: 'Wizer/Meeting/GetAll?actionName=' + actionName,
                contentType: 'application/json',
                type: 'GET',
                datatype: 'json',
                success: function (response) {
                    return response;
                },
                error: function (response) {
                    return response;
                }
            });
        
    };

    NavigationComponent.prototype.onActionRendered = function(e, actionXML) {
        var self = e.data.self,
            actionXML = actionXML;
        if (self.actionXMLS.indexOf(actionXML) !== -1) {
            $(document).find('[data-popup-container]:visible').scrollTop(0);
        }
    }
    NavigationComponent.prototype.reDraw = function () {
        var self = this;
        var reevaluatingScope = WizletBase.reEvaluateNavigation({ navigationItems: self.wizletInfo.navigationItems, scope: self.wizletInfo, wizerApi: self.wizerApi, wizletContext: self.wizletContext });
    };

    NavigationComponent.prototype.RunFollowersAggregator = function (actionName,history,setCurrentAction) {

        var self = this;
        var scriptName = actionName;
        var trackQuestionId = self.wizerApi.getQuestionIdByName(self.wizletInfo.trackQuestion);
        AjaxGetJson('Vote', 'RunFollowersAggregator', 'trackQuestionId=' + trackQuestionId + '&scriptName=' + scriptName + '&pushToHistory=' + history + '&setCurrentAction=' + setCurrentAction, function (result) {
            if (result.success) {
                return true;
            }
        });
    };

    NavigationComponent.prototype.dataHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        //var self = this;
        //if (wizletInfo.data) {
        //    alert(wizletInfo.data.pass);
        //}
        //return new Q(true);
    };

    NavigationComponent.getRegistration = function () {
        return new NavigationComponent();
    };

    return NavigationComponent;

});