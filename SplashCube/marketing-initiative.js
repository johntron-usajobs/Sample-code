(function(namespace){

    namespace.MarketingInitiativeWizard = Backbone.View.extend({
        initialize: function() {
            this.options = _.defaults(this.options, {
                currentStep: 1
                , breadcrumbs: true
            })
            this.loading_count = 0; // Number of buttons currently loading prospects

            if ( this.options.breadcrumbs ) {
                this.breadcrumbs = new namespace.MarketingInitiativeWizard.Breadcrumbs({});
            }

            this.keyphraseForm = new namespace.MarketingInitiativeWizard.KeyphrasesForm({
                model: this.model
            });

            this.prospectCounter = new namespace.MarketingInitiativeWizard.ProspectCounter({
                model: this.model
            })

            this.prospectList = new namespace.MarketingInitiativeWizard.ProspectList({
                model: this.model
            });
            this.prospectList.on('loading_start', this.prospectsLoadingStart, this )
            this.prospectList.on('loading_end', this.prospectsLoadingEnd, this )

            this.publishingForm = new namespace.TemplateForm({
                model: this.model
                , name: this.options.name
                , screen_name: this.options.screen_name
            });

            this.publishingForm.on('click:finish', this.showMonitorLinkingScreen, this);

            this.model.on('change:keyphrases', this.keyphrasesChanged, this);
            this.model.on('change:prospects', this.prospectCounter.prospectsChanged, this.prospectCounter);
        }

        , events: {
            'click .prospect-counter-next': 'buildTemplates'
//            , 'click .template-form-finish': 'showMonitorLinkingScreen'
            , 'click .link-monitor': 'saveInitiative'
        }

        , buildTemplates: function() {
            // Setup view for template form

            this.keyphraseForm.$el.hide();
            this.prospectCounter.$el.hide();
            this.prospectList.$el.hide();

            if ( this.options.breadcrumbs ) {
                this.breadcrumbs.setStep(2).render();
            }

            this.$el.find('.initiative-container').append(this.publishingForm.render().$el);
            this.$el.find('.initiative-container').find('h3').html('Build Template');


            var _gaq = window._gaq || (window._gaq = []);
            _gaq.push(['_trackEvent', 'Initiative Build Templates', 'Begin', null]);
        }

        , showMonitorLinkingScreen: function() {
            // Setup view to ask user if they want to link a monitor

            this.keyphraseForm.$el.hide();
            this.prospectCounter.$el.hide();
            this.prospectList.$el.hide();
            this.publishingForm.$el.hide();

            if ( this.options.breadcrumbs ) {
                this.breadcrumbs.setStep(2).render();
            }

            this.$el.find('.initiative-container').append($('\
                <div class="body confirm-monitor-link">\
                    Would you like SplashCube to routinely look for new prospects and include<br /> them in this initiative using these keyphrases: <strong>' + this.model.get('keyphrases').join(', ') + '</strong>?<br />\
                    <button class="link-monitor button blueBtn" data-answer="1">Yes</button> &nbsp;&nbsp;&nbsp; <button class="link-monitor button" data-answer="0">No</button>\
                    <div class="fix"></div>\
                </div>\
                '));
        }

        , saveInitiative: function(e) {
            var createMonitor = $(e.target).attr('data-answer') == '1' ? true : false;
            var redirectQueryString = this.redirectQueryString || '';
            this.model.set('createMonitor', createMonitor);
            this.model.save(null, {
                success: function(response, response) {

                    var _gaq = window._gaq || (window._gaq = []);
                    _gaq.push(['_trackEvent', 'Initiative Save', 'Success', response.response.id]);

                    this.location.href = '/automation/bot/' + response.response.id + redirectQueryString;
                }
                , error: function(model, response) {

                    var _gaq = window._gaq || (window._gaq = []);
                    _gaq.push(['_trackEvent', 'Initiative Save', 'Failure', null]);
                }
            });
        }

        , render: function() {
            if ( this.options.breadcrumbs ) {
                this.$el.append(this.breadcrumbs.render().$el);
            }

            // Render everything hidden to avoid potential flicker
            var $container = $('\
                <div class="initiative-container hidden">\
                    <div style="border: 1px solid transparent"><h3 style="margin: 14px 14px 0 14px;">Search for Prospects</h3></div>\
                </div>');
            $container.append(this.keyphraseForm.render().$el);
            $container.append(this.prospectCounter.render().$el);
            $container.append($('<div class="fix"></div>'));
            $container.append(this.prospectList.render().$el);
            this.$el.append($container);

            // Show everything
            $container.removeClass('hidden');

            return this;
        }

        , keyphrasesChanged: function(e) {
            this.prospectList.render();
        }

        , prospectsLoadingStart: function() {
            // A button started loading prospects
            this.loading_count++;
            this.prospectCounter.showLoader();
        }

        , prospectsLoadingEnd: function(e) {
            // A button finished loading prospects
            this.loading_count--;
            if ( this.loading_count < 1 ) {
                this.prospectCounter.hideLoader();
            }
        }
    });

    namespace.MarketingInitiativeWizard.Breadcrumbs = Backbone.View.extend({
        initialize: function() {
            this.currentStep = 1; // 1-indexed (first index is for "Create Marketing Initiative")
        }

        , render: function($el) {
            var $container = $('\
                <div class="breadCrumbHolder module">\
                    <div class="breadCrumb module">\
                        <ul>\
                            <li class="firstB"><a href=""></a> &nbsp; Create Marketing Initiative</li>\
                            <li><a href="">Search</a></li>\
                            <li><a href="">Template</a></li>\
                        </ul>\
                    </div>\
                </div>\
            ');

            var $steps = $container.find('li')
                .removeClass('current')
                .removeClass('completed');

            $($steps.get(this.currentStep)).addClass('current');
            for( var i = 0; i < this.currentStep; i++ ) {
                $($steps.get(i)).addClass('completed');
            }

            this.$el.empty().append($container);

            return this;
        }

        , setStep: function(step) {
            this.currentStep = step;
            return this;
        }
    });

    namespace.MarketingInitiativeWizard.KeyphrasesForm = Backbone.View.extend({
        tagName: 'div'

        , className: 'keyphrases body'

        , events: {
            "keyup .keyphrase": "keyupKeyphrase"
            , "click .keyphrases-add": "addKeyphrase"
            , "click .keyphrases-suggest": "suggestKeyphrase"
        }

        , render: function() {
            this.$el.empty();

            var $keyphrases = $('\
                <span>Enter keyphrases to search for prospects</span>\
                <button class="keyphrases-add basicBtn">Add keyphrase</button>\
                <button class="keyphrases-suggest basicBtn">Suggest keyphrase</button>\
                <img src="/images/loaders/loader2.gif" class="hidden loading" />\
                <div class="fix"></div>\
            ');

            this.$el.append($keyphrases);

            // Ad stored keyphrases
            _.each(this.model.get('keyphrases'), function(keyphrase) {
                this.addKeyphrase(keyphrase)
            }, this);

            // Add empty input
            if( this.model.get('keyphrases').length == 0 ) {
                this.addKeyphrase();
            }

            return this;
        }

        , suggestKeyphrase: function(e) {
            this.$('.keyphrases-suggest').attr('disabled', true);

            var showErrorTip = function(message, timeout) {
                this.$('.keyphrases-suggest').attr('disabled', false)
                    .tooltip({
                        trigger: 'manual',
                        placement: 'bottom',
                        title: message
                    })
                    .tooltip('show');

                setTimeout(function(){
                    this.$('.keyphrases-suggest').tooltip('hide');
                }, timeout || 4500);
            };


            $.ajax({
                dataType: 'json'
                , method: 'GET'
                , url: '/api/vertical/random'
                , data: { count: 1 }
                , context: this
                , success: function(resp) {
                    var that = this;

                    this.clearMachineKeyphrases();

                    if (resp.response.random_keywords.length > 0) {
                        this.addKeyphrase(resp.response.random_keywords[0], true);
                    } else {
                        //No keyphrases
                        this.addKeyphrase(resp.response.vertical.name.toLowerCase() + " expert", true);
                        //showErrorTip("We don't have any suggestions for " + resp.response.vertical.name + " companies");
                    }


                    this.$('.keyphrases-suggest').attr('disabled', false);
                }
                , error: function(xhr, textStatus, errorThrow) {
                    var resp = jQuery.parseJSON(xhr.responseText);

                    if (resp.response && resp.response.status == "no industry") {
                        showErrorTip($('<span>No suggestions, please <a href="' + resp.response.edit_url + '">Edit This Group</a> and select an industry</span>'), 8000);
                    } else {
                        showErrorTip("We apologize, there was an error fetching a suggested keyphrase");
                    }

                }
            });
        }

        , keyupKeyphrase: function(e) {
            if (e.keyCode == 13) {
                // User hit enter
                this.$('.keyphrase').last().focus();
                this.storeKeyphrases(e);
            } else if(e.keyCode == 8) {
                // User hit backspace
                if ($(e.target).val().trim() == '' && $(e.target).prev('input').length ) {
                    $(e.target).prev('input').focus();
                    $(e.target).remove();
                }
                this.storeKeyphrasesWithTimeout(e);
            } else if(e.keyCode == 40 && $(e.target).next('input').length) {
                // User hit down arrow
                $(e.target).next('input').focus()
                this.storeKeyphrases(e);
            } else if(e.keyCode == 38 && $(e.target).prev('input').length) {
                // User hit up arrow
                $(e.target).prev('input').focus()
                this.storeKeyphrases(e);
            } else if(e.keyCode == 17) {
// User hit ctrl, dump keyphrases
//console.info('Keyphrases: ', this.model.get('keyphrases'));
//console.info('Prospects: ', this.model.get('prospects'));
            } else {
                this.storeKeyphrasesWithTimeout(e);
            }
            this.ensureBlankKeyphrase();
        }

        , ensureBlankKeyphrase: function() {
            var hadFocus = this.$('.keyphrase:focus').length > 0;

            this.$('.keyphrase[value=""]:not(:last)').remove();


//            var emptyInputs = _.filter(this.$('.keyphrase'), function($el) {
//                return $($el).val().trim().length == 0;
//            });
//            if ( emptyInputs.length == 0 ) {
//                this.addKeyphrase();
//            }

            if (this.$('.keyphrase').last().val() != '')
                this.addKeyphrase();

            var stillHasFocus = this.$('.keyphrase:focus').length > 0;

            if (hadFocus && !stillHasFocus) {
                this.$('.keyphrase').last().focus();
            }
        }

        , clearMachineKeyphrases: function() {
            this.$('.keyphrase.machine').remove();
        }

        , addKeyphrase: function(obj, machine) {
            var keyphrase = '';

            if ( typeof obj == 'string' ) {
                var keyphrase = obj;
            }

            var $keyphrase = this.getKeyphraseInput(keyphrase);

            if (machine) {
                $keyphrase.addClass('machine')
                    .bind('change.ghostinthemachine', function(){
                        $(this).removeClass('machine')
                               .unbind('change.ghostinthemachine');
                    });
            }

            if (keyphrase == '') {
                this.$('.keyphrases-add').before($keyphrase);
            } else {
                this.$('.keyphrase').last().before($keyphrase);
                this.storeKeyphrases();
            }

            return $keyphrase;
        }

        , storeKeyphrases: function() {
            if ( typeof this.storeKeyphraseTimeout == 'number' ) {
                clearTimeout(this.storeKeyphraseTimeout);
            }

            var keyphrases = this.$el.find('.keyphrase');
            keyphrases = _(keyphrases).filter(function(el) {return $(el).val().trim().length; })

            _(keyphrases).each(function(keyphrase) {
                    var _gaq = window._gaq || (window._gaq = []);

                    if ($(keyphrase).is('.machine')) {
                        _gaq.push(['_trackEvent', 'Initiative Keyword Search', 'Suggested', $(keyphrase).val().trim()]);
                    } else {
                        _gaq.push(['_trackEvent', 'Initiative Keyword Search', 'Organic', $(keyphrase).val().trim()]);
                    }
            });

            keyphrases = _(keyphrases).map(function(el) { return $(el).val().trim(); } );

            this.model.set('keyphrases', keyphrases);
        }
        , storeKeyphrasesWithTimeout: function() {
            if ( typeof this.storeKeyphraseTimeout == 'number' ) {
                clearTimeout(this.storeKeyphraseTimeout);
            }
            this.storeKeyphraseTimeout = setTimeout(_.bind(this.storeKeyphrases, this), 1000 );
        }

        , getKeyphraseInput: function( keyphrase ) {
            keyphrase = String(keyphrase || '');
            return $('<input type="text" class="keyphrase" name="keyphrase" value="' + keyphrase + '" />');
        }
    });

    namespace.MarketingInitiativeWizard.ProspectCounter = Backbone.View.extend({
        tagName: 'div'

        , className: 'prospect-counter body empty'

        , events: {
            "click .prospect-filter" : "clickProspectFilter"
        }

        , initialize: function() {
            this.model.on('change:blacklist', this.update, this);
        }

        , render: function() {
            var $placeholder = $('\
                <div class="prospect-count">' + this.model.get('prospects').length + ' prospects</div>\
                <a href="#" class="prospect-filter">Filter Prospects</a>\
                <div class="loading hidden"></div>\
                <div class="fix"></div>\
                <em style="font-size:95%;">Prospects are only added if they meet certain minimum criteria.</em>\
                <button class="prospect-counter-next basicBtn" disabled>Next: Messaging &raquo;</button>\
                <div class="fix"></div>\
            ');

            if ( this.model.getFilteredCount() > 0 ) {
                setTimeout(_.bind(function() {
                    $('.prospect-counter-next', $placeholder).addClass('enabled').removeAttr('disabled');
                    this.$el.addClass('acceptable');
                }, this), 500);
            }
            this.$el.empty().append($placeholder);

            return this;
        }

        , update: function() {
            this.$('.prospect-count').html(this.model.getFilteredCount() + ' prospects');
        }

        , showLoader: function() {
            this.$el.removeClass('empty');
            this.$('.loading').removeClass('hidden');
            this.$('.prospect-counter-next').attr('disabled', 'disabled');
            this.$('.prospect-counter-next').removeClass('enabled');
        }

        , hideLoader: function() {
            this.$('.loading').addClass('hidden');
            this.$('.prospect-counter-next').removeAttr('disabled');
            this.$('.prospect-counter-next').addClass('enabled');
            this.$el.addClass('acceptable');
        }

        , prospectsChanged: function(e) {
            if ( typeof this.model.changed == 'undefined' || typeof this.model.changed.prospects == 'undefined' ) {
                return;
            }

            var newProspects = this.model.changed.prospects.reverse();
            if( typeof newProspects == 'object' && newProspects.length) {
                for ( var i = 0; i < 5 && typeof newProspects[i] != 'undefined'; i++) {
                    var pic = $('<img>', {
                        src: newProspects[i].profile_image_url, class: 'prospect-pic'
                        , style: 'left: ' + ((4 - i) * 5) + 'px'
                    });
                    pic.animate({
                        left: '130px'
                        , opacity: 0
                    }, i * 200 + 200);
                    this.$('.prospect-counter-next').before(pic);

                }
                this.update();
            }
        }
        , clickProspectFilter: function(e) {
            e.preventDefault();
            var that = this;

            var $modal = $('<div class="automation-wizard">');

            $('<p style="margin: 0 0 15px 0;padding: 0">Below you can enter keyphrases that should <strong>not</strong> be present in the prospects handle or bio. You can manage this blacklist later by editing this initiative.</p>')
                .appendTo($modal);

            _(this.model.get('blacklist')).each(function(keyphrase){
                $('<input type="text" class="keyphrase">')
                    .val(keyphrase)
                    .appendTo($modal);
            });

            var $text = $("<input type='text' class='keyphrase'>")
                .appendTo($modal);

            var changeListener = function(e) {
                $modal.find('.keyphrase[value=""]:not(:last)').remove();
                if ($modal.find('.keyphrase').last().val() != '') {
                    $("<input type='text' class='keyphrase'>").insertBefore($modal.find('.keyphrases-add'));
                }
            };
            $modal.on('change', '.keyphrase', changeListener);
            $modal.on('keyup', '.keyphrase', changeListener);

            var $save = $('<button class="keyphrases-add basicBtn">Save Blacklist</button>')
                .appendTo($modal);

            $modal.on('click', '.keyphrases-add', function(e) {
                var blacklist = [];
                $modal.find('.keyphrase').each(function(){
                    var value = $(this).val();

                    if (value != '')
                        blacklist.push(value);
                });
                that.model.set('blacklist', blacklist);

                that.update();

                $.modal.close();
            });

            var modal = $modal.modal({
                    overlayClose: true
                    , minWidth: 332
                    , maxWidth: 332
                    , minHeight: 100
                    , maxHeight: 480
                    , autoResize: true
                    , autoPosition: true
                    , containerCss: {
                        margin: 0
                        , padding: 0
                    }
                    , dataCss: {
                        margin: 0
                        , padding: 10
                    }
                    , onOpen: function(dialog) {
                        dialog.data.show();
                        dialog.container
                            .css({
                                top: - dialog.container.outerHeight()
                            })
                            .show()
                            .animate({
                                top: ($(window).height() / 2) - (dialog.container.outerHeight() / 2)
                            }, 'fast', 'swing');
                        dialog.overlay.fadeIn('fast');
                    }
                    , onClose: function(dialog) {
                        dialog.container
                            .animate({
                                top: - dialog.container.outerHeight()
                            }, 'fast', 'swing', function() {
                                $.modal.close();
                            });
                        dialog.overlay.fadeOut('fast');
                    }
                });

        }
    });

    namespace.MarketingInitiativeWizard.ProspectList = Backbone.View.extend({
        tagName: 'div'

        , className: 'prospects body'

        , initialize: function() {
            this.clickCount = 0;
        }

        , events: {
            'click *': 'hideFlyouts'
            , 'click .prospect-add-user': 'addUser'
            , 'click .prospect-add-friends': 'addFriends'
            , 'click .prospect-add-followers': 'addFollowers'
            , 'click .compound-button-toggle': 'expandButton'
        }

        , addUser: function(e) {
            var $target = $(e.target);
            var uid = Number($target.attr('data-uid'));
            var that = this;

            this.beforeAddProspects( $target );
            that.getInfoForUsers([uid], $target);
        }

        , addFriends: function(e) {
            this.addUsers(e, 'http://api.twitter.com/1/friends/ids.json');
        }

        , addFollowers: function(e) {
            if ( !this.clickCount ) {
                this.showFindProspectsHelp($(e.target));
            } else {
                this.addUsers($(e.target), 'http://api.twitter.com/1/followers/ids.json');
            }
        }

        , addUsers: function($button, url) {
            var uid = Number($button.attr('data-uid'));
            var that = this;
            $.ajax({
                url: url
                , dataType: 'jsonp'
                , data: {user_id: uid}
                , context: that
                , beforeSend: this.beforeAddProspects.apply(this, [$button])
                , timeout: 15000
            }).then(function(data, status, promise) {
                that.getInfoForUsers(data.ids.slice(0,1000), $button);
            }).fail(function(data, status, promise) {
                if ( 'timeout' == status ) {
                    var tip = $button.tooltip({title: 'Error communicating with Twitter. Some prospects were not added. Please try again.', trigger: 'manual'}).tooltip('show');
                    setTimeout( function() { $button.tooltip('hide'); }, 10000 );
                }
                this.addProspectsFail($button)
            });
        }

        , getInfoForUsers: function(ids, $target) {
            // Chunk user IDs and get their info in parallel

            var xhrs = [];
            for ( var i = 0; i < ids.length; i += 100 ) {
                var chunked_ids = ids.slice(i, i+100);

                xhrs.push($.ajax({
                    url: '/api/twitter/user-info'
                    , type: 'POST'
                    , data: JSON.stringify({uids: chunked_ids})
                    , context: this
                    , success: _.bind(this.addProspectsSuccess, this)
                }))
            }
            $.when.apply($, xhrs)
                .always(_.bind(this.addProspectsComplete, this, $target))
                .fail(_.bind(function($target, progress, status) {
                    if ( 'timeout' == status ) {
                        $button = $target.parents('.compound-button');
                        var tip = $button.tooltip({title: 'Error communicating with Twitter. Some prospects were not added. Please try again.', trigger: 'manual'}).tooltip('show');
                        setTimeout( function() { $button.tooltip('hide'); }, 10000 );
                    }
                }, this, $target));
        }

        , beforeAddProspects: function($target) {
            this.trigger('loading_start')
            if ( !$target.hasClass('.compound-button-default') ) {
                $target = $target.parents('.compound-button').find('.compound-button-default');
            }
            $('.loading', $target).removeClass('hidden');
        }

        , addProspectsSuccess: function(response, status, jqXhr) {
            var obj = response.response;
            // Updates the model with data

            var prospects = this.model.get('prospects');
            prospects = _.union(prospects, obj);
            prospects = _.uniq(prospects, false, function(obj) {
                return obj.id_str;
            });
            this.model.unset('prospects', {silent:true}).set('prospects', prospects);

            var _gaq = window._gaq || (window._gaq = []);
            _gaq.push(['_trackEvent', 'Initiative Add Prospects', 'Success', prospects.length]);
        }

        , addProspectsFail: function($target) {
            this.trigger('loading_end')
            if ( !$target.hasClass('.compound-button-default') ) {
                $target = $target.parents('.compound-button').find('.compound-button-default');
            }
            $('.loading', $target).addClass('hidden');

            var _gaq = window._gaq || (window._gaq = []);
            _gaq.push(['_trackEvent', 'Initiative Add Prospects', 'Failed', null]);
        }

        , addProspectsComplete: function($target) {
            // Handles updating the view(s) regardless of success or failure

            if ( !$target.hasClass('.compound-button-default') ) {
                $target = $target.parents('.compound-button').find('.compound-button-default');
            }
            $('.loading', $target).addClass('hidden');
            this.trigger('loading_end');
        }

        , render: function() {
            if ( !this.model.get('keyphrases').length ) {
                return this;
            }

            var that = this;
            $.ajax({
                url: '/api/proxy/twitter/users/search.json?q=' + this.model.get('keyphrases').join('+')
                , beforeSend: function( jqXhr, settings) {
                    that.trigger('influencers_empty');
                    that.$el.empty().append('Searching twitter <img style="vertical-align: top;" src="/images/loaders/loader7.gif" />');
                }
                , success: function(data, textStatus, jqXHR) {
                    that.$el.empty();
                    _.each(data, function(userObj) {
                        that.$el.append(that.getUserEl(userObj));
                    })
                    that.trigger('influencers_loaded', data.length);
                }
                , error: function(data, textStatus, jqXHR) {
                    that.$el.empty().append('<em class="red">Error communicating with Twitter. Please try again.</em>');
                }
            });

            return this;
        }

        , getUserEl: function( userObj ) {
            var screenname = userObj.name.toLowerCase().trim() == userObj.screen_name.toLowerCase().trim() ? '' : ' (' + userObj.screen_name + ')';
            var location = userObj.location ? '<span class="prospect-location">' + userObj.location + '</span><br />' : '';
            var tweets = '<span class="prospect-status-count">' + userObj.statuses_count + '</span><br />';
            var listed = '<span class="prospect-listed-count">' + userObj.listed_count + '</span><br />';
            var age = '<span class="prospect-age">' + moment(userObj.created_at).fromNow() + '</span><br />';

            var limitTo1000 = function(num) { return num > 1000 ? '1000' : String(num);}

            return $('\
                    <div class="prospect">\
                        <h5><a class="prospect-screenname" target="_blank" href="http://twitter.com/' + userObj.screen_name + '">' + userObj.name + '</a>' + screenname + '</h5>\
                        <img src="' + userObj.profile_image_url + '" />\
                        ' + location + '\
                        ' + tweets + '\
                        ' + listed + '\
                        ' + age + '\
                        <div class="prospect-bio">\
                            ' + (userObj.description || '') + '\
                        </div>\
                        <div class="compound-button">\
                            <button class="compound-button-default prospect-add-followers basicBtn blueBtn" data-uid="' + userObj.id + '">Find prospects<img class="loading hidden" src="/images/loaders/prospect-loader.gif" /></button><div class="button compound-button-toggle basicBtn blueBtn"><img src="/images/ui/dropdown_arrow.png"></div>\
                            <ul class="compound-button-flyout hidden">\
                                <li><button class="prospect-add-friends" data-uid="' + userObj.id + '">Add friends<img class="loading hidden" src="/images/loaders/prospect-loader.gif" /></button></li>\
                                <li><button class="prospect-add-user" data-uid="' + userObj.id + '">Add user<img class="loading hidden" src="/images/loaders/prospect-loader.gif" /></button></li>\
                            </ul>\
                        </div>\
                        <div class="fix"></div>\
                    </div>\
                ');
        }

        , expandButton: function(e) {
            $(e.target).parents('.compound-button').find('.compound-button-flyout').toggleClass('hidden');
        }

        , hideFlyouts: function(e) {
            if( $(e.target).parents('.compound-button').length == 0 ) {
                this.$('.compound-button-flyout').addClass('hidden');
            }
        }

        , showFindProspectsHelp: function($button) {
            var view = this;
            $.modal('<div></div>', {
                containerCss: {
                    width: "310px"
                    , height: "475px"
                }
                , onShow: function(dialog) {
                    var $prospect = $button.parents('.prospect').clone();
                    var $prospect_title = $prospect.find('h5').css({textAlign: 'center'});
                    var $prospect_image = $prospect.find('img:first').css({display: 'block', marginLeft: 'auto', marginRight: 'auto'});
                    var $illustration = $('<img/>').attr({
                        src: '/images/find-prospects-explanation.png'
                    }).css({display: 'block', marginLeft: 'auto', marginRight: 'auto'});

                    var $content = $('div', dialog.data)
                        .append( $('<h1>How are prospects found?</h1>').css({marginBottom: '20px', textAlign: 'center'}) )
                        .append($prospect_title, $prospect_image, $illustration)
                        .append($('<br/>') )
                        .append($('<p>SplashCube will find people following <strong>' + $prospect_title.find('a').text() + '</strong> and interested in <strong>' + view.model.get('keyphrases').join(', ') + '</strong> to store as prospects.</p>') )
                        .append($('<br/>') )
                        .append($('<button class="button btnBasic">Cancel</button>').addClass('cancel').css({marginLeft: '125px', marginRight: '10px'}) )
                        .append($('<button class="button blueBtn">Continue</button>').addClass('continue') )
                        .append($('<div></div>').addClass('clear') )

                    $('button', $content).on('click', function(e) {
                        if ( $(e.target).hasClass('continue') ) {
                            view.addUsers($button, 'http://api.twitter.com/1/followers/ids.json');
                        }
                        $.modal.close();
                    });

                    view.clickCount++;
                }
            });
        }
    });

    namespace.TemplateForm = Backbone.View.extend({
        tagName: 'div'

        , className: 'template-form body'

        , events: {
            "keydown .template-form-textarea": "keydownInTextarea"
            , "keyup .template-form-textarea": "keyupInTextarea"
            , "paste .template-form-textarea": "pasteInTextarea"
            , "mouseup .template-form-placeholder": "mouseupInPlaceholder"
            , "click .template-form-finish": "clickFinishButton"
        }

        , initialize: function() {
            this.options = _.defaults(this.options, {
                enablePreview: true
                , buttonText: 'Start initiative'
            })
            this.model.on('change:template', this.updateCharacterCount, this);
        }

        , render: function() {
            var $inputEl = $('\
                <p>Enter a message to send to a random prospect every 6 hours. Type <em>[[person]]</em> to create a placeholder for a prospect\'s username.</p>\
                <div class="template-form-textarea" contenteditable="true"><div class="template-form-placeholder" contenteditable="false">person</div> </div>\
                <div class="floatright">Characters: <span class="character_count">0</span></div><br />\
                <br />\
                <div class="floatright"><span class="person-warning" style="display:none"><em>You must include</em> [[person]] <em>in your message</em></span> &nbsp; <button class="template-form-finish basicBtn blueBtn">' + this.options.buttonText + '</button></div>\
                <div class="fix"></div>\
            ');

            $inputEl.find('.errors').hide();

            this.$el.empty().append($inputEl);
            if ( this.options.enablePreview ) {
                this.$el.append($('\
                    <br />\
                    <p>Preview of message as it will appear on Twitter:</p>\
                    <div class="template-form-preview">\
                        <img src="http://api.twitter.com/1/users/profile_image?screen_name=' + this.options.screen_name + '" />\
                        <div class="message">\
                            <strong class="template-name">' + this.options.name + '</strong> &nbsp;<span class="template-screenname">@' + this.options.screen_name + '</span> <span class="template-time">1m</span>\
                            <div class="template-preview"></div>\
                            <span class="template-expand">Expand</span>\
                        </div>\
                        <div class="fix"></div>\
                    </div>'));
                this.updatePreview();
            }
            this.updateCharacterCount();
            return this;

        }

      , clickFinishButton: function() {
            var that = this;
            var addError = function(message) {
                var $message = $('<div class="nNote nFailure"></div>');

                $('<p>')
                    .html(message)
                    .appendTo($message);

                $message.hide();
                that.$el.prepend($message);
                $message.fadeIn();
            };


            var validation = this.model.validateTemplate();

            this.$('.nNote.nFailure').remove();
            if (validation.valid) {
                this.trigger('click:finish', this.model);
            } else {

                if (validation.noPerson) {
                    addError('You must include a [[person]] tag to directly target a prospect and prevent Twitter from declaring the tweet a duplicate');
                }


//                if (validation.noQuestion) {
//                    addError('Your template must ask a question as questions receive higher response rate and is less likely to be flagged as spam');
//                }

                if (validation.hasUrl) {
                    addError('Automated marketing templates may <strong>not</strong> contain links as unsolicited links are considdered spammy and reduce your response rates.');
                }

                if (validation.tooShort) {
                    addError('Your template must be at least 15 characters long');
                }


                if (validation.tooLong) {
                    addError('Your template may not be longer than 140 characters');
                }
            }
        }

        , updatePreview: function() {
            var screenname = this.model.get('prospects')[0].screen_name;

            var message = this.model.get('template')
                .replace(/\[\[person\]\]/g, '@' + screenname );

            this.$el.find('.template-preview').html(message);
        }

        , updateCharacterCount: function() {
            var message = this.model.get('template');
            var count = Splash.calculateMessageLength(message);
            var $characterCount = this.$('.character_count');
            $characterCount.html(count);
            if ( count > 140 ) {
                $characterCount.addClass('too-long');
            } else {
                $characterCount.removeClass('too-long');
            }
        }

        , mouseupInPlaceholder: function(e) {
            var selection = rangy.getSelection();
            var $parentNode = $(selection.anchorNode.parentNode);
            if ( $parentNode.hasClass('template-form-placeholder' ) ) {
                // Move caret to outside of placeholder
                var range = rangy.createRange();
                if ( selection.anchorOffset < Math.round(selection.anchorNode.length / 2) ) {
                    // Move to before placeholder
                    range.setStartBefore($parentNode.get(0));
                } else {
                    // Move to after placeholder
                    range.setStartAfter($parentNode.get(0));
                }
                selection.setSingleRange(range);
            }
        }

        , keydownInTextarea: function(e) {
            // Prevent user from entering linebreaks
            if (e.keyCode == 13) {
                e.preventDefault();
            }

            // Remove placeholders, if appropriate
            var selection = rangy.getSelection();
            var $parentNode = $(selection.anchorNode.parentNode);
            var $prevSibling = $(selection.anchorNode.previousSibling);
            var $nextSibling = $(selection.anchorNode.nextSibling);

            if ( e.keyCode == 8 && selection.anchorOffset == 0 && $prevSibling.hasClass('template-form-placeholder') ) {
                // User hit backspace on placeholder
                // Delete current selection's node
                $prevSibling.remove();
            }

            if ( e.keyCode == 46 && selection.anchorOffset == selection.anchorNode.length && $nextSibling.hasClass('template-form-placeholder') ) {
                // User hit delete on placeholder
                // Remove selection's next sibling
                $nextSibling.remove();
            }
        }

        , pasteInTextarea: function(e) {
            setTimeout(_.bind(function() {
                var message = this.placeholderToPlaintext($(e.target).html());
                message = Splash.sanitizeMessage(message);
                $(e.target).empty().append(this.plaintextToPlaceholder(message));
                this.setCaretToEnd(e.target);
            }, this), 200);
        }

        , keyupInTextarea: function(e) {
            var message = $(e.target).html();

            if ( message.match(/\[\[person\]\]/) ) {
                var placeholder = '<div class="template-form-placeholder" contenteditable="false">person</div> ';
                message = message.replace(/\[\[person\]\]/g, placeholder);
                $(e.target).empty().append(message);
                this.setCaretToEnd(e.target);
            }

            message = this.placeholderToPlaintext(message);

            message = Splash.sanitizeMessage(message);

            this.model.set('template', message);
            this.updatePreview();

            if ( message.match(/\[\[person\]\]/) ) {
                this.$('.person-warning').fadeOut();
                this.$('.template-form-finish').addClass('enabled').removeAttr('disabled');
            } else {
                this.$('.person-warning').fadeIn();
                this.$('.template-form-finish').removeClass('enabled').attr('disabled', true);
            }
        }

        , placeholderToPlaintext: function( message ) {
            return message.replace(/<div[^>]* class="template-form-placeholder"[^>]*>person<\/div>/ig, '[[person]]')
        }

        , plaintextToPlaceholder: function( message ) {
            return message.replace(/\[\[person\]\]/g, '<div class="template-form-placeholder" contenteditable="false">person<\/div>')
        }

        , setCaretToEnd: function(el) {
            if (typeof window.getSelection != "undefined"
                && typeof document.createRange != "undefined") {
                var range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (typeof document.body.createTextRange != "undefined") {
                var textRange = document.body.createTextRange();
                textRange.moveToElementText(el);
                textRange.collapse(false);
                textRange.select();
            }
        }

        , getButton: function(e) {
            return this.$('.template-form-finish');
        }
    });

})(window.Splash = window.Splash || {});