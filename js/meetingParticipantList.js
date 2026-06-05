/* 
    "Plain Vanilla" wizlet that takes a template and some data as the only input
    and renders the template with functionality from wizletBase, and nothing else.
*/

define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT', "events/Cascade_v2/js/wizer-api-extended"], function ($, Q, WizerApi, WizletBase, doT, wizerApiExt) {

    var MeetingParticipantList = function () {
        this.type = 'MeetingParticipantList';
        this.level = 1;
    };

    MeetingParticipantList.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
        this.wizletInfo = wizletInfo;
        this.wizletContext = wizletContext;
        this.wizerApi = wizerApi;
        this.extApi = wizerApiExt.getRegistration(wizerApi);
        this.templateDefer = Q.defer();
        var self = this;
        this.participantsCount = 0;
        this.participantList = [];
        
        var requirements = [];
    
        requirements.push(WizletBase.loadTemplate(wizletInfo, 'meetingParticipantList.dot'));
        
         requirements.push('doT!' + 'events/' + wizerApi.eventName() + '/html/' + 'meetingParticipantListmembers.dot');
        //requirements.push(WizletBase.loadTemplate(wizletInfo, 'meetingParticipantListmembers.dot'));
        

        if (wizletInfo.css) {
            requirements.push(WizletBase.loadCss(wizletInfo));
        }
        require(requirements, function (doTTemplate, doTTemplateMembers, css) {
            var templates = {
                doTTemplate: doTTemplate,
                doTTemplateMembers: doTTemplateMembers
            }
            self.templateDefer.resolve(templates);
        });

        return WizletBase.loadHandler({ wizlet: this, render: this.render });
    };

    MeetingParticipantList.prototype.unloadHandler = function () {
        //unload wizletbase
        if (this.ParticipantTimer) {
            clearInterval(this.ParticipantTimer);
            this.ParticipantTimer = null;
        }
        WizletBase.unloadHandler({ wizlet: this });
    };

    MeetingParticipantList.prototype.getParticipants = function (options, templates) {
        var getting = new Q.defer();
        var self = this;
        self.options = options;
        self.templates = templates;
        self.extApi.getMeetingStatus(self.wizletInfo.trackQuestion).then(function(response){
            // console.log(response);
            var participantDetails = [];
            //self.wizletInfo.participants = response.participants;
            var loggedinlist = [];
            response.participants.forEach(function(list){
                if(list.isLoggedIn == "True"){
                    loggedinlist.push(list);
                }
            });
            var participantsCount = loggedinlist.length;

            if(response.participants.length == 0){
                options.context.find(".noparticipants").html(self.wizletInfo.noparticipants);
            }
            else{
                options.wizletInfo.participants = response.participants;
            }
            self.wizletContext.find('.followerCount').html(participantsCount);
            
            getting.resolve(true);
            
            // response.participants.forEach(function(vote){
            //     participantDetails.push(vote);
            // });

            // self.wizletInfo.followerDetails = participantDetails;
        });
        return getting.promise;
    };

    MeetingParticipantList.prototype.publishList = function () {

    }
    MeetingParticipantList.prototype.render = function (options) {
        var self = this;
        var popupOpen = false;
        return self.templateDefer.promise.then(function (templates) {
            
            return self.extApi.isLeader(self.wizletInfo.trackQuestion).then(function (result) {
                //console.log("I'm a leader: ", result);
                if(result){
                    var trackQuestionId = self.wizerApi.getQuestionIdByName(self.wizletInfo.trackQuestion);
                    var gettingMyVoteOnTrack = self.wizerApi.getMyVotes([trackQuestionId]);
                    gettingMyVoteOnTrack.then(function (response) {
                        
                        if(response.responses[trackQuestionId].length <= 0){
                            options.context.find(".followerCount-wrapper").hide();
                        }
                        else if(response.responses[trackQuestionId][0].responseText && response.responses[trackQuestionId][0].length > 0){
                            options.context.find(".followerCount-wrapper").show();
                        }
                    });

                    var fragment = templates.doTTemplate(options.wizletInfo);
                    options.context.html(fragment);
                    self.getParticipants(options, templates);

                    var puserListDiv = options.context.find('[data-userlist]')

                    self.participantListOpen = false;

                    puserListDiv.addClass('hide');

                    self.wizletContext.find("[data-participant-count]").off().on("click", function(){
                        self.participantListOpen = !self.participantListOpen;
                        var members = templates.doTTemplateMembers(options.wizletInfo);
                        puserListDiv.toggleClass('hide', !self.participantListOpen);
                        puserListDiv.html("");
                        if(self.participantListOpen){
                            puserListDiv.html(members);
                            self.wizletContext.find("[data-meetingparticipant-close-button]").off().on('click',function(){                                
                                puserListDiv.addClass('hide');
                            });
                        }
                        self.participantListOpen = !self.participantListOpen;
                    });
                    
                    
                    self.ParticipantTimer = setInterval(function () {
                        self.getParticipants(options, templates);
                    }, options.wizletInfo.autoupdate * 1000);          

                }
                return true;
            })
        })
        .fail(this.wizerApi.showError)
    };

    MeetingParticipantList.getRegistration = function () {
        return new MeetingParticipantList();
    };

    return MeetingParticipantList;

});
