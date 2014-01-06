var Logger = require("./logger");
var Server = require("./server");
var util = require("./utilities");
var MakeEmitter = require("./emitter");

function User(socket) {
    var self = this;
    MakeEmitter(self);
    self.socket = socket;
    self.ip = socket._ip;
    self.loggedIn = false;
    self.loggingIn = false;
    self.rank = -1;
    self.global_rank = -1;
    self.channel = null;
    self.name = "";
    self.canonicalName = "";
    self.profile = {
        image: "",
        text: ""
    };
    self.meta = {
        afk: false,
        muted: false,
        smuted: false,
        aliases: []
    };
    self.queueLimiter = util.newRateLimiter();
    self.chatLimiter = util.newRateLimiter();
    self.awaytimer = false;

    self.socket.once("initChannelCallbacks", function () {
        self.initChannelCallbacks();
    });

    var announcement = Server.getServer().announcement;
    if (announcement != null) {
        self.socket.emit("announcement", announcement);
    }
}

/**
 * Checks whether the user is in a valid channel
 */
User.prototype.inChannel = function () {
    return this.channel != null && !this.channel.dead;
};

/**
 * Changes a user's AFK status, updating the channel voteskip if necessary
 */
User.prototype.setAFK = function (afk) {
    if (!this.inChannel()) {
        return;
    }

    if (this.meta.afk === afk) {
        return;
    }

    var chan = this.channel;
    if (afk) {
        if (chan.voteskip) {
            chan.voteskip.unvote(this.ip);
        }
    } else {
        this.autoAFK();
    }

    chan.checkVoteskipPass();
    chan.sendAll("setAFK", {
        name: this.name,
        afk: afk
    });
};

/**
 * Sets a timer to automatically mark the user as AFK after
 * a period of inactivity
 */
User.prototype.autoAFK = function () {
    var self = this;
    if (self.awaytimer) {
        clearTimeout(self.awaytimer);
    }

    if (!self.inChannel()) {
        return;
    }

    var timeout = parseFloat(self.channel.opts.afk_timeout);
    if (isNaN(timeout) || timeout <= 0) {
        return;
    }

    self.awaytimer = setTimeout(function () {
        self.setAFK(true);
    }, timeout * 1000);
};

/**
 * Sends a kick message and disconnects the user
 */
User.prototype.kick = function (reason) {
    this.socket.emit("kick", { reason: reason });
    this.socket.disconnect(true);
};

/**
 * Initializes socket message callbacks for a channel user
 */
User.prototype.initChannelCallbacks = function () {
    var self = this;

    // Verifies datatype before calling a function
    // Passes a default value if the typecheck fails
    var typecheck = function (type, def, fn) {
        return function (data) {
            if (typeof data !== type) {
                fn(def);
            } else {
                fn(data);
            }
        };
    };

    // Verify that the user is in a channel, and that the passed data is an Object
    var wrapTypecheck = function (msg, fn) {
        self.socket.on(msg, typecheck("object", {}, function (data) {
            if (self.inChannel()) {
                fn(data);
            }
        }));
    };

    // Verify that the user is in a channel, but don't typecheck the data
    var wrap = function (msg, fn) {
        self.socket.on(msg, function (data) {
            if (self.inChannel()) {
                fn(data);
            }
        });
    };

    self.socket.on("disconnect", function () {
        if (self.awaytimer) {
            clearTimeout(self.awaytimer);
        }

        if (self.inChannel()) {
            self.channel.leave(self);
        }
    });

    wrapTypecheck("joinChannel", function (data) {
        if (typeof data.name !== "string") {
            return;
        }

        if (!util.isValidChannelName(name)) {
            self.socket.emit("errorMsg", {
                msg: "Invalid channel name.  Channel names may consist of 1-30 " +
                     "characters in the set a-z, A-Z, 0-9, -, and _"
            });
            self.kick("Invalid channel name");
            return;
        }

        data.name = data.name.toLowerCase();
        var chan = Server.getServer().getChannel(data.name);
        chan.join(self, data.pw);
    });

    wrapTypecheck("assignLeader", function (data) {
        self.channel.handleChangeLeader(self, data);
    });

    wrapTypecheck("setChannelRank", function (data) {
        self.channel.handleSetRank(self, data);
    });

    wrapTypecheck("chatMsg", function (data) {
        if (typeof data.msg !== "string") {
            return;
        }

        if (data.msg.indexOf("/afk") !== 0) {
            self.setAFK(false);
            self.autoAFK();
        }

        self.channel.handleChat(self, data);
    });

    wrapTypecheck("newPoll", function (data) {
        self.channel.handlePoll(self, data);
    });

    wrapTypecheck("vote", function (data) {
        self.channel.handleVote(self, data);
    });

    wrap("closePoll", function () {
        self.channel.handleClosePoll(self);
    });

    wrap("playerReady", function () {
        self.channel.sendMediaUpdate([self]);
    });

    wrap("requestPlaylist", function () {
        self.channel.sendPlaylist([self]);
    });

    wrapTypecheck("queue", function (data) {
        self.channel.handleQueue(self, data);
    });

    wrapTypecheck("setTemp", function (data) {
        self.channel.handleSetTemp(self, data);
    });

    wrapTypecheck("moveMedia", function (data) {
        self.channel.handleMove(self, data);
    });

    wrapTypecheck("delete", function (data) {
        self.channel.handleDelete(self, data);
    });

    wrapTypecheck("uncache", function (data) {
        self.channel.handleUncache(self, data);
    });

    wrapTypecheck("jumpto", function (data) {
        self.channel.handleJump(self, data);
    });

    wrap("playNext", function () {
        self.channel.handlePlayNext(self);
    });

    wrap("clearPlaylist", function () {
        self.channel.handleClear(self);
    });

    wrap("shufflePlaylist", function () {
        self.channel.handleShuffle(self);
    });

    wrap("togglePlaylistLock", function () {
        self.channel.handleToggleLock(self);
    });

    wrapTypecheck("mediaUpdate", function (data) {
        self.channel.handleMediaUpdate(self, data);
    });

    wrapTypecheck("searchMedia", function (data) {
        if (typeof data.query !== "string") {
            return;
        }
        data.query = data.query.substring(0, 255);

        var searchYT = function () {
            InfoGetter.Getters.ytSearch(data.query.split(" "), function (e, vids) {
                if (!e) {
                    self.socket.emit("searchResults", {
                        source: "yt",
                        results: vids
                    });
                }
            });
        };

        if (data.source === "yt") {
            searchYT();
        } else {
            self.channel.search(data.query, function (vids) {
                if (vids.length === 0) {
                    searchYT();
                } else {
                    self.socket.emit("searchResults", {
                        source: "library",
                        results: vids
                    });
                }
            });
        }

    });

    wrapTypecheck("setOptions", function (data) {
        self.channel.handleUpdateOptions(self, data);
    });

    wrapTypecheck("setPermissions", function (data) {
        self.channel.handleSetPermissions(self, data);
    });

    wrapTypecheck("setChannelCSS", function (data) {
        self.channel.handleSetCSS(self, data);
    });

    wrapTypecheck("setChannelJS", function (data) {
        self.channel.handleSetJS(self, data);
    });

    wrapTypecheck("setMotd", function (data) {
        self.channel.handleUpdateMotd(self, data);
    });

    wrapTypecheck("updateFilter", function (data) {
        self.channel.handleUpdateFilter(self, data);
    });

    // REMOVE FILTER
    // https://www.youtube.com/watch?v=SxUU3zncVmI
    wrapTypecheck("removeFilter", function (data) {
        self.channel.handleRemoveFilter(self, data);
    });

    wrapTypecheck("moveFilter", function (data) {
        self.channel.handleMoveFilter(self, data);
    });

    wrap("requestBanlist", function () {
        self.channel.sendBanlist([self]);
    });

    wrap("requestChatFilter", function () {
        self.channel.sendChatFilters([self]);
    });

    wrap("voteskip", function () {
        self.channel.handleVoteskip(self);
    });

    wrap("readChanLog", function () {
        self.channel.handleReadLog(self);
    });
};

User.prototype.whenLoggedIn = function (fn) {
    if (self.loggedIn) {
        fn();
    } else {
        self.once("login", fn);
    }
};

var lastguestlogin = {};
User.prototype.guestLogin = function (name) {
    var self = this;
    var srv = Server.getServer();

    if (self.ip in lastguestlogin) {
        var diff = (Date.now() - lastguestlogin[self.ip]) / 1000;
        if (diff < srv.cfg["guest-login-delay"]) {
            self.socket.emit("login", {
                success: false,
                error: "Guest logins are restricted to one per IP address per " +
                       srv.cfg["guest-login-delay"] + " seconds."
            });
            return;
        }
    }

    if (!util.isValidUserName(name)) {
        self.socket.emit("login", {
            success: false,
            error: "Invalid username.  Usernames must be 1-20 characters long and " +
                   "consist only of characters a-z, A-Z, 0-9, -, _, and accented " +
                   "letters."
        });
        return;
    }

    // Prevent duplicate logins
    self.loggingIn = true;
    db.users.isUsernameTaken(name, function (err, taken) {
        self.loggingIn = false;
        if (err) {
            self.socket.emit("login", {
                success: false,
                error: err
            });
            return;
        }

        if (taken) {
            self.socket.emit("login", {
                success: false,
                error: "That username is registered."
            });
            return;
        }

        if (self.inChannel()) {
            var nameLower = name.toLowerCase();
            for (var i = 0; i < self.channel.users.length; i++) {
                if (self.channel.users[i].name.toLowerCase() === nameLower) {
                    self.socket.emit("login", {
                        success: false,
                        error: "That name is already in use on this channel."
                    });
                    return;
                }
            }
        }

        // Login succeeded
        lastguestlogin[self.ip] = Date.now();
        self.rank = 0;
        self.global_rank = 0;
        self.socket.emit("rank", 0);
        self.name = name;
        self.loggedIn = true;
        self.socket.emit("login", {
            success: true,
            name: name
        });

        // TODO you shouldn't be able to guest login without being in a channel
        if (self.inChannel()) {
            self.channel.logger.log(self.ip + " signed in as " + name);
        }

        self.emit("login");
    });
};