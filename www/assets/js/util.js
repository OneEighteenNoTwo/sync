/*
The MIT License (MIT)
Copyright (c) 2013 Calvin Montgomery

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function makeAlert(title, text, klass) {
    if(!klass) {
        klass = "alert-info";
    }

    var al = $("<div/>").addClass("alert")
        .addClass(klass)
        .html(text);
    $("<br/>").prependTo(al);
    $("<strong/>").text(title).prependTo(al);
    $("<button/>").addClass("close pull-right").html("&times;")
        .click(function() {
            al.hide("blind", function() {
                al.remove();
            });
        })
        .prependTo(al);
    return al;
}

function formatURL(data) {
    switch(data.type) {
        case "yt":
            return "http://youtube.com/watch?v=" + data.id;
        case "vi":
            return "http://vimeo.com/" + data.id;
        case "dm":
            return "http://dailymotion.com/video/" + data.id;
        case "sc":
            return data.id;
        case "li":
            return "http://livestream.com/" + data.id;
        case "tw":
            return "http://twitch.tv/" + data.id;
        case "jt":
            return "http://justin.tv/" + data.id;
        case "rt":
            return data.id;
        case "jw":
            return data.id;
        case "im":
            return "http://imgur.com/a/" + data.id;
        case "us":
            return "http://ustream.tv/" + data.id;
        case "gd":
            return data.id;
        default:
            return "#";
    }
}

function findUserlistItem(name) {
    var children = $("#userlist .userlist_item");
    if(children.length == 0)
        return null;
    name = name.toLowerCase();
    // WARNING: Incoming hax because of jQuery and bootstrap bullshit
    var keys = Object.keys(children);
    for(var k in keys) {
        var i = keys[k];
        if(isNaN(parseInt(i))) {
            continue;
        }
        var child = children[i];
        if($(child.children[1]).text().toLowerCase() == name)
            return $(child);
    }
    return null;
}

function formatUserlistItem(div) {
    var data = {
        name: div.data("name") || "",
        rank: div.data("rank"),
        profile: div.data("profile") || { image: "", text: ""},
        leader: div.data("leader") || false,
        icon: div.data("icon") || false,
        afk: div.data("afk") || false
    };
    var name = $(div.children()[1]);
    name.removeClass();
    name.css("font-style", "");
    name.addClass(getNameColor(data.rank));
    div.find(".profile-box").remove();

    var profile = null;
    name.mouseenter(function(ev) {
        if (profile)
            profile.remove();

        profile = $("<div/>")
            .addClass("profile-box")
            .css("top", (ev.pageY + 5) + "px")
            .css("left", ev.pageX + "px")
            .appendTo(div);
        if(data.profile.image) {
            $("<img/>").addClass("profile-image")
                .attr("src", data.profile.image)
                .appendTo(profile);
        }
        $("<strong/>").text(data.name).appendTo(profile);

        var meta = div.data("meta") || {};
        if (meta.ip) {
            $("<br/>").appendTo(profile);
            $("<em/>").text(meta.ip).appendTo(profile);
        }
        if (meta.aliases) {
            $("<p/>").text("aliases: " + meta.aliases.join(", ")).appendTo(profile);
        }
        $("<p/>").text(data.profile.text).appendTo(profile);
    });
    name.mousemove(function(ev) {
        profile.css("top", (ev.pageY + 5) + "px")
            .css("left", ev.pageX + "px")
    });
    name.mouseleave(function() {
        profile.remove();
    });
    var icon = div.children()[0];
    icon.innerHTML = "";
    // denote current leader with a star
    if(data.leader) {
        $("<span/>").addClass("glyphicon glyphicon-star-empty").appendTo(icon);
    }
    if(data.afk) {
        name.css("font-style", "italic");
        $("<span/>").addClass("glyphicon glyphicon-time").appendTo(icon);
    }
    if (data.icon) {
        $("<span/>").addClass(data.icon).prependTo(icon);
    }
}

function getNameColor(rank) {
    if(rank >= Rank.Siteadmin)
        return "userlist_siteadmin";
    else if(rank >= Rank.Admin)
        return "userlist_owner";
    else if(rank >= Rank.Moderator)
        return "userlist_op";
    else if(rank == Rank.Guest)
        return "userlist_guest";
    else
        return "";
}

function addUserDropdown(entry) {
    var name = entry.data("name"),
        rank = entry.data("rank"),
        leader = entry.data("leader");
    entry.find(".user-dropdown").remove();
    var menu = $("<div/>")
        .addClass("user-dropdown")
        .appendTo(entry)
        .hide();

    $("<strong/>").text(name).appendTo(menu);
    $("<br/>").appendTo(menu);

    /* rank selector (admin+ only)
       to prevent odd behaviour, this selector is only visible
       when the selected user has a normal rank (e.g. not a guest
       or a non-moderator leader
    */
    if(CLIENT.rank >= 3 && CLIENT.rank > rank && rank > 0 && rank != 1.5) {
        var sel = $("<select/>")
            .addClass("form-control")
            .appendTo(menu);
        $("<option/>").attr("value", "1").text("Regular User")
            .appendTo(sel);
        $("<option/>").attr("value", "2").text("Moderator")
            .appendTo(sel);
        if(CLIENT.rank > 3) {
            $("<option/>").attr("value", "3").text("Channel Admin")
                .appendTo(sel);
            if(rank > 3) {
                $("<option/>").attr("value", ""+rank)
                    .text("Current Rank (" + rank + ")")
                    .appendTo(sel);
            }
        }
        sel.change(function () {
            socket.emit("setChannelRank", {
                user: name,
                rank: parseInt(sel.val())
            });
        });
        sel.val(""+rank);
    }

    /* ignore button */
    var ignore = $("<button/>").addClass("btn btn-xs btn-default btn-block")
        .appendTo(menu)
        .click(function () {
            if(IGNORED.indexOf(name) == -1) {
                ignore.text("Unignore User");
                IGNORED.push(name);
            } else {
                ignore.text("Ignore User");
                IGNORED.splice(IGNORED.indexOf(name), 1);
            }
        });
    if(IGNORED.indexOf(name) == -1) {
        ignore.text("Ignore User");
    } else {
        ignore.text("Unignore User");
    }

    /* gib/remove leader (moderator+ only) */
    if(CLIENT.rank >= 2) {
        var ldr = $("<button/>").addClass("btn btn-xs btn-default btn-block")
            .appendTo(menu);
        if(leader) {
            ldr.text("Remove Leader");
            ldr.click(function () {
                socket.emit("assignLeader", {
                    name: ""
                });
            });
        } else {
            ldr.text("Give Leader");
            ldr.click(function () {
                socket.emit("assignLeader", {
                    name: name
                });
            });
        }
    }

    /* kick button */
    if(hasPermission("kick")) {
        $("<button/>").addClass("btn btn-xs btn-default btn-block")
            .text("Kick")
            .click(function () {
                socket.emit("chatMsg", {
                    msg: "/kick " + name
                });
            })
            .appendTo(menu);
    }

    /* ban buttons */
    if(hasPermission("ban")) {
        $("<button/>").addClass("btn btn-xs btn-default btn-block")
            .text("Name Ban")
            .click(function () {
                socket.emit("chatMsg", {
                    msg: "/ban " + name
                });
            })
            .appendTo(menu);
        $("<button/>").addClass("btn btn-xs btn-default btn-block")
            .text("IP Ban")
            .click(function () {
                socket.emit("chatMsg", {
                    msg: "/ipban " + name
                });
            })
            .appendTo(menu);
    }

    entry.contextmenu(function(ev) {
        ev.preventDefault();
        if(menu.css("display") == "none") {
            $(".user-dropdown").hide();
            $(document).bind("mouseup.userlist-ddown", function (e) {
                if (menu.has(e.target).length === 0 &&
                    entry.parent().has(e.target).length === 0) {
                    menu.hide();
                    $(document).unbind("mouseup.userlist-ddown");
                }
            });
            menu.show();
        } else {
            menu.hide();
        }
        return false;
    });
}

function calcUserBreakdown() {
    var breakdown = {
        "Site Admins": 0,
        "Channel Admins": 0,
        "Moderators": 0,
        "Regular Users": 0,
        "Guests": 0,
        "Anonymous": 0,
        "AFK": 0
    };
    var total = 0;
    $("#userlist .userlist_item").each(function (index, item) {
        var data = {
            rank: $(item).data("rank")
        };

        if(data.rank >= 255)
            breakdown["Site Admins"]++;
        else if(data.rank >= 3)
            breakdown["Channel Admins"]++;
        else if(data.rank == 2)
            breakdown["Moderators"]++;
        else if(data.rank >= 1)
            breakdown["Regular Users"]++;
        else
            breakdown["Guests"]++;

        total++;

        if($(item).find(".icon-time").length > 0)
            breakdown["AFK"]++;
    });

    breakdown["Anonymous"] = CHANNEL.usercount - total;

    return breakdown;
}

function sortUserlist() {
    var slice = Array.prototype.slice;
    var list = slice.call($("#userlist .userlist_item"));
    list.sort(function (a, b) {
        var r1 = $(a).data("rank");
        var r2 = $(b).data("rank");
        var afk1 = $(a).find(".glyphicon-time").length > 0;
        var afk2 = $(b).find(".glyphicon-time").length > 0;
        var name1 = a.children[1].innerHTML.toLowerCase();
        var name2 = b.children[1].innerHTML.toLowerCase();

        if(USEROPTS.sort_afk) {
            if(afk1 && !afk2)
                return 1;
            if(!afk1 && afk2)
                return -1;
        }

        if(USEROPTS.sort_rank) {
            if(r1 < r2)
                return 1;
            if(r1 > r2)
                return -1;
        }

        return name1 === name2 ? 0 : (name1 < name2 ? -1 : 1);
    });

    list.forEach(function (item) {
        $(item).detach();
    });
    list.forEach(function (item) {
        $(item).appendTo($("#userlist"));
    });
}

/* queue stuff */

function scrollQueue() {
    var li = playlistFind(PL_CURRENT);
    if(!li)
        return;

    li = $(li);
    $("#queue").scrollTop(0);
    var scroll = li.position().top - $("#queue").position().top;
    $("#queue").scrollTop(scroll);
}

function makeQueueEntry(item, addbtns) {
    var video = item.media;
    var li = $("<li/>");
    li.addClass("queue_entry");
    li.addClass("pluid-" + item.uid);
    li.data("uid", item.uid);
    li.data("media", video);
    li.data("temp", item.temp);
    if(video.thumb) {
        $("<img/>").attr("src", video.thumb.url)
            .css("float", "left")
            .css("clear", "both")
            .appendTo(li);
    }
    var title = $("<a/>").addClass("qe_title").appendTo(li)
        .text(video.title)
        .attr("href", formatURL(video))
        .attr("target", "_blank");
    var time = $("<span/>").addClass("qe_time").appendTo(li);
    time.text(video.duration);
    var clear = $("<div/>").addClass("qe_clear").appendTo(li);
    if(item.temp) {
        li.addClass("queue_temp");
    }

    if(addbtns)
        addQueueButtons(li);
    return li;
}

function makeSearchEntry(video) {
    var li = $("<li/>");
    li.addClass("queue_entry");
    li.data("media", video);
    if(video.thumb) {
        $("<img/>").attr("src", video.thumb.url)
            .css("float", "left")
            .css("clear", "both")
            .appendTo(li);
    }
    var title = $("<a/>").addClass("qe_title").appendTo(li)
        .text(video.title)
        .attr("href", formatURL(video))
        .attr("target", "_blank");
    var time = $("<span/>").addClass("qe_time").appendTo(li);
    time.text(video.duration);
    var clear = $("<div/>").addClass("qe_clear").appendTo(li);

    return li;
}

function addQueueButtons(li) {
    li.find(".btn-group").remove();
    var menu = $("<div/>").addClass("btn-group").appendTo(li);
    // Play
    if(hasPermission("playlistjump")) {
        $("<button/>").addClass("btn btn-xs btn-default qbtn-play")
            .html("<span class='glyphicon glyphicon-play'></span>Play")
            .click(function() {
                socket.emit("jumpTo", li.data("uid"));
            })
            .appendTo(menu);
    }
    // Queue next
    if(hasPermission("playlistmove")) {
        $("<button/>").addClass("btn btn-xs btn-default qbtn-next")
            .html("<span class='glyphicon glyphicon-share-alt'></span>Queue Next")
            .click(function() {
                socket.emit("moveMedia", {
                    from: li.data("uid"),
                    after: PL_CURRENT
                });
            })
            .appendTo(menu);
    }
    // Temp/Untemp
    if(hasPermission("settemp")) {
        var tempstr = li.data("temp")?"Make Permanent":"Make Temporary";
        $("<button/>").addClass("btn btn-xs btn-default qbtn-tmp")
            .html("<span class='glyphicon glyphicon-flag'></span>" + tempstr)
            .click(function() {
                socket.emit("setTemp", {
                    uid: li.data("uid"),
                    temp: !li.data("temp")
                });
            })
            .appendTo(menu);
    }
    // Delete
    if(hasPermission("playlistdelete")) {
        $("<button/>").addClass("btn btn-xs btn-default qbtn-delete")
            .html("<span class='glyphicon glyphicon-trash'></span>Delete")
            .click(function() {
                socket.emit("delete", li.data("uid"));
            })
            .appendTo(menu);
    }

    if(USEROPTS.qbtn_hide && !USEROPTS.qbtn_idontlikechange
        || menu.find(".btn").length == 0)
        menu.hide();

    // I DON'T LIKE CHANGE
    if(USEROPTS.qbtn_idontlikechange) {
        menu.addClass("pull-left");
        menu.detach().prependTo(li);
        menu.find(".btn").each(function() {
            // Clear icon
            var icon = $(this).find(".glyphicon");
            $(this).html("");
            icon.appendTo(this);
        });
        menu.find(".qbtn-play").addClass("btn-success");
        menu.find(".qbtn-delete").addClass("btn-danger");
    }
    else if(menu.find(".btn").length != 0) {
        li.unbind("contextmenu");
        li.contextmenu(function(ev) {
            ev.preventDefault();
            if(menu.css("display") == "none")
                menu.show("blind");
            else
                menu.hide("blind");
            return false;
        });
    }
}

function rebuildPlaylist() {
    var qli = $("#queue li");
    if(qli.length == 0)
        return;
    REBUILDING = Math.random() + "";
    var r = REBUILDING;
    var i = 0;
    qli.each(function() {
        var li = $(this);
        (function(i, r) {
            setTimeout(function() {
                // Stop if another rebuild is running
                if(REBUILDING != r)
                    return;
                addQueueButtons(li);
                if(i == qli.length - 1) {
                    scrollQueue();
                    REBUILDING = false;
                }
            }, 10*i);
        })(i, r);
        i++;
    });
}

/* menus */

/* user settings menu */
function showUserOptions() {
    hidePlayer();
    $("#useroptions").on("hidden", function () {
        unhidePlayer();
    });

    if (CLIENT.rank < 2) {
        $("a[href='#us-mod']").parent().hide();
    } else {
        $("a[href='#us-mod']").parent().show();
    }

    $("#us-theme").val(USEROPTS.theme);
    $("#us-layout").val(USEROPTS.layout);
    $("#us-no-channelcss").prop("checked", USEROPTS.ignore_channelcss);
    $("#us-no-channeljs").prop("checked", USEROPTS.ignore_channeljs);
    $("#us-ssl").prop("checked", USEROPTS.secure_connection);

    $("#us-synch").prop("checked", USEROPTS.synch);
    $("#us-synch-accuracy").val(USEROPTS.synch_accuracy);
    $("#us-wmode-transparent").prop("checked", USEROPTS.wmode_transparent);
    $("#us-hidevideo").prop("checked", USEROPTS.hidevid);
    $("#us-playlistbuttons").prop("checked", USEROPTS.qbtn_hide);
    $("#us-oldbtns").prop("checked", USEROPTS.qbtn_idontlikechange);

    $("#us-chat-timestamp").prop("checked", USEROPTS.show_timestamps);
    $("#us-sort-rank").prop("checked", USEROPTS.sort_rank);
    $("#us-sort-afk").prop("checked", USEROPTS.sort_afk);
    $("#us-chat-notice").prop("checked", USEROPTS.blink_title);
    $("#us-boop").prop("checked", USEROPTS.boop);
    $("#us-sendbtn").prop("checked", USEROPTS.chatbtn);

    $("#us-modflair").prop("checked", USEROPTS.modhat);
    $("#us-joinmessage").prop("checked", USEROPTS.joinmessage);

    $("a[href='#us-general']").click();
    $("#useroptions").modal();
}

function saveUserOptions() {
    USEROPTS.theme                = $("#us-theme").val();
    USEROPTS.layout               = $("#us-layout").val();
    USEROPTS.ignore_channelcss    = $("#us-no-channelcss").prop("checked");
    USEROPTS.ignore_channeljs     = $("#us-no-channeljs").prop("checked");
    USEROPTS.secure_connection    = $("#us-ssl").prop("checked");

    USEROPTS.synch                = $("#us-synch").prop("checked");
    USEROPTS.synch_accuracy       = parseFloat($("#us-synch-accuracy").val()) || 2;
    USEROPTS.wmode_transparent    = $("#us-wmode-transparent").prop("checked");
    USEROPTS.hidevid              = $("#us-hidevideo").prop("checked");
    USEROPTS.qbtn_hide            = $("#us-playlistbuttons").prop("checked");
    USEROPTS.qbtn_idontlikechange = $("#us-oldbtns").prop("checked");

    USEROPTS.show_timestamps      = $("#us-chat-timestamp").prop("checked");
    USEROPTS.sort_rank            = $("#us-sort-rank").prop("checked");
    USEROPTS.sort_afk             = $("#us-sort-afk").prop("checked");
    USEROPTS.blink_title          = $("#us-chat-notice").prop("checked");
    USEROPTS.boop                 = $("#us-boop").prop("checked");
    USEROPTS.chatbtn              = $("#us-sendbtn").prop("checked");

    if (CLIENT.rank >= 2) {
        USEROPTS.modhat      = $("#us-modflair").prop("checked");
        USEROPTS.joinmessage = $("#us-joinmessage").prop("checked");
    }

    storeOpts();
}

function storeOpts() {
    for(var key in USEROPTS) {
        setOpt(key, USEROPTS[key]);
    }
}

function applyOpts() {
    $("#usertheme").remove();
    if(USEROPTS.theme != "default") {
        $("<link/>").attr("rel", "stylesheet")
            .attr("type", "text/css")
            .attr("id", "usertheme")
            .attr("href", USEROPTS.theme)
            .appendTo($("head"));
    }

    switch(USEROPTS.layout) {
        case "synchtube":
            synchtubeLayout();
            break;
        case "fluid":
            fluidLayout();
            break;
        default:
            break;
    }

    if(USEROPTS.hidevid) {
        $("#qualitywrap").html("");
        $("#videowrap").remove();
        $("#chatwrap").removeClass("col-lg-5 col-md-5").addClass("col-lg-12 col-md-12");
        $("#chatline").removeClass().addClass("col-lg-12 col-md-12");
    }

    $("#chatbtn").remove();
    if(USEROPTS.chatbtn) {
        var btn = $("<button/>").addClass("btn btn-default btn-block")
            .text("Send")
            .attr("id", "chatbtn")
            .appendTo($("#chatwrap"));
        btn.click(function() {
            if($("#chatline").val().trim()) {
                socket.emit("chatMsg", {
                    msg: $("#chatline").val()
                });
                $("#chatline").val("");
            }
        });
    }

    if (USEROPTS.modhat) {
        $("#modflair").removeClass("label-default")
            .addClass("label-success");
    } else {
        $("#modflair").removeClass("label-success")
            .addClass("label-default");
    }
}

applyOpts();

function showPollMenu() {
    $("#pollwrap .poll-menu").remove();
    var menu = $("<div/>").addClass("well poll-menu")
        .prependTo($("#pollwrap"));

    $("<button/>").addClass("btn btn-sm btn-danger pull-right")
        .text("Cancel")
        .appendTo(menu)
        .click(function() {
            menu.remove();
        });

    $("<strong/>").text("Title").appendTo(menu);

    var title = $("<input/>").addClass("form-control")
        .attr("type", "text")
        .appendTo(menu);

    var lbl = $("<label/>").addClass("checkbox")
        .text("Hide poll results")
        .appendTo(menu);
    var hidden = $("<input/>").attr("type", "checkbox")
        .appendTo(lbl);

    $("<strong/>").text("Options").appendTo(menu);

    var addbtn = $("<button/>").addClass("btn btn-sm btn-default")
        .text("Add Option")
        .appendTo(menu);

    function addOption() {
        $("<input/>").addClass("form-control")
            .attr("type", "text")
            .addClass("poll-menu-option")
            .insertBefore(addbtn);
    }

    addbtn.click(addOption);
    addOption();
    addOption();

    $("<button/>").addClass("btn btn-default btn-block")
        .text("Open Poll")
        .appendTo(menu)
        .click(function() {
            var opts = []
            menu.find(".poll-menu-option").each(function() {
                if($(this).val() != "")
                    opts.push($(this).val());
            });
            socket.emit("newPoll", {
                title: title.val(),
                opts: opts,
                obscured: hidden.prop("checked")
            });
            menu.remove();
        });
}

function scrollChat() {
    $("#messagebuffer").scrollTop($("#messagebuffer").prop("scrollHeight"));
}

function hasPermission(key) {
    if(key.indexOf("playlist") == 0 && CHANNEL.openqueue) {
        var key2 = "o" + key;
        var v = CHANNEL.perms[key2];
        if(typeof v == "number" && CLIENT.rank >= v) {
            return true;
        }
    }
    var v = CHANNEL.perms[key];
    if(typeof v != "number") {
        return false;
    }
    return CLIENT.rank >= v;
}

function setVisible(selector, bool) {
    // I originally added this check because of a race condition
    // Now it seems to work without but I don't trust it
    if($(selector) && $(selector).attr("id") != selector.substring(1)) {
        setTimeout(function() {
            setVisible(selector, bool);
        }, 100);
        return;
    }
    var disp = bool ? "" : "none";
    $(selector).css("display", disp);
}

function handleModPermissions() {
    $("#cs-chanranks-adm").attr("disabled", CLIENT.rank < 4);
    $("#cs-chanranks-owner").attr("disabled", CLIENT.rank < 4);
    /* update channel controls */
    $("#opt_pagetitle").val(CHANNEL.opts.pagetitle);
    $("#opt_pagetitle").attr("disabled", CLIENT.rank < 3);
    $("#opt_externalcss").val(CHANNEL.opts.externalcss);
    $("#opt_externalcss").attr("disabled", CLIENT.rank < 3);
    $("#opt_externaljs").val(CHANNEL.opts.externaljs);
    $("#opt_externaljs").attr("disabled", CLIENT.rank < 3);
    $("#opt_chat_antiflood").prop("checked", CHANNEL.opts.chat_antiflood);
    if ("chat_antiflood_params" in CHANNEL.opts) {
        $("#opt_chat_antiflood_burst").val(CHANNEL.opts.chat_antiflood_params.burst);
        $("#opt_chat_antiflood_sustained").val(CHANNEL.opts.chat_antiflood_params.sustained);
    }
    $("#opt_show_public").prop("checked", CHANNEL.opts.show_public);
    $("#opt_show_public").attr("disabled", CLIENT.rank < 3);
    $("#opt_password").val(CHANNEL.opts.password || "");
    $("#opt_password").attr("disabled", CLIENT.rank < 3);
    $("#opt_enable_link_regex").prop("checked", CHANNEL.opts.enable_link_regex);
    $("#opt_afktimeout").val(CHANNEL.opts.afk_timeout);
    $("#opt_allow_voteskip").prop("checked", CHANNEL.opts.allow_voteskip);
    $("#opt_voteskip_ratio").val(CHANNEL.opts.voteskip_ratio);
    (function() {
        if(typeof CHANNEL.opts.maxlength != "number") {
            $("#opt_maxlength").val("");
            return;
        }
        var h = parseInt(CHANNEL.opts.maxlength / 3600);
        h = ""+h;
        if(h.length < 2) h = "0" + h;
        var m = parseInt((CHANNEL.opts.maxlength % 3600) / 60);
        m = ""+m;
        if(m.length < 2) m = "0" + m;
        var s = parseInt(CHANNEL.opts.maxlength % 60);
        s = ""+s;
        if(s.length < 2) s = "0" + s;
        $("#opt_maxlength").val(h + ":" + m + ":" + s);
    })();
    $("#csstext").val(CHANNEL.css);
    $("#jstext").val(CHANNEL.js);
    $("#motdtext").val(CHANNEL.motd_text);
    setVisible("#editmotd", hasPermission("motdedit"));
    setVisible("#permedit_tab", CLIENT.rank >= 3);
    setVisible("#banlist_tab", hasPermission("ban"));
    setVisible("#motdedit_tab", hasPermission("motdedit"));
    setVisible("#cssedit_tab", CLIENT.rank >= 3);
    setVisible("#jsedit_tab", CLIENT.rank >= 3);
    setVisible("#filteredit_tab", hasPermission("filteredit"));
    setVisible("#channelranks_tab", CLIENT.rank >= 3);
    setVisible("#chanlog_tab", CLIENT.rank >= 3);
    setVisible("#chanopts_unregister_wrap", CLIENT.rank >= 10);
}

function handlePermissionChange() {
    if(CLIENT.rank >= 2) {
        handleModPermissions();
    }

    setVisible("#playlistmanagerwrap", CLIENT.rank >= 1);
    setVisible("#modflair", CLIENT.rank >= 2);
    setVisible("#adminflair", CLIENT.rank >= 255);
    setVisible("#guestlogin", CLIENT.rank < 0);
    setVisible("#chatline", CLIENT.rank >= 0);

    setVisible("#playlistcontrolswrap", hasPermission("playlistadd"));
    $("#queue_next").attr("disabled", !hasPermission("playlistnext"));
    $("#qlockbtn").attr("disabled", CLIENT.rank < 2);

    if(hasPermission("playlistadd") ||
        hasPermission("playlistmove") ||
        hasPermission("playlistjump") ||
        hasPermission("playlistdelete") ||
        hasPermission("settemp")) {
        if(USEROPTS.first_visit && $("#plonotification").length == 0) {
            var al = makeAlert("Playlist Options", [
                "From the Options menu, you can choose to automatically",
                " hide the buttons on each entry (and show them when",
                " you right click).  You can also choose to use the old",
                " style of playlist buttons.",
                "<br>"].join(""))
                .attr("id", "plonotification")
                .insertBefore($("#queue"));

            al.find(".close").remove();

            $("<button/>").addClass("btn btn-primary")
                .text("Dismiss")
                .appendTo(al)
                .click(function() {
                    USEROPTS.first_visit = false;
                    storeOpts();
                    al.hide("blind", function() {
                        al.remove();
                    });
                });
        }
    }

    if(hasPermission("playlistmove")) {
        $("#queue").sortable("enable");
        $("#queue").addClass("queue_sortable");
    }
    else {
        $("#queue").sortable("disable");
        $("#queue").removeClass("queue_sortable");
    }

    setVisible("#clearplaylist", hasPermission("playlistclear"));
    setVisible("#shuffleplaylist", hasPermission("playlistshuffle"));
    setVisible("#customembedwrap", hasPermission("playlistaddcustom"));
    if(!hasPermission("playlistaddcustom")) {
        $("#customembed_entry").hide();
        $("#customembed_code").val("");
    }


    setVisible("#newpollbtn", hasPermission("pollctl"));
    $("#voteskip").attr("disabled", !hasPermission("voteskip") ||
                                    !CHANNEL.opts.allow_voteskip);

    $("#pollwrap .active").find(".btn-danger").remove();
    if(hasPermission("pollctl")) {
        var poll = $("#pollwrap .active");
        if(poll.length > 0) {
            $("<button/>").addClass("btn btn-danger pull-right")
                .text("End Poll")
                .insertAfter(poll.find(".close"))
                .click(function() {
                    socket.emit("closePoll");
                });
        }
    }
    var poll = $("#pollwrap .active");
    if(poll.length > 0) {
        poll.find(".btn").attr("disabled", !hasPermission("pollvote"));
    }
    var users = $("#userlist").children();
    for(var i = 0; i < users.length; i++) {
        addUserDropdown($(users[i]));
    }

    $("#chatline").attr("disabled", !hasPermission("chat"));
    rebuildPlaylist();
}

/* search stuff */

function clearSearchResults() {
    $("#library").html("");
    $("#search_clear").remove();
    var p = $("#library").data("paginator");
    if(p) {
        p.paginator.html("");
    }
}

function addLibraryButtons(li, id, source) {
    var btns = $("<div/>").addClass("btn-group")
        .addClass("pull-left")
        .prependTo(li);

    var type = (source === "library") ? undefined : source;

    if(hasPermission("playlistadd")) {
        if(hasPermission("playlistnext")) {
            $("<button/>").addClass("btn btn-xs btn-default")
                .text("Next")
                .click(function() {
                    socket.emit("queue", {
                        id: id,
                        pos: "next",
                        type: type
                    });
                })
                .appendTo(btns);
        }
        $("<button/>").addClass("btn btn-xs btn-default")
            .text("End")
            .click(function() {
                socket.emit("queue", {
                    id: id,
                    pos: "end",
                    type: type
                });
            })
            .appendTo(btns);
    }
    if(CLIENT.rank >= 2 && source === "library") {
        $("<button/>").addClass("btn btn-xs btn-danger")
            .html("<span class='glyphicon glyphicon-trash'></span>")
            .click(function() {
                socket.emit("uncache", {
                    id: id
                });
                li.hide("blind", function() {
                    li.remove();
                });
            })
            .appendTo(btns);
    }
}

/* queue stuff */

var AsyncQueue = function () {
    this._q = [];
    this._lock = false;
    this._tm = 0;
};

AsyncQueue.prototype.next = function () {
    if (this._q.length > 0) {
        if (!this.lock())
            return;
        var item = this._q.shift();
        var fn = item[0], tm = item[1];
        this._tm = Date.now() + item[1];
        fn(this);
    }
};

AsyncQueue.prototype.lock = function () {
    if (this._lock) {
        if (this._tm > 0 && Date.now() > this._tm) {
            this._tm = 0;
            return true;
        }
        return false;
    }

    this._lock = true;
    return true;
};

AsyncQueue.prototype.release = function () {
    var self = this;
    if (!self._lock)
        return false;

    self._lock = false;
    self.next();
    return true;
};

AsyncQueue.prototype.queue = function (fn) {
    var self = this;
    self._q.push([fn, 20000]);
    self.next();
};

AsyncQueue.prototype.reset = function () {
    this._q = [];
    this._lock = false;
};

var PL_ACTION_QUEUE = new AsyncQueue();

// Because jQuery UI does weird things
function playlistFind(uid) {
    var children = document.getElementById("queue").children;
    for(var i in children) {
        if(typeof children[i].getAttribute != "function")
            continue;
        if(children[i].getAttribute("class").indexOf("pluid-" + uid) != -1)
            return children[i];
    }
    return false;
}

function playlistMove(from, after, cb) {
    var lifrom = $(".pluid-" + from);
    if(lifrom.length == 0) {
        cb(false);
        return;
    }

    var q = $("#queue");

    if(after === "prepend") {
        lifrom.hide("blind", function() {
            lifrom.detach();
            lifrom.prependTo(q);
            lifrom.show("blind", cb);
        });
    }
    else if(after === "append") {
        lifrom.hide("blind", function() {
            lifrom.detach();
            lifrom.appendTo(q);
            lifrom.show("blind", cb);
        });
    }
    else {
        var liafter = $(".pluid-" + after);
        if(liafter.length == 0) {
            cb(false);
            return;
        }
        lifrom.hide("blind", function() {
            lifrom.detach();
            lifrom.insertAfter(liafter);
            lifrom.show("blind", cb);
        });
    }
}

function parseMediaLink(url) {
    if(typeof url != "string") {
        return {
            id: null,
            type: null
        };
    }
    url = url.trim();
    url = url.replace("feature=player_embedded&", "");

    if(url.indexOf("jw:") == 0) {
        return {
            id: url.substring(3),
            type: "jw"
        };
    }

    if(url.indexOf("rtmp://") == 0) {
        return {
            id: url,
            type: "rt"
        };
    }

    var m;
    if((m = url.match(/youtube\.com\/watch\?v=([^&#]+)/))) {
        return {
            id: m[1],
            type: "yt"
        };
    }

    if((m = url.match(/youtu\.be\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "yt"
        };
    }

    if((m = url.match(/youtube\.com\/playlist\?list=([^&#]+)/))) {
        return {
            id: m[1],
            type: "yp"
        };
    }

    if((m = url.match(/twitch\.tv\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "tw"
        };
    }

    if((m = url.match(/justin\.tv\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "jt"
        };
    }

    if((m = url.match(/livestream\.com\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "li"
        };
    }

    if((m = url.match(/ustream\.tv\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "us"
        };
    }

    if((m = url.match(/vimeo\.com\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "vi"
        };
    }

    if((m = url.match(/dailymotion\.com\/video\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "dm"
        };
    }

    if((m = url.match(/imgur\.com\/a\/([^&#]+)/))) {
        return {
            id: m[1],
            type: "im"
        };
    }

    if((m = url.match(/soundcloud\.com\/([^&#]+)/))) {
        return {
            id: url,
            type: "sc"
        };
    }

    if ((m = url.match(/docs\.google\.com\/file\/d\/(.*?)\/edit/))) {
        return {
            id: m[1],
            type: "gd"
        };
    }

    return {
        id: null,
        type: null
    };
}

function sendVideoUpdate() {
    if (!CLIENT.leader) {
        return;
    }
    PLAYER.getTime(function (seconds) {
        socket.emit("mediaUpdate", {
            id: PLAYER.videoId,
            currentTime: seconds,
            paused: PLAYER.paused,
            type: PLAYER.type
        });
    });
}

/* chat */

function formatChatMessage(data) {
    // Backwards compat
    if (!data.meta || data.msgclass) {
        data.meta = {
            addClass: data.msgclass,
            // And the award for "variable name most like Java source code" goes to...
            addClassToNameAndTimestamp: data.msgclass
        };
    }
    // Phase 1: Determine whether to show the username or not
    var skip = data.username === LASTCHATNAME;
    if(data.meta.addClass === "server-whisper")
        skip = true;
    // Prevent impersonation by abuse of the bold filter
    if(data.msg.match(/^\s*<strong>\w+\s*:\s*<\/strong>\s*/))
        skip = false;
    if (data.meta.forceShowName)
        skip = false;

    LASTCHATNAME = data.username;
    LASTCHATTIME = data.time;
    var div = $("<div/>");
    /* drink is a special case because the entire container gets the class, not
       just the message */
    if (data.meta.addClass === "drink") {
        div.addClass("drink");
        data.meta.addClass = "";
    }

    // Add timestamps (unless disabled)
    if (USEROPTS.show_timestamps) {
        var time = $("<span/>").addClass("timestamp").appendTo(div);
        var timestamp = new Date(data.time).toTimeString().split(" ")[0];
        time.text("["+timestamp+"] ");
        if (data.meta.addClass && data.meta.addClassToNameAndTimestamp) {
            time.addClass(data.meta.addClass);
        }
    }

    // Add username
    var name = $("<span/>");
    if (!skip) {
        name.appendTo(div);
    }
    $("<strong/>").addClass("username").text(data.username + ": ").appendTo(name);
    if (data.meta.modflair) {
        name.addClass(getNameColor(data.meta.modflair));
    }
    if (data.meta.addClass && data.meta.addClassToNameAndTimestamp) {
        name.addClass(data.meta.addClass);
    }
    if (data.meta.superadminflair) {
        name.addClass("label")
            .addClass(data.meta.superadminflair.labelclass);
        $("<i/>").addClass(data.meta.superadminflair.icon)
            .addClass("icon-white")
            .prependTo(name);
    }

    // Add the message itself
    var message = $("<span/>").appendTo(div);
    message[0].innerHTML = data.msg;

    // For /me the username is part of the message
    if (data.meta.action) {
        name.remove();
        message[0].innerHTML = data.username + " " + data.msg;
    }
    if (data.meta.addClass) {
        message.addClass(data.meta.addClass);
    }
    return div;
}

function addChatMessage(data) {
    if(IGNORED.indexOf(data.username) !== -1) {
        return;
    }
    var div = formatChatMessage(data);
    // Incoming: a bunch of crap for the feature where if you hover over
    // a message, it highlights messages from that user
    div.data("sender", data.username);
    div.appendTo($("#messagebuffer"));
    div.mouseover(function() {
        $("#messagebuffer").children().each(function() {
            var name = $(this).data("sender");
            if(name == data.username) {
                $(this).addClass("nick-hover");
            }
        });
    });
    div.mouseleave(function() {
        $("#messagebuffer").children().each(function() {
            $(this).removeClass("nick-hover");
        });
    });
    // Cap chatbox at most recent 100 messages
    if($("#messagebuffer").children().length > 100) {
        $($("#messagebuffer").children()[0]).remove();
    }
    if(SCROLLCHAT)
        scrollChat();
    if(USEROPTS.blink_title && !FOCUSED && !TITLE_BLINK) {
        USEROPTS.boop && CHATSOUND.play();
        TITLE_BLINK = setInterval(function() {
            if(document.title == "*Chat*")
                document.title = PAGETITLE;
            else
                document.title = "*Chat*";
        }, 1000);
    }
    if(CLIENT.name && data.username != CLIENT.name) {
        if(data.msg.toUpperCase().indexOf(CLIENT.name.toUpperCase()) != -1) {
            div.addClass("nick-highlight");
            if(!FOCUSED && !TITLE_BLINK) {
                USEROPTS.boop && CHATSOUND.play();
                TITLE_BLINK = setInterval(function() {
                    if(document.title == "*Chat*")
                        document.title = PAGETITLE;
                    else
                        document.title = "*Chat*";
                }, 1000);
            }
        }
    }
}

/* layouts */

function fluidLayout() {
    $(".container").css("max-width", "100%");
}

function synchtubeLayout() {
    $("#videowrap").detach().insertBefore($("#chatwrap"));
    $("#rightcontrols").detach().insertBefore($("#leftcontrols"));
    $("#rightpane").detach().insertBefore($("#leftpane"));
    $("#userlist").css("float", "right");
}

function chatOnly() {
    //fluidLayout();
    $("#toprow").remove()
    $("#announcements").remove();
    $("#playlistrow").remove();
    $("#videowrap").remove();
    $("#controlsrow").remove();
    $("#chatwrap").removeClass("col-lg-5 col-md-5").addClass("col-lg-12 col-md-12");
}

/* channel administration stuff */

// TODO fix
function genPermissionsEditor() {
    $("#permedit").html("");
    var form = $("<form/>").addClass("form-horizontal")
        .attr("action", "javascript:void(0)")
        .appendTo($("#permedit"));
    var fs = $("<fieldset/>").appendTo(form);

    function makeOption(text, key, permset, defval) {
        var group = $("<div/>").addClass("control-group")
            .appendTo(fs);
        $("<label/>").addClass("control-label")
            .text(text)
            .appendTo(group);
        var controls = $("<div/>").addClass("controls")
            .appendTo(group);
        var select = $("<select/>").appendTo(controls);
        select.data("key", key);
        for(var i = 0; i < permset.length; i++) {
            $("<option/>").attr("value", permset[i][1])
                .text(permset[i][0])
                .attr("selected", defval == permset[i][1])
                .appendTo(select);
        }
    }

    function addDivider(text) {
        $("<hr/>").appendTo(fs);
        $("<h3/>").text(text).appendTo(fs);
    }

    var standard = [
        ["Anonymous"    , "-1"],
        ["Guest"        , "0"],
        ["Registered"   , "1"],
        ["Leader"       , "1.5"],
        ["Moderator"    , "2"],
        ["Channel Admin", "3"],
        ["Nobody"       , "1000000"]
    ];

    var noanon = [
        ["Guest"        , "0"],
        ["Registered"   , "1"],
        ["Leader"       , "1.5"],
        ["Moderator"    , "2"],
        ["Channel Admin", "3"],
        ["Nobody"       , "1000000"]
    ];

    var modleader = [
        ["Leader"       , "1.5"],
        ["Moderator"    , "2"],
        ["Channel Admin", "3"],
        ["Nobody"       , "1000000"]
    ];

    var modplus = [
        ["Moderator"    , "2"],
        ["Channel Admin", "3"],
        ["Nobody"       , "1000000"]
    ];

    $("<h3/>").text("Open playlist permissions").appendTo(fs);
    makeOption("Add to playlist", "oplaylistadd", standard, CHANNEL.perms.oplaylistadd+"");
    makeOption("Add/move to next", "oplaylistnext", standard, CHANNEL.perms.oplaylistnext+"");
    makeOption("Move playlist items", "oplaylistmove", standard, CHANNEL.perms.oplaylistmove+"");
    makeOption("Delete playlist items", "oplaylistdelete", standard, CHANNEL.perms.oplaylistdelete+"");
    makeOption("Jump to video", "oplaylistjump", standard, CHANNEL.perms.oplaylistjump+"");
    makeOption("Queue playlist", "oplaylistaddlist", standard, CHANNEL.perms.oplaylistaddlist+"");

    addDivider("General playlist permissions");
    makeOption("Add to playlist", "playlistadd", standard, CHANNEL.perms.playlistadd+"");
    makeOption("Add/move to next", "playlistnext", standard, CHANNEL.perms.playlistnext+"");
    makeOption("Move playlist items", "playlistmove", standard, CHANNEL.perms.playlistmove+"");
    makeOption("Delete playlist items", "playlistdelete", standard, CHANNEL.perms.playlistdelete+"");
    makeOption("Jump to video", "playlistjump", standard, CHANNEL.perms.playlistjump+"");
    makeOption("Queue playlist", "playlistaddlist", standard, CHANNEL.perms.playlistaddlist+"");
    makeOption("Queue livestream", "playlistaddlive", standard, CHANNEL.perms.playlistaddlive+"");
    makeOption("Embed custom media", "playlistaddcustom", standard, CHANNEL.perms.playlistaddcustom + "");
    makeOption("Exceed maximum media length", "exceedmaxlength", standard, CHANNEL.perms.exceedmaxlength+"");
    makeOption("Add nontemporary media", "addnontemp", standard, CHANNEL.perms.addnontemp+"");
    makeOption("Temp/untemp playlist item", "settemp", standard, CHANNEL.perms.settemp+"");
    makeOption("Shuffle playlist", "playlistshuffle", standard, CHANNEL.perms.playlistshuffle+"");
    makeOption("Clear playlist", "playlistclear", standard, CHANNEL.perms.playlistclear+"");

    addDivider("Polls");
    makeOption("Open/Close poll", "pollctl", modleader, CHANNEL.perms.pollctl+"");
    makeOption("Vote", "pollvote", standard, CHANNEL.perms.pollvote+"");
    makeOption("View hidden poll results", "viewhiddenpoll", standard, CHANNEL.perms.viewhiddenpoll+"");
    makeOption("Voteskip", "voteskip", standard, CHANNEL.perms.voteskip+"");

    addDivider("Moderation");
    makeOption("Mute users", "mute", modleader, CHANNEL.perms.mute+"");
    makeOption("Kick users", "kick", modleader, CHANNEL.perms.kick+"");
    makeOption("Ban users", "ban", modplus, CHANNEL.perms.ban+"");
    makeOption("Edit MOTD", "motdedit", modplus, CHANNEL.perms.motdedit+"");
    makeOption("Edit chat filters", "filteredit", modplus, CHANNEL.perms.filteredit+"");

    addDivider("Misc");
    makeOption("Drink calls", "drink", modleader, CHANNEL.perms.drink+"");
    makeOption("Chat", "chat", noanon, CHANNEL.perms.chat+"");

    var submit = $("<button/>").addClass("btn btn-primary").appendTo(fs);
    submit.text("Save");
    submit.click(function() {
        var perms = {};
        fs.find("select").each(function() {
            perms[$(this).data("key")] = parseFloat($(this).val());
        });
        socket.emit("setPermissions", perms);
    });
}

function waitUntilDefined(obj, key, fn) {
    if(typeof obj[key] === "undefined") {
        setTimeout(function () {
            waitUntilDefined(obj, key, fn);
        }, 100);
        return;
    }
    fn();
}

function hidePlayer() {
    if(!PLAYER)
        return;

    if(!/(chrome|MSIE)/ig.test(navigator.userAgent))
        return;

    PLAYER.size = {
        width: $("#ytapiplayer").attr("width"),
        height: $("#ytapiplayer").attr("height")
    };
    $("#ytapiplayer").attr("width", 1)
        .attr("height", 1);
}

function unhidePlayer() {
    if(!PLAYER)
        return;

    if(!/(chrome|MSIE)/ig.test(navigator.userAgent))
        return;

    $("#ytapiplayer").attr("width", PLAYER.size.width)
        .attr("height", PLAYER.size.height);
}

function chatDialog(div) {
    var parent = $("<div/>").addClass("profile-box")
        .css("padding", "10px")
        .appendTo($("body"));

    div.appendTo(parent);
    var cw = $("#chatwrap").width();
    var ch = $("#chatwrap").height();
    var cp = $("#chatwrap").offset();
    var x = cp.left + cw/2 - parent.width()/2;
    var y = cp.top + ch/2 - parent.height()/2;
    parent.css("left", x + "px");
    parent.css("top", y + "px");
    return parent;
}

function errDialog(err) {
    var div = $("<div/>").addClass("profile-box")
        .css("padding", "10px")
        .text(err)
        .appendTo($("body"));

    $("<br/>").appendTo(div);
    $("<button/>").addClass("btn btn-xs btn-default")
        .css("width", "100%")
        .text("OK")
        .click(function () { div.remove(); })
        .appendTo(div);
    var cw = $("#chatwrap").width();
    var ch = $("#chatwrap").height();
    var cp = $("#chatwrap").offset();
    var x = cp.left + cw/2 - div.width()/2;
    var y = cp.top + ch/2 - div.height()/2;
    div.css("left", x + "px");
    div.css("top", y + "px");
}

function queueMessage(data, type) {
    if (!data)
        data = { link: null };
    if (!data.msg || data.msg === true) {
        data.msg = "Queue failed.  Check your link to make sure it is valid.";
    }
    var ltype = "label-danger";
    var title = "Error";
    if (type === "alert-warning") {
        ltype = "label-warning";
        title = "Warning";
    }

    var alerts = $(".qfalert.qf-" + type);
    for (var i = 0; i < alerts.length; i++) {
        var al = $(alerts[i]);
        var cl = al.clone();
        cl.children().remove();
        if (cl.text() === data.msg) {
            var tag = al.find("." + ltype);
            if (tag.length > 0) {
                var morelinks = al.find(".qflinks");
                $("<a/>").attr("href", data.link)
                    .attr("target", "_blank")
                    .text(data.link)
                    .appendTo(morelinks);
                $("<br/>").appendTo(morelinks);
                var count = parseInt(tag.text().match(/\d+/)[0]) + 1;
                tag.text(tag.text().replace(/\d+/, ""+count));
            } else {
                var tag = $("<span/>")
                    .addClass("label pull-right pointer " + ltype)
                    .text("+ 1 more")
                    .appendTo(al);
                var morelinks = $("<div/>")
                    .addClass("qflinks")
                    .appendTo(al)
                    .hide();
                $("<a/>").attr("href", data.link)
                    .attr("target", "_blank")
                    .text(data.link)
                    .appendTo(morelinks);
                $("<br/>").appendTo(morelinks);
                tag.click(function () {
                    morelinks.toggle();
                });
            }
            return;
        }
    }
    var text = data.msg;
    if (typeof data.link === "string") {
        text += "<br><a href='" + data.link + "' target='_blank'>" +
                data.link + "</a>";
    }
    makeAlert(title, text, type)
        .addClass("qfalert qf-" + type)
        .appendTo($("#queuefail"));
}

function filterChannelLog() {
    var cc = $("#chanlog_contents");
    if (!cc.data("log")) {
        cc.data("log", cc.text());
    }
    var all = $("#filter_all").prop("checked");
    var chat = $("#filter_chat").prop("checked");
    var polls = $("#filter_polls").prop("checked");
    var queue = $("#filter_queue").prop("checked");
    var bans = $("#filter_bans").prop("checked");
    var channelsettings = $("#filter_channelsettings").prop("checked");
    var joinquit = $("#filter_joinquit").prop("checked");

    var lines = cc.data("log").split("\n");
    var include = [];
    lines.forEach(function (line) {
        if (line.trim() === "") {
            return;
        }
        if (all) {
            include.push(line);
            return;
        }

        var pre = line.split(" ")[5];
        if (pre === undefined) {
            return;
        }

        if (chat && pre.match(/<[\w-]+(\.\w*)?>/)) {
            include.push(line);
            return;
        }

        if (polls && pre === "***" && (line.indexOf("Opened Poll") >= 0 ||
                                       line.indexOf("closed the active poll") >= 0)) {
            include.push(line);
            return;
        }

        if (queue && pre === "###") {
            include.push(line);
            return;
        }

        if (channelsettings && pre === "%%%") {
            include.push(line);
            return;
        }

        if (joinquit) {
            if (pre === "+++" || pre === "---") {
                include.push(line);
                return;
            }

            if (pre.match(/(\d{1,3}\.){3}\d{1,3}/) &&
                line.indexOf("logged in as") >= 0) {
                include.push(line);
                return;
            }
        }

        if (bans && pre === "***" && line.indexOf("banned") >= 0) {
            include.push(line);
            return;
        }

        if (channelsettings && pre === "***") {
            if (line.indexOf("Loading") >= 0 ||
                line.indexOf("Loaded") >= 0 ||
                line.indexOf("unloading") >= 0 ||
                line.indexOf("rank") >= 0) {
                include.push(line);
                return;
            }
            return;
        }
    });

    $("#chanlog_contents").text(include.join("\n"));
}

function makeModal() {
    var wrap = $("<div/>").addClass("modal fade");
    var dialog = $("<div/>").addClass("modal-dialog").appendTo(wrap);
    var content = $("<div/>").addClass("modal-content").appendTo(dialog);

    var head = $("<div/>").addClass("modal-header").appendTo(content);
    $("<button/>").addClass("close")
        .attr("data-dismiss", "modal")
        .attr("data-hidden", "true")
        .html("&times;")
        .appendTo(head);

    wrap.on("hidden", function () {
        unhidePlayer();
        wrap.remove();
    });
    return wrap;
}

function formatCSModList() {
    var tbl = $("#cs-chanranks table");
    tbl.find("tbody").remove();
    var entries = tbl.data("entries") || [];
    entries.sort(function(a, b) {
        if (a.rank === b.rank) {
            var x = a.name.toLowerCase();
            var y = b.name.toLowerCase();
            return y == x ? 0 : (x < y ? -1 : 1);
        }

        return b.rank - a.rank;
    });

    entries.forEach(function (entry) {
        var tr = $("<tr/>").addClass("cs-chanrank-tr-" + entry.name);
        var name = $("<td/>").text(entry.name).appendTo(tr);
        name.addClass(getNameColor(entry.rank));
        var rankwrap = $("<td/>");
        var rank = $("<span/>").text(entry.rank).appendTo(rankwrap);
        var dd = $("<div/>").addClass("btn-group");
        var toggle = $("<button/>")
            .addClass("btn btn-xs btn-default dropdown-toggle")
            .attr("data-toggle", "dropdown")
            .html("Edit <span class=caret></span>")
            .appendTo(dd);
        if (CLIENT.rank <= entry.rank) {
            toggle.addClass("disabled");
        }

        var menu = $("<ul/>").addClass("dropdown-menu")
            .attr("role", "menu")
            .appendTo(dd);

        var ranks = [
            { name: "Remove Moderator", rank: 1 },
            { name: "Moderator", rank: 2 },
            { name: "Channel Admin", rank: 3 },
            { name: "Channel Owner", rank: 4 }
        ];

        ranks.forEach(function (r) {
            var li = $("<li/>").appendTo(menu);
            var a = $("<a/>")
                .addClass(getNameColor(r.rank))
                .attr("href", "javascript:void(0)")
                .text(r.name)
                .appendTo(li);
            if (r.rank !== entry.rank) {
                a.click(function () {
                    socket.emit("setChannelRank", {
                        user: entry.name,
                        rank: r.rank
                    });
                });
            } else {
                $("<span/>").addClass("glyphicon glyphicon-ok pull-right")
                    .appendTo(a);
                li.addClass("disabled");
            }

            if (r.rank > CLIENT.rank || (CLIENT.rank < 4 && r.rank === CLIENT.rank)) {
                li.addClass("disabled");
            }
        });

        dd.css("margin-right", "10px").prependTo(rankwrap);
        rankwrap.appendTo(tr);
        tr.appendTo(tbl);
    });
}
