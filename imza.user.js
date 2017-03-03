// ==UserScript==
// @author        buzukatak
// @name          tbt imza gösterici
// @version       0.48
// @description   forum iletilerinde (varsa) kullanıcı imzalarını gösterir, pezevenklerin elinden kurtarır.
// @namespace     https://github.com/buzukatak/imza-gosterici
// @updateURL     https://cdn.rawgit.com/buzukatak/imza-gosterici/master/imza.user.js
// @icon          https://cdn.rawgit.com/buzukatak/imza-gosterici/master/icon.png
// @require       https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify.min.js
// @require       https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify-html.min.js
// @require       https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify-plugin-mention.min.js
// @require       https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify-plugin-hashtag.min.js
// @grant         GM_addStyle
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_deleteValue
// @grant         GM_listValues
// @match         *://www.tahribat.com/forum/*
// @run-at        document-end
// ==/UserScript==

/* global window, GM_addStyle, GM_setValue, GM_getValue, GM_deleteValue, GM_listValues, linkifyHtml */

function putSignature(signature, messages){
    if(signature.html.length === 0) return;
    messages.map(function (message){
        var container = message.querySelectorAll("div.PostCanvas")[0];
        container.insertAdjacentHTML("beforeend", "<div class=\"sigsep\"></div><div class=\"sigblock\"><i>" + signature.html + "</i></div>");
    });
}

function getSignature(nick){
    var signature = JSON.parse(GM_getValue(nick, null));

    if(!signature || Date.now() > new Date(signature.expires))
        return;

    return signature;
}

if (window.top !== window.self)
    return;

if(/[?&]cleanSignatureCache(?:&|)/i.test(document.URL)){
    var keys = GM_listValues();
    keys.map(function (key){
        GM_deleteValue(key);
    });
    return;
}

var signatures = {};
var linkifyOptions = {
    defaultProtocol: "http",
    formatHref: {
        hashtag: function (href) { return "https://twitter.com/hashtag/" + href.substring(1); },
        mention: function (href) { return "//www.tahribat.com/Members/" + href.substring(1); },
    },
    target: {
        url: "_blank",
        hashtag: "_blank",
        mention: "_blank"
    }
};

var reMatchSignature = /<b>\u0130mzas\u0131<\/b><br \/>([\s\S]*)<br \/>[\s\S]*?<br \/><b>\u0130lgi/i;
var reCleanWhiteSpace = /^\s+|\s+$/i;
var reCleanBRs = /^(?:<br[^>]*>)+|(?:<br[^>]*>)+$/i;
var expiryDate = Date.now() + 7 * 86400 * 1000; /* 1 Hafta */

GM_addStyle(".sigsep {border-top: #222 1px dashed; height:6px;width:2000px; overflow:hidden;}");
GM_addStyle(".sigblock {color:#333; min-height: 20px; max-height: 70px; overflow-x: auto;}");

[].forEach.call(document.querySelectorAll("li.ForumMessage"), function (v) {
    var nick = v.querySelectorAll("div.postPanel a")[0].innerText;
    if(nick in signatures)
        signatures[nick].push(v);
    else
        signatures[nick] = [v];
});

Object.keys(signatures).map(function (nick){
    var signature = getSignature(nick);
    if(!signature){
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "//www.tahribat.com/Members/" + nick, true);
        xhr.onreadystatechange = function (){
            if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200){
                var matches = reMatchSignature.exec(xhr.responseText);
                if (matches) {
                    var signature = {"html": matches[1], "expires": expiryDate};
                    signature.html = signature.html.replace(reCleanWhiteSpace, "").replace(reCleanBRs, "");
                    signature.html = linkifyHtml(signature.html, linkifyOptions);
                    GM_setValue(nick, JSON.stringify(signature));
                    putSignature(signature, signatures[nick]);
                }
            }
        };
        xhr.send();
    } else {
        putSignature(signature, signatures[nick]);
    }
});
