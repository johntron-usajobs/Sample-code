(function(namespace){

    namespace.MessageCollectionPagination = Backbone.View.extend({
        tagName: 'div'
      , attributes: {
        }
      , events: {
            "click .to-page": "changePage"
        }
      , initialize: function(){
            this.collection.bind('reset', this.render, this);
            this.render();

            this.options.urlTemplate = this.options.urlTemplate || function(page) { return window.location.href + '/' + page };
            this.options.changePage = this.options.changePage || function(page) { this.collection.page = page; this.collection.fetch(); };
        }
      , changePage: function(e) {
            var $target = $(e.target)
              , page = $target.data('page');

            if (page > 0) {
                this.options.changePage(page);
            }

            e.preventDefault();
        }
      , render: function() {
            var that = this;

            this.$el.empty();

            var pagination = _.defaults(this.collection.pagination || {}, {
                total_results: 0
              , page: 1
              , last_page: 1
              , offset: 0
              , limit: 50
            });



            var $firstHolder = $('<span class="toFirst ui-corner-tl ui-corner-bl fg-button ui-button">').appendTo(this.$el);
            if (pagination.page != 1) {
                $('<a class="to-page" href="' + this.options.urlTemplate(1) + '">First</a>')
                    .data('page', 1)
                    .appendTo($firstHolder);
            } else {
                $firstHolder
                    .addClass('ui-state-disabled')
                    .text('First');
            }

            var $prevHolder  = $('<span class="previous ui-corner-tl ui-corner-bl fg-button ui-button">').appendTo(this.$el);
            if (pagination.page != 1) {
                $('<a class="to-page" href="' + this.options.urlTemplate(pagination.page - 1) + '">Previous</a>')
                    .data('page', pagination.page - 1)
                    .appendTo($prevHolder);
            } else {
                $prevHolder
                    .addClass('ui-state-disabled')
                    .text('Previous');
            }

            var $pagesHolder = $('<span>').appendTo(this.$el);
            _(_.range(-3,3)).each(function(i){
                var _page = pagination.page - i;

                if (_page > 0 && _page <= pagination.last_page) {
                    var $page = $('<span class="fg-button ui-button">')
                        .prependTo($pagesHolder);

                    $('<a class="to-page" href="' + that.options.urlTemplate(_page) + '">' + _page + '</a>')
                        .data('page', _page)
                        .appendTo($page);

                    if (_page == pagination.page) {
                        $page.addClass('on');
                    }
                }
            });


            var $nextHolder  = $('<span class="next ui-corner-tl ui-corner-bl fg-button ui-button">').appendTo(this.$el);
            if (pagination.page < pagination.last_page) {
                $('<a class="to-page" href="' +this.options.urlTemplate(pagination.page + 1) + '">Next</a>')
                    .data('page', pagination.page + 1)
                    .appendTo($nextHolder);
            } else {
                $nextHolder
                    .addClass('ui-state-disabled')
                    .text('Next');
            }

            var $lastHolder  = $('<span class="last ui-corner-tl ui-corner-bl fg-button ui-button">').appendTo(this.$el);
            if (pagination.page < pagination.last_page) {
                $('<a class="to-page" href="' + this.options.urlTemplate(pagination.last_page) + '">Last</a>')
                    .data('page', pagination.last_page)
                    .appendTo($lastHolder);
            } else {
                $lastHolder
                    .addClass('ui-state-disabled')
                    .text('Last');
            }


            return this;
        }
    });

    namespace.MessageCollectionToolbar = Backbone.View.extend({
        tagName: 'div'
        , attributes: {

        }

        , events: function() {
            var events = {};
            if ( this.options.enableButtons ) {
                _.extend(events, {
                    "click .markAs .important"  : "markImportant"
                  , "click .markAs .unread"     : "markUnread"
                  , "click .markAs .read"       : "markRead"
                  , "click .markAs .archive"    : "markArchived"
                });
            }
            if ( this.options.enableFilters ) {
                _.extend(events, {
                    "change .filter-radio"      : "changeFilter"
                });
            }
            if ( this.options.enableChannels ) {
                _.extend(events, {
                    "change .channels-select"   : "changeChannel"
                });
            }
            return events;
        }

        , initialize: function() {
            this.options = _.defaults(this.options, {
                enableFilters: true
              , enableButtons: true
              , enableChannels: true
            });
            this.collection.bind('reset', this.messagesChanged, this)
            this.render();
        }

        , messagesChanged: function(e) {
        }

        , markImportant: function(e) {
            var messages = this.collection
              , selectedMessages = messages.getSelected()
              , messageIds = _.map(selectedMessages, function(message) {
                    return message.id;
                });

            jQuery.ajax( '/inbox/mark-as', {
                type: 'POST'
                , dataType: 'json'
                , data: {
                    status: 'important',
                    ids: messageIds
                }
                , success: function() {
                    messages.fetch()
                }
                , error: function(jqXhr, status) {
                    $(e.target).tooltip({title: 'Error communicating with server. Try again.', trigger: 'manual'}).tooltip('show')
                    setTimeout(function() { $(e.target).tooltip('hide'); }, 10000);
                }
            })
        }

        , markUnread: function(e) {
            var messages = this.collection
              , selectedMessages = messages.getSelected()
              , messageIds = _.map(selectedMessages, function(message) {
                    return message.id;
                });

            var that = this;
            jQuery.ajax( '/inbox/mark-as', {
                type: 'POST'
                , dataType: 'json'
                , data: {
                    status: 'unread',
                    ids: messageIds
                }
                , success: function() {
                    messages.fetch()
                }
                , error: function(jqXhr, status) {
                    $(e.target).tooltip({title: 'Error communicating with server. Try again.', trigger: 'manual'}).tooltip('show')
                    setTimeout(function() { $(e.target).tooltip('hide'); }, 10000);
                }
            })
        }
        , markRead: function(e) {
            var messages = this.collection
                , selectedMessages = messages.getSelected()
                , messageIds = _.map(selectedMessages, function(message) {
                    return message.id;
                });

            var that = this;
            jQuery.ajax( '/inbox/mark-as', {
                type: 'POST'
                , dataType: 'json'
                , data: {
                    status: 'read',
                    ids: messageIds
                }
                , success: function() {
                    messages.fetch()
                }
                , error: function(jqXhr, status) {
                    $(e.target).tooltip({title: 'Error communicating with server. Try again.', trigger: 'manual'}).tooltip('show')
                    setTimeout(function() { $(e.target).tooltip('hide'); }, 10000);
                }
            })
        }

        , markArchived: function(e) {
            var messages = this.collection
                , selectedMessages = messages.getSelected()
                , messageIds = _.map(selectedMessages, function(message) {
                    return message.id;
                });

            var that = this;
            jQuery.ajax( '/inbox/mark-as', {
                type: 'POST'
                , dataType: 'json'
                , data: {
                    status: 'archived',
                    ids: messageIds
                }
                , success: function() {
                    messages.fetch()
                }
                , error: function(jqXhr, status) {
                    $(e.target).tooltip({title: 'Error communicating with server. Try again.', trigger: 'manual'}).tooltip('show')
                    setTimeout(function() { $(e.target).tooltip('hide'); }, 10000);
                }
            });
        }



        , markAllRead: function(e) {
            window.location.href = '/inbox/mark-all-as-read';
        }

        , changeFilter: function(e) {
            this.model.set('statusFilter', e.target.value);
            this.model.save();
        }

        , changeChannel: function(e) {
            this.model.set('channel', $(e.target).val());
            this.model.save();
        }

        , render: function() {
            if ( this.options.enableChannels ) {
                this.$el.append(this._renderChannels());
            }
            if ( this.options.enableFilters ) {
                this.$el.append(this._renderFilters());
            }
            if ( this.options.enableButtons ) {
                this.$el.append(this._renderButtons());
            }

            return this;
        }
        , _renderButtons: function() {
            var $container = $('<div class="toolbar-group markAs">');
            $container.append( $('<button class="important btn14 ml5" title="Mark as Important"><img src="/images/icons/dark/star.png" /></button>').tooltip());
            $container.append( $('<button class="unread btn14 ml5" title="Mark as Unread"><img src="/images/icons/dark/doc.png" /></button>').tooltip());
            $container.append( $('<button class="read btn14 ml5" title="Mark as Read"><img src="/images/icons/dark/doc-check.png" /></button>').tooltip());
            $container.append( $('<button class="archive btn14 ml5" title="Archive Selected Posts"><img src="/images/icons/dark/archive.png" /></button>').tooltip());
            // <button class="archived basicBtn" data-label="read">Archive</button>

            return $container;
        }
        , _renderFilters: function() {
            var $container = $(' <div class="toolbar-group filters">')
                , $filter;
            $filter = $('<input type="radio" class="filter-radio" data-filter="all" name="filter" value="all" id="all" /> <label for="all">All</label>');
            if ( this.model.get('statusFilter') == 'all' ) {
                $filter.attr('checked', 'checked');
            }
            $container.append($filter);

            var $filter = $('<input type="radio" class="filter-radio" data-filter="all" name="filter" value="unread" id="unread" /> <label for="unread">Unread</label>');
            if ( this.model.get('statusFilter') == 'unread' ) {
                $filter.attr('checked', 'checked');
            }
            $container.append($filter);

            var $filter = $('<input type="radio" class="filter-radio" data-filter="all" name="filter" value="important" id="important" /> <label for="important">Important</label>');
            if ( this.model.get('statusFilter') == 'important' ) {
                $filter.attr('checked', 'checked');
            }
            $container.append($filter);

            var $filter = $('<input type="radio" class="filter-radio" data-filter="all" name="filter" value="archived" id="archived" /> <label for="important">Archived</label>');
            if ( this.model.get('statusFilter') == 'archived' ) {
                $filter.attr('checked', 'checked');
            }
            $container.append($filter);

            return $container;
        }
        , _renderChannels: function() {
            var that = this
              , $container = $(' <div class="toolbar-group channels">');

            var $select = $('<select name="channel" class="channels-select">')
              , $optgroup = $('<optgroup label="Network">');

            $select.append( $('<option value="">All messages</option>') );

            _(this.options.channels).each(function(channel){
                if (_.isString(channel)) {

                    $select.append($optgroup);
                    $optgroup = $('<optgroup>').attr('label', channel);
                    return true;
                }

                var $option = $('<option value="' + channel.value + '">' + channel.name + '</option>')
                if ( that.model.get('channel') == channel.value ) {
                    $option.attr('selected', 'selected');
                }
                $optgroup.append( $option )
            });

            $select.append($optgroup);

            $container.append($select);

            return $container;
        }
    });

    namespace.MessageList = Backbone.View.extend({
        tagName: 'tbody'

        , initialize: function() {
            this.options = _.defaults(this.options, {
                selected: false
                , enableSelect: true
                , enableImportant: true
                , enableRead: true
            });
            this.firstLoad = true;
            this.collection.bind('reset', this.messagesChanged, this);
            this.views = [];
            this.options.elsCheckAll.bind('click', _.bind(this.checkAll, this));
            this.render();
            this.collection.fetch();
        }

        , render: function() {
            var that = this;
            this.$el.empty();
            this.views = [];

            // Return url builder for messages based on collection URL
            var messageUrl = this.collection.url == '/api/inbox/' ?
                function() { return '/inbox/item/' + this.model.id; }
              : function() { return '/monitors/results/' + this.model.id + '/show'; };

            if ( 0 == this.collection.models.length ) {
                if (this.firstLoad)
                    this.$el.append($('<tr><td colspan="100%"><em>Loading page...</em></td></tr>'));
                else if (this.collection.url.match(/inbox/i))
                    this.$el.append($('<tr><td colspan="100%"><em>No messages</em></td></tr>'));
                else
                    this.$el.append($('<tr><td colspan="100%"><em>No results yet for your monitors</em></td></tr>'));
            } else {
                _.each(this.collection.models, function(message) {
                    var view = new namespace.Message({
                        model: message
                        , enableSelect: this.options.enableSelect
                        , enableImportant: this.options.enableImportant
                        , enableRead: this.options.enableRead
                        , url: messageUrl
                    });
                    this.$el.append(view.$el);
                    this.views.push(view);
                }, that);
            }
            this.options.elsCheckAll.removeAttr('checked');


            if (Splash.scaffoldTwitterHandles) {
                Splash.scaffoldTwitterHandles();
            }
        }

        , messagesChanged: function() {
            this.firstLoad = false;
            this.render();
        }

        , checkAll: function(e) {
            _.each(this.views, function(message) {
                message.toggleSelected(jQuery(e.target).attr('checked') == 'checked');
            })
        }
    })

    namespace.Message = Backbone.View.extend({
        tagName: 'tr'
        , events: {
            'change .select input[type=checkbox]' : 'toggleSelected'
          , 'click .important' : 'toggleImportant'
        }

        , initialize: function() {
            this.options = _.defaults(this.options, {
                selected: false
                , enableSelect: true
                , enableImportant: true
                , enableRead: true
            });
//            this.model.bind('change')
            this.render();
        }

        , render: function() {
            $el = $(this.el).empty();
            var that = this
                , model = this.model;

            var flags = this.model.get('flags') || {};

            if( this.options.enableImportant && flags.important ) {
                $el.addClass('important');
            } else {
                $el.removeClass('important');
            }
            if( this.options.enableRead && flags.unread ) {
                $el.addClass('unread');
            } else {
                $el.addClass('read');
            }

            if ( 'direct_message' == this.model.get('type') ) {
                $el.addClass('direct-message');
            }

            if ( this.model.get('has_replied') ) {
                $el.addClass('has-replied');
            }

            $el.addClass( this.model.get('channel') );

            if ( this.options.enableSelect ) {
                $el.append( $('<td class="select"><input type="checkbox" ' + (this.options.selected ? 'checked="checked" ' : '') + '/></td>'))
            }
            if ( this.options.enableImportant ) {
                $el.append( $('<td class="important">&nbsp;</td>'))
            }

            var url = this.options.url();
            var author_name = this.model.get('author_name')
              , isMonitorResult = false;

            if (this.model.get('author')) {
                author_name = this.model.get('author');
                isMonitorResult = true;
            }

            if (this.model.get('channel') == 'twitter') {
                $el.append( $('<td class="user ' + this.model.get('channel') + '">' + this.wrapTwitterHandles("@" + author_name) + '</td>'));
            } else {
                $el.append( $('<td class="user ' + this.model.get('channel') + '">' + author_name + '</td>'));
            }

            var $message = $('<td class="message">')
              , message = this.model.get('message');
            switch(this.model.get('channel')) {
                case 'twitter':
                    $('<a href="' + url + '">' + this.wrapTwitterHandles(this.truncateMessage(message, 58), true) + '</a>')
                        .appendTo($message);
                    break;
                case 'facebook':
                    if ($('<span>').html(message).find('img').length > 0) {

                        $('<a href="'+url+'"><img src="/images/icons/dark/camera.png" alt="Facebook Picture" style="margin: -3px 5px 0 0" /><em>Image</em></a>')
                            .appendTo($message);
                        break;
                    }
                case 'linkedin':
                default:
                    $('<a href="' + url + '">' + this.truncateMessage(message, 58) + '</a>')
                        .appendTo($message);
                    break;
            }

            if ( this.model.get('has_replied') ) {
                $message.prepend( $('<img src="/images/icons/dark/arrowLeft.png" class="has-replied" />'))
            }
            if ( 'direct_message' == this.model.get('type') ) {
                $message.prepend( $('<img src="/images/icons/dark/locked2.png" class="direct-message" />'))
            }
            $el.append( $message );

            $el.append( $('<td class="date"><a href="' + url + '">' + moment(this.model.get('date_occurred')).fromNow() + '</a></td>'));


            //Configure Icon

            var $cogIcon = $('<a class="dropdown-toggle" data-toggle="dropdown" data-target="' + this.model.cid + '" href="#"><img src="/images/icons/dark/cog2.png" /></a>');
            var $menu = $('<ul class="dropdown-menu">');

            $('<li><a href="' + url + '">View Details</a>')
                .appendTo($menu);

            if (this.model.get('channel') == 'twitter') {
                $('<li><a class="retweet" href="">Retweet</a></li>')
                    .click(function(e){
                        e.preventDefault();

                        var link = $(this);

                        var rtBody = 'RT @' + author_name
                            , rtBodyLength = rtBody.length
                            , rtMessage = model.get('message')
                            , rtMessageLength = rtMessage.length
                            , maxMessageLength = 140 - rtBodyLength - 3;

                        if (rtMessageLength > maxMessageLength) {
                            rtMessage = rtMessage.substring(0, maxMessageLength - 3) + "...";//String.fromCharCode(8230); //&hellip;
                        }



                        var rt = new Splash.Models.Post({
                            body: rtBody + ' "' + rtMessage + '"'
                            , networks: ['twitter']
                            , timestamp: moment().add('m', 15)
                        });


                        var rtPoster = new Splash.Poster({
                            networks: ['twitter']
                            , model: rt
                            , allowReschedule: true
                            , allowRepublish: false
                        });

                        rtPoster.showInModal();
                    })
                    .appendTo($menu);
            }

            if (!isMonitorResult) {
                $('<li class="divider">')
                    .appendTo($menu);
    //            $('<li><a class="markAsUnread" href="">Mark As Unread</a></li>')
    //                .click(function(e){
    //                    e.preventDefault();
    //
    //                    that.toggleUnread();
    //                })
    //                .appendTo($menu);
                $('<li><a class="starAsImportant" href="">Star As Important</a></li>')
                    .click(function(e){
                        e.preventDefault();

                        that.toggleImportant();
                    })
                    .appendTo($menu);
            }


            $cogIcon.dropdown();

            $el.append($('<td class="configure dropdown">')
                .append($('<div class="menu" style="position: relative;">').append($cogIcon).append($menu)));

            this.$el = $el.show();

            return this;
        }

        , toggleImportant: function() {
            var flags = this.model.get('flags')
            flags.important = !flags.important
            if( flags.important ) {
                this.$el.addClass('important')
            } else {
                this.$el.removeClass('important')
            }
            this.model.set('flags', flags)
            this.model.save()
        }

        , toggleSelected: function(state) {
            if (typeof state != 'boolean') {
                state = !this.options.selected;
            }
            this.options.selected = state;
            this.model.set('selected', state);
            this.$el.toggleClass('selected', state)
            this.$el.find('.select input').attr('checked',state)
        }

        , truncateMessage: function(message, n){
            message = message || "";
            var toLong = message.length>n,
            s_ = toLong ? message.substr(0,n-1) : message;
            s_ = toLong ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
            return  toLong ? s_ + '&hellip;' : s_;
        }

        , wrapTwitterHandles: function(message, span) {
            if (span)
                return message.replace(Splash.twitterHandleRegex, '<span class="twitter-handle-info" data-handle="$1" data-ignore>@$1</span>');
            else
                return message.replace(Splash.twitterHandleRegex, '<a href="http://twitter.com/$1" target="_blank" class="twitter-handle-info" data-handle="$1" data-ignore>@$1</a>');
        }
    });



})(window.Splash = window.Splash || {});