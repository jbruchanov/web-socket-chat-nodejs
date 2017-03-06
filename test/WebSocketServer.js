/**
 * Created by Scurab on 01/03/2017.
 */
"use strict";
const PORT = 3002;
const WS_URL = `ws://localhost:${PORT}`;

const _ = require('lodash');
const AssertionError = require('assertion-error');
const Promise = require("promise");
const WebSocketServer = require(process.cwd() + "/src/WebSocketServer");

const express = require('express');
const assert = require('chai').assert;
const WebSocket = require("ws");
const http = require('http');
const joker = require(process.cwd() + "/test/Joker");

describe('WebSocketServer', function () {
    var webSocketServer;
    var server;
    //noinspection ES6ModulesDependencies,NodeModulesDependencies
    beforeEach(function () {
        server = http.createServer(express());
        server.listen(PORT);
        webSocketServer = new WebSocketServer({server});
    });

    afterEach(function () {
        try {
            server.close();
            server = null;
        } catch (e) {
            console.error(e);
        }
    });

    it('On returns self to have chaining', function () {
        let res = webSocketServer.on('msg', () => 0);
        assert.strictEqual(webSocketServer, res);
    });

    it('Accepts "msg" event listener', function () {
        webSocketServer.on('msg', () => 0);
    });

    it('Should fail if callback is invalid', function () {
        assert.throws(() => webSocketServer.on('msg'), AssertionError);
    });

    it('Login saves connection', function (done) {
        const username = "test_username";
        var loginHandledPromise = new Promise((resolve) => {
            webSocketServer.on('login', () => resolve());
        });

        new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:${PORT}/`);
            ws.on('open', () => resolve(ws));
        }).then((conn) => {
            let loginSentPromise = new Promise(function (resolve) {
                conn.send(JSON.stringify({type: "login", username: username}), () => resolve(conn));
            });
            return Promise.all([loginHandledPromise, loginSentPromise]);
        }).then((results) => {
            let clientConn = results[1];
            let serverConns = webSocketServer._userConnections[username];

            assert.isArray(serverConns);
            assert.lengthOf(serverConns, 1);
            assert.strictEqual(clientConn.key, serverConns[0].key);

            clientConn.close();
            done();
        }).catch((e) => {
            console.error(e);
            done(e);
        });
    });

    it('Logout clears connection', function (done) {
        const username = "test_username";

        var loginHandledPromise = new Promise((resolve) => {
            webSocketServer.on('login', () => resolve());
        });
        var logoutHandledPromise = new Promise((resolve) => {
            webSocketServer.on('logout', () => resolve());
        });
        var conn = null;
        new Promise((resolve) => {
            const ws = new WebSocket(`ws://localhost:${PORT}/`);
            ws.on('open', () => resolve(ws));
        }).then((result) => {
            conn = result;
            let loginSentPromise = new Promise(function (resolve) {
                conn.send(JSON.stringify({type: "login", username: username}), () => resolve(conn));
            });
            return Promise.all([loginHandledPromise, loginSentPromise]);
        }).then((results) => {
            let logoutSentPromise = new Promise(function (resolve) {
                conn.send(JSON.stringify({type: "logout"}), () => resolve(conn));
            });
            return Promise.all([logoutHandledPromise, logoutSentPromise]);
        }).then((results) => {
            let serverConns = webSocketServer._userConnections[username];

            assert.isNotArray(serverConns);//undefined

            conn.close();
            done();
        }).catch((e) => {
            console.error(e);
            done(e);
        });
    });

    it('Sending msgs passes to another clients', function () {
        const username1 = "test_username1";
        const conn1 = new FakeConnection();
        webSocketServer.onNewConnection(conn1);
        const username2 = "test_username2";
        const conn2 = new FakeConnection();
        webSocketServer.onNewConnection(conn2);

        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: username1}), conn1);
        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: username2}), conn2);

        let data = JSON.stringify({type: "msg", data: "HelloThere!", from: username1, to: username2});
        webSocketServer.onNewMessage(data, conn1);
        assert.lengthOf(conn1.filterSendText("msg"), 0);
        assert.lengthOf(conn2.filterSendText("msg"), 1);
        let obj = JSON.parse(conn2.filterSendText("msg")[0]);
        delete obj.received;
        assert.strictEqual(JSON.stringify(obj), data);
    });

    it('Sending msgs ignores origin', function () {
        const username1 = "test_username1";
        const conn1 = new FakeConnection();
        webSocketServer.onNewConnection(conn1);
        const conn2 = new FakeConnection();
        webSocketServer.onNewConnection(conn2);
        const username3 = "test_username2";
        const conn3 = new FakeConnection();
        webSocketServer.onNewConnection(conn3);

        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: username1}), conn1);
        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: username1}), conn2);
        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: username3}), conn3);

        let data = JSON.stringify({type: "msg", data: "HelloThere!", from: username3, to: username1});
        webSocketServer.onNewMessage(data, conn3);
        assert.lengthOf(conn1.filterSendText("msg"), 1);
        assert.lengthOf(conn2.filterSendText("msg"), 1);
    });

    it('Sending broadcast', function () {
        const conn1 = new FakeConnection();
        webSocketServer.onNewConnection(conn1);
        const conn2 = new FakeConnection();
        webSocketServer.onNewConnection(conn2);
        const conn3 = new FakeConnection();
        webSocketServer.onNewConnection(conn3);

        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: "test_username1"}), conn1);
        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: "test_username2"}), conn2);
        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: "test_username3"}), conn3);

        let data = JSON.stringify({type: "msg", data: "HelloThere!", from: "Broadcast"});
        webSocketServer.onNewMessage(data);
        assert.lengthOf(conn1.filterSendText("msg"), 1);
        assert.lengthOf(conn2.filterSendText("msg"), 1);
        assert.lengthOf(conn3.filterSendText("msg"), 1);
    });

    it('Sends list of users on new login', function () {
        const conn1 = new FakeConnection();
        webSocketServer.onNewConnection(conn1);
        const conn2 = new FakeConnection();
        webSocketServer.onNewConnection(conn2);

        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: "test_username1"}), conn1);
        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: "test_username2"}), conn2);

        assert.lengthOf(conn1.filterSendText("users"), 2);/*own+new*/
        assert.lengthOf(conn2.filterSendText("users"), 1);/*both*/
    });

    it('Sends list of users on logout', function () {
        const conn1 = new FakeConnection();
        webSocketServer.onNewConnection(conn1);
        const conn2 = new FakeConnection();
        webSocketServer.onNewConnection(conn2);

        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: "test_username1"}), conn1);
        webSocketServer.onNewMessage(JSON.stringify({type: "login", username: "test_username2"}), conn2);
        webSocketServer.onNewMessage(JSON.stringify({type: "logout"}), conn1);

        assert.lengthOf(conn1.filterSendText("users"), 2);/*own+new*/
        assert.lengthOf(conn2.filterSendText("users"), 2);/*both+logout*/
    });

    it('Stores messages', function () {
        webSocketServer.onNewMessage(JSON.stringify({type: "msg", data: "test", from: "test_username1"}));
        assert.lengthOf(webSocketServer._msgs, 1);
    });

    it('Removes old messages', function () {
        webSocketServer.onNewMessage(JSON.stringify({type: "msg", data: "test", from: "test_username1"}));
        let date = new Date();
        date.setHours(24,0,0,0);//tomorrow
        webSocketServer._removeOldMessages(date);
        assert.lengthOf(webSocketServer._msgs, 0);
    });
});

class FakeConnection {
    constructor() {
        this._sendText = [];
        this._on = [];
        this.socket = joker;
    }
    on(event, callback) { this._on.push({event: event, callback: callback}); }
    send(msg){ this._sendText.push(msg); }
    filterSendText(type) {
        return _.filter(this._sendText, (msg) => type == undefined || JSON.parse(msg).type === type);
    }
}