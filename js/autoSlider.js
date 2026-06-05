/* 
    "Plain AutoSlider" wizlet that takes a template and some data as the only input
    and renders the template with functionality from wizletBase, and nothing else.
*/

define(['jquery', 'Q', 'wizer-api', 'wizletBase', 'doT', 'Wizer/Pages/Events/Cascade_v2/js/jquery.bxslider.js'], function ($, Q, WizerApi, WizletBase, doT, BxSlider) {

    var AutoSlider = function () {
        this.type = 'AutoSlider';
        this.level = 1;
    };

    AutoSlider.prototype.loadHandler = function (unused, wizletInfo, wizletContext, wizerApi) {
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
            if (wizletInfo.template.toLowerCase().indexOf(wizerApi.eventName().toLowerCase()+"/") == -1 && wizletInfo.template.toLowerCase().indexOf('AutoSlider/test') == -1) {
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

    AutoSlider.prototype.unloadHandler = function () {
        //unload wizletbase
        WizletBase.unloadHandler({ wizlet: this });
    };

	
	
    AutoSlider.prototype.render = function (options) {
        var self = this;
		 
        return self.templateDefer.promise.then(function (template) {
            var fragment = template(options.wizletInfo);
            options.context.html(fragment);
			window.addEventListener("resize", function() {
                

         
          if( $(window).width() > $(window).height() )
          {
              window.scrollTo(1,1);
			  
              $('#landscape').show();
              if($(window).width() > 767){
                $('#landscape').css('display','none');
              }
			 // alert(" display: " + $('#landscape').css('display') + " wdith: " + $('#landscape').css('width') + " height: " + $('#landscape').css('height') + " zinden: " + $('#landscape').css('z-index') + " transform: " +  $('#landscape').css('transform'))
				lockScroll();
          }
          else{			  
               $('#landscape').hide();
			  // alert(" display: " + $('#landscape').css('display') + " wdith: " + $('#landscape').css('width') + " height: " + $('#landscape').css('height') + " zinden: " + $('#landscape').css('z-index') + " transform: " +  $('#landscape').css('transform'))
               unLockScroll();
          }
          
 
 }, false);
 options.context.find('[data-autoSlider-icon-button]').removeClass('enabled');
            options.context.find('[data-autoSlider]').addClass('show');
            options.context.find('[data-autoSlider-close-button]').on('click', function(el){
            var el= $(this);
            options.context.find('[data-autoSlider]').toggleClass('show');
            options.context.find('[data-autoSlider-icon-button]').toggleClass('enabled');

})
options.context.find('[data-autoSlider-icon-button]').on('click', function(el){
              
    options.context.find('[data-autoSlider]').addClass('show');
    options.context.find('[data-autoSlider-icon-button]').removeClass('enabled');
   
})
 function lockScroll()
{
     $(document).bind("touchmove",function(event){
                        event.preventDefault();
     });
}
 
function unLockScroll()
{
    $(document).unbind("touchmove");
}
			/*window.onorientationchange = function() {

			  var orientation = window.orientation;
			  //console.log(orientation);
			  switch(orientation) {
				case 0:

				document.body.setAttribute("class","portrait");
				//alert(orientation);
				break; 

				case 90:
				document.body.setAttribute("class","landscapeLeft");
				//alert(orientation);
				//document.getElementById("currentOrientation").innerHTML="Now in landscape orientation and turned to the left (Home button to the right).";
				break;

				case -90: 
				document.body.setAttribute("class","landscapeRight");
				//alert(orientation);
				//document.getElementById("currentOrientation").innerHTML="Now in landscape orientation and turned to the right (Home button to the left).";
				break;
			  }
	}*/
            var pagenum = self.wizletInfo.defaultPageNum;
			$('.bxslider').bxSlider({
						auto: false,
                        autoControls: true,
                        startSlide: pagenum?pagenum:self.wizletInfo.defaultPageNum,
                        infiniteLoop: false
			});
            return true;
        })
        .fail(this.wizerApi.showError)
    };

    AutoSlider.getRegistration = function () {
        return new AutoSlider();
    };

    return AutoSlider;

});
