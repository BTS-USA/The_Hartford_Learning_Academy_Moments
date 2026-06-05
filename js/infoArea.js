/* 
    "Plain InfoArea" wizlet that takes a template and some data as the only input
    and renders the template with functionality to load additional wizlets as popups
*/

define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT'], function ($, Q, WizerApi, WizletBase, doT) {

    var InfoArea = function () {
        this.type = 'InfoArea';
        this.level = 1;
    };

    InfoArea.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;

        this.templateDefer = Q.defer();
        var self = this;
        var requirements = [];
        if (wizletInfo.templateInEvent) {
            requirements.push('doT!' + 'events/' + wizerApi.eventName() + '/' + wizletInfo.templateInEvent);
        }
        else {// either 1 from templateInEvent or template should be present
            if (wizletInfo.template.toLowerCase().indexOf(wizerApi.eventName().toLowerCase()+"/") == -1 && wizletInfo.template.toLowerCase().indexOf('InfoArea/test') == -1) {
                // if template is defined in core, load it from theme folder
                var templateName = wizletInfo.template.split("/").pop();
                requirements.push('doT!' + wizletInfo.templatePath + templateName);
            } else {
                requirements.push('doT!' + wizletInfo.template);
            }

        }
        if (wizletInfo.css) {
            requirements.push('css!' + wizletInfo.css);
        }
        require(requirements, function (doTTemplate, css) {
            self.templateDefer.resolve(doTTemplate);
        });

        return WizletBase.loadHandler({ wizlet: this, render: this.render });
    };

    InfoArea.prototype.unloadHandler = function () {
        //unload wizletbase
        WizletBase.unloadHandler({ wizlet: this });
    };

    InfoArea.prototype.render = function (options) {
        var self = this;
        return self.templateDefer.promise.then(function (template) {
            var fragment = template(options.wizletInfo);
            options.context.html(fragment);
            // bind events
            options.context.find('[data-info-area-element]').on('click', function() {
                var element = $(this);
                var navTarget = element.data('navigation-target');
                var $dataPopupContainer = $('<div data-popup-container></div>');
                self.wizletContext.find('[data-ia-container]').after($dataPopupContainer);
                //var elem = self.wizletContext.find('[data-popup-container]'); // pulse container
                //self.wizerApi.loadActionInContainer(navTarget, undefined, context, context, {});
                self.wizerApi.showActionAsPopUp(navTarget, self.wizletContext, $dataPopupContainer, 'info-popup');
            });
            return true;
        })
        .fail(this.wizerApi.showError)
    };

    InfoArea.getRegistration = function () {
        return new InfoArea();
    };

    return InfoArea;

});
