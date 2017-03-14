"use strict";
function escapeHtml(unsafe) {
    if (!unsafe) {
        return unsafe;
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function hashCode(val) {
    var hash = 0, i, chr, len;
    if (val.length === 0) return hash;
    for (i = 0, len = val.length; i < len; i++) {
        chr = val.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

var UsersView = Backbone.View.extend({
    model: new Backbone.Collection(),
    initialize(args){
        this._eventEmitter = args.eventEmitter;
        this.model.on('change', this.render, this);
        this.model.on('reset', this.render, this);
    },
    render() {
        this.$el.empty();
        let _this = this;
        this.model.each((user) => {
            let userView = new UserView({model: user, eventEmitter: this._eventEmitter});
            _this.$el.append(userView.render().$el);
        });
        return this;
    }
});

var UserView = Backbone.View.extend({
    tagName: "a",
    initialize(args){
        this._eventEmitter = args.eventEmitter;
    },
    className() {
        return "collection-item waves-effect";
    },
    events: {
        "click": "openChat"
    },
    openChat() {
        this._eventEmitter.emit('open-chat', this.model);
    },
    render() {
        this.$el.html(escapeHtml(this.model.get('username')));
        if (this.model.get('own')) {
            this.$el.addClass("user-own");
        }
        return this;
    }
});

var MessageView = Backbone.View.extend({
    tagName: "li",
    _className1: "collection-item blue-grey lighten-5",
    _className2: "collection-item grey lighten-5",
    className(args) {
        return this.id % 2 == 0 ? this._className1 : this._className2;
    },
    _template: _.template('<b class="title"><%= escapeHtml(from) %></b>&nbsp;<i class="msg-time">(<%= received %>)</i><br><%= escapeHtml(data) %>'),

    render() {
        this.$el.html(this._template(this.model.toJSON()));
        return this;
    }
});

var MessagesView = Backbone.View.extend({
    model: new Backbone.Collection(),
    _firstRender: true,
    initialize(args){
        this.model.on('add', this.render, this);
        this.model.on('reset', this.render, this);
        args.eventEmitter.on('username', (username) => {
            this._username = username;
        });
    },
    render() {
        for (var i = this.$el.children().length; i < this.model.length; i++) {
            var msg = this.model.models[i];
            let msgView = new MessageView({model: msg, id: i});
            let child = msgView.render().$el;
            this.$el.append(child);
            if (!this._firstRender && msg.get('from') !== this._username) {
                child.ready(() => {
                    child.effect("highlight", {color: '#b3e5fc'}, 1000);
                });
            }
        }
        this._firstRender = false;
        this.$el.parent().scrollTop(-1 >>> 1);
        return this;
    }
});

var TabPanelView = Backbone.View.extend({
    el: $("ul.tabs"),
    model: new Backbone.Collection(),
    initialize() {
        this.model.on('add', this.render, this);
        this.model.on('change', this.render, this);
        this.add(null, true);
    },
    render() {
        for (var i = this.$el.find('li').length, n = this.model.length; i < n; i++) {
            let item = this.model.models[i];
            item.view = item.view || new TabPanelItemView({model: item});
            this.$el.append(item.view.render().$el);
        }
        this.$el.tabs();
        return this;
    },
    add(userObj, mainchat){
        let label = (userObj != null) ? userObj.get('username') : "Main";
        mainchat = mainchat || false;
        if (!mainchat) {
            if (this.selectTab(label)) {
                return;
            }
        }
        let link = this._link(label);
        this.model.add({label: label, link: '#' + link, isMainChat: mainchat, user: userObj});
        _.delay(() => $('ul.tabs').tabs('select_tab', link), 100);
    },
    selectTab(label){
        let link = this._link(label);
        var found = this.model.find((item) => item.get('label') === label);
        if (found) {
            $('ul.tabs').tabs('select_tab', link);
        }
        return found;
    },
    getSelectedUser(){
        var item = this.model.find((wrapper) => wrapper.view.isSelected());
        return item ? item.get('user') : null;
    },
    _link(label) {
        return `chat-tab-panel-${hashCode(label)}`;
    }
});

var TabPanelItemView = Backbone.View.extend({
    tagName: "li",
    className: "tab",
    _itemTemplate: _.template('<a href="#chat-tab-panel-<%= hash %>"><%= escapeHtml(label) %></a>'),
    render() {
        const obj = this.model.toJSON();
        //keep it for main chat, so we don't need to hash template
        if (obj.isMainChat === true) {
            obj.hash = obj.label;
        } else {
            obj.hash = hashCode(obj.label);
        }
        this.$el.html(this._itemTemplate(obj));
        return this;
    },
    isSelected() {
        return this.$el.find("a.active").length === 1;
    }
});

var ChatPublicView = Backbone.View.extend({
    _eventEmitter: null,
    _html: null,
    initialize(args){
        this._eventEmitter = args.eventEmitter;
        this._html = $("#template-chat-panel-main").html();//no hash, id for template
    },
    render() {
        this.$el.append(this._html);
        this._usersView = new UsersView({
            el: this.$el.find("#chat-users-list"),
            eventEmitter: this._eventEmitter,
            model: this.model.users
        });
        this._messagesView = new MessagesView({
            el: this.$el.find("#chat-panel-list"),
            eventEmitter: this._eventEmitter,
            model: this.model.messages
        });
        return this;
    }
});

var ChatPrivateView = Backbone.View.extend({
    _eventEmitter: null,
    _template: null,
    _user: null,
    initialize(args){
        this._user = args.user;
        this._eventEmitter = args.eventEmitter;
        this._template = _.template($("#template-chat-panel-private").html());
    },
    render() {
        const userJson = this._user.toJSON();
        userJson.username_hash = hashCode(userJson.username);
        const subHtml = this._template(userJson);
        this.$el.append(subHtml);
        this._messagesView = new MessagesView({
            el: this.$el.find("#chat-panel-private-list-" + userJson.username_hash),
            eventEmitter: this._eventEmitter,
            model: this.model
        }).render();
        return this;
    }
});

define(["controllers/_BaseController", "WebSocketClient"], (BaseController, WebSocketClient) => {
    return class ChatController extends BaseController {
        constructor() {
            super();
            this._headerFooterSize = 0;
            const proto = window.location.protocol.startsWith("https") ? "wss" : "ws";
            var port = window.location.port || ("wss" == proto ? "443" : "80");
            let url = `${proto}://${window.location.hostname}:${port}`;
            this._webSocketClient = new WebSocketClient(url);
            // this._usersView = new UsersView({el: $("#chat-users-list"), eventEmitter: this});
            // this._messagesView = new MessagesView({el: $("#chat-panel-list")});

            this._tabPanelView = new TabPanelView();//import before chat public view
            let model = /*new Backbone.Collection*/({
                messages: new Backbone.Collection(),
                users: new Backbone.Collection()
            });
            this._chatPublicView = new ChatPublicView({
                el: $(".chat-section"),
                eventEmitter: this,
                model: model
            }).render();
            this._chatPrivateViews = {};
        }


        /**
         *
         * @param el
         * @override
         */
        onStart(el) {
            super.onStart(el);
            this._bindDialog(el);
            const webSocketClient = this._webSocketClient;
            let _this = this;
            $('#modal1').modal({
                dismissible: false, // Modal can be dismissed by clicking outside of the modal
                complete: function (ev) {
                    var username = $("#username").val().trim();
                    if (username && username.length >= 2) {
                        _this._username = username;
                        _this.emit('username', username);
                        webSocketClient
                            .connect()
                            .then(() => {
                                webSocketClient.login(username);
                            }).catch((e) => alert(e));
                    } else {
                        alert('Invalid username min len 2');
                    }
                    //alert('Closed');
                } // Callback for Modal close
            }).modal('open');
        }

        /**
         *
         * @param el
         * @override
         */
        onBind(el) {
            var root = $(el).parent();
            super.onBind(root);
            this._msgSend.click((ev) => {
                var text = this._msgText.val();
                if (text) {
                    this.sendMessage(text);
                }
            });
            this._msgText.keypress((ev) => {
                var text = this._msgText.val();
                if (ev.which == 13 /*ENTER**/ && text) {
                    this.sendMessage(text);
                }
            });

            this._webSocketClient.on("msg", (msg) => {
                this.onMessage(msg, true, msg.to ? msg.from : null);
            });

            this._webSocketClient.on("msgs", (arg) => {
                this._chatPublicView.model.messages.reset(arg.data);
            });

            this._webSocketClient.on("users", (arg) => {
                this._reloadUsers(arg.data);
            });
            $(window).bind('beforeunload', () => {
                this._webSocketClient.logout();
            });

            this.on('open-chat', (model) => {
                this.onOpenPrivateChat(model);
            });
        }

        onOpenPrivateChat(userObj) {
            const username = userObj.get('username');
            if (this._chatPrivateViews[username] === undefined) {
                let chatPrivateView = new ChatPrivateView({
                    el: $(".chat-section"),
                    model: new Backbone.Collection(),
                    user: userObj,
                    eventEmitter: this
                }).render();
                this._chatPrivateViews[username] = chatPrivateView;
                this._tabPanelView.add(userObj);
            } else {
                this._tabPanelView.selectTab(username);
            }
        }

        _bindDialog(el) {
            el = $(el);
            let unameEl = el.find("#username");
            let btnOk = el.find("#username_ok");
            let num = 10000 + Math.floor((Math.random() * 10000));
            unameEl.val(`user-${num}`);
            unameEl.ready(() => unameEl.focus());
            let event = (el) => {
                if (unameEl.val()) {
                    btnOk.removeClass("disabled");
                    unameEl.removeClass("invalid");
                } else {
                    unameEl.addClass("invalid");
                    btnOk.addClass("disabled");
                }
            };
            if (unameEl.val()) {
                event();
            }
            unameEl.keyup(event);
            unameEl.change(event);
        }

        sendMessage(msg, reconnectOnError) {
            try {
                var user = this._tabPanelView.getSelectedUser();
                let to = user ? user.get('username') : void 0;
                let sentMsg = this._webSocketClient.sendMessage(msg, this._username, to);
                if (sentMsg) {
                    this.onMessage(sentMsg, false, to);
                    this._msgText.empty();
                }
            } catch (e) {
                if (reconnectOnError !== false) {
                    this._webSocketClient
                        .connect()
                        .then(() => {
                            this._webSocketClient.login(this._username);
                        })
                        .then(() => {
                            this.sendMessage(msg, false);
                        }).catch((e) => alert(e));
                }
            }
        }

        onMessage(msg, effect, privateChatUserName) {
            if (privateChatUserName) {
                if (!this._chatPrivateViews[privateChatUserName]) {
                    var user = this._chatPublicView.model.users.find((user) => user.get('username') === privateChatUserName);
                    this.onOpenPrivateChat(user);
                }
                this._chatPrivateViews[privateChatUserName].model.add(msg);
            } else {
                this._chatPublicView.model.messages.add(msg);
            }
            this._msgText.val("");
        }

        _reloadUsers(users) {
            this._lastUsers = this._lastUsers || {};
            users = _.orderBy(users, [user => user.toLowerCase()]);
            var map = _.map(users, (u) => ({username: u, own: u === this._username}));
            this._chatPublicView.model.users.reset(map);
        }

        _pageObject() {
            return {
                "_msgSend": "#msg-input-send",
                "_msgText": "#msg-input-text"
            };
        }
    };
});