/**
 * Created by Scurab on 01/03/2017.
 */
"use strict";

const SocketServer = require('ws').Server;
const _ = require('lodash');
const assert = require('chai').assert;
const Promise = require('promise');
const EventEmitter = require('events');

module.exports = class WebSocketServer extends EventEmitter {

    /**
     *
     * @param port
     */
    constructor(args) {
        super();
        assert.isOk(args);
        this._userConnections = {};
        this._msgs = [];
        const wss = new SocketServer(args);
        this._server = wss;
        wss.on('connection', (ws) => {
            this.onNewConnection(ws);
        });
        console.log("Starting WebSocketServer");
    }

    /**
     *
     * @param socket
     */
    onNewConnection(socket) {
        socket.on("message", (msg) => this.onNewMessage(msg, socket));
        let removeConnection = () => this.onLogout(socket);
        socket.on("close", removeConnection);
        socket.on("error", removeConnection);
    }

    /**
     * Callback for
     * @param msg
     */
    onNewMessage(msg, conn) {
        try {
            var obj = JSON.parse(msg);
            this._removeOldMessages();
            obj.received = new Date();
            switch (obj.type) {
                case 'login': {
                    var username = obj.username;
                    assert.isString(username);
                    assert.isAtLeast(username.length, 2, "Username must have at least 2 chars");
                    this._userConnections[username] = this._userConnections[username] || [];
                    this._userConnections[username].push(conn);
                    this.sendBroadcast(JSON.stringify({type:"users", data:Object.keys(this._userConnections)}));
                    conn.send(JSON.stringify({type: "msgs", data: this._msgs}));
                }
                    break;
                case 'logout': {
                    this.onLogout(conn);
                    this.sendBroadcast(JSON.stringify({type:"users", data:Object.keys(this._userConnections)}));
                }
                    break;
                case 'msg': {
                    let to = obj.to;
                    assert.isString(obj.data, 'Missing "data" field');
                    assert.isAtLeast(obj.data.length, 1, 'Invalid "data" length');
                    assert.isString(obj.from, 'Missing "from" field');
                    assert.isAtLeast(obj.from.length, 1, 'Invalid "from" length');
                    msg = JSON.stringify(obj);//added date
                    if (to && this._userConnections[to]) {
                        //send to particular user
                        _.each(this._userConnections[to], (clientConn) => {
                            if (clientConn !== conn) {
                                clientConn.send(msg);
                            }
                        });
                    } else {
                        //broadcast
                        this.sendBroadcast(msg, conn);
                    }
                    if (!obj.to) {
                        this._msgs.push(obj);
                    }
                }
                    break;
            }
            this.notify(obj.type, obj);
        } catch (e) {
            console.error(e);
        }
    }

    onLogout(conn) {
        _.each(this._userConnections, (array, username) => {
            let removed = _.remove(array, conn);
            if (removed.length) {
                if (this._userConnections[username].length == 0) {
                    delete this._userConnections[username];
                }
                return false;
            }
        });
    }

    /**
     * Send broadcast message
     * @param msg
     * @param excludeConn
     */
    sendBroadcast(msg, excludeConn) {
        _.each(this._userConnections, (clientConns) => {
            _.each(clientConns, (clientConn) => {
                if (clientConn !== excludeConn) {
                    clientConn.send(msg);
                }
            });
        });
    }

    notify(event, data) {
        this.emit(event, {event: event, data: data});
    }

    /**
     * Add event listener
     * @param event ['msg']
     * @param callback
     */
    on(event, callback) {
        var allowedEvents = ['msg', 'login', 'logout'];
        assert.include(allowedEvents, event, `Allowed events are only ${allowedEvents}`);
        assert.isFunction(callback, "param 'callback' is not a function");
        super.on(event, callback);
        return this;
    }

    _removeOldMessages(now) {
        now = (now || this._now());
        now.setHours(0, 0, 0, 0);
        var midnight = now.getTime();
        _.remove(this._msgs, (msg) => {
            return msg.received.getTime() < midnight
        });
    }

    _now() {
        return new Date();
    }
};