// ==UserScript==
// @author		buzukatak
// @name		tbt imza gosterici
// @version		0.60
// @description	forum iletilerinde (varsa) kullanıcı imzalarını gösterir, pezevenklerin elinden kurtarır.
// @namespace	https://github.com/buzukatak/imza-gosterici
// @updateURL	https://buzukatak.github.io/imza-gosterici/imza.user.js
// @icon		https://buzukatak.github.io/imza-gosterici/icon.png
// @require		https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify.min.js
// @require		https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify-html.min.js
// @require		https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify-plugin-mention.min.js
// @require		https://cdn.rawgit.com/nfrasser/linkify-shim/master/linkify-plugin-hashtag.min.js
// @grant		GM_addStyle
// @grant		GM_setValue
// @grant		GM_getValue
// @grant		GM_deleteValue
// @grant		GM_listValues
// @match		*://www.tahribat.com/forum/*
// @match		*://www.tahribat.com/Members/*
// @match		*://www.tahribat.com/Account/Settings*
// @run-at		document-end
// ==/UserScript==

/* global window, GM_addStyle, GM_setValue, GM_getValue, GM_deleteValue, GM_listValues, linkifyHtml */

var reMatchSignature = /<b>\u0130mzas\u0131<\/b><br[^>]*>([\s\S]*)<br[^>]*>[\s\S]*?<br[^>]*><b>\u0130lgi/i;
var reCleanWhiteSpace = /^\s+|\s+$/i;
var reCleanBRs = /^(?:<br[^>]*>)+|(?:<br[^>]*>)+$/i;
var expiryInt = GM_getValue("settings.expireValue", 7) * GM_getValue("settings.expireInterval", 86400) * 1000; /* 1 Hafta */
var member;
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

GM_addStyle(".sigsep {border-top: #222 1px dashed; height:6px;width:2000px; overflow:hidden;}");
GM_addStyle(".sigblock {color:#333; min-height: 20px; overflow-x: auto;"+ (GM_getValue("settings.fullHeight", false) === true ? "" : "max-height: 70px;") +"}");
GM_addStyle("#sigExpire input, #sigExpire select{width: 100px !important;}");

function putSignature(signature, messages){
	if(signature.html.length === 0) return;
	messages.map(function (message){
		message.querySelectorAll("div.PostCanvas")[0].insertAdjacentHTML(
			"beforeend", "<div class=\"sigsep\"></div><div class=\"sigblock\"><i>" + signature.html + "</i></div>");
	});
}

function getSignature(nick){
	var signature = JSON.parse(GM_getValue("cache." + nick, null));

	if(!signature || signature.createdAt + expiryInt < Date.now())
		return;

	return signature;
}

function updateSignature(nick, html){
	var matches = reMatchSignature.exec(html);
	if (matches) {
		var signature = {"html": matches[1], "createdAt": Date.now()};
		signature.html = signature.html.replace(reCleanWhiteSpace, "").replace(reCleanBRs, "");
		signature.html = linkifyHtml(signature.html, linkifyOptions);
		GM_setValue("cache." + nick, JSON.stringify(signature));
		putSignature(signature, signatures[nick]);
	}
}

function fadeOut(id){
	var s = document.getElementById(id); 
	s.innerHTML = "Kaydedildi"; 
	s.style.opacity = 1; 
	s.style.display = ""; 
	(function fade(){if((s.style.opacity -= 0.1) < 0) s.style.display="none"; else setTimeout(fade, 100);})();	
}

function clearSettings(signaturCachesOnly){
	var keys = GM_listValues();
	keys.map(function (key){
		if(signaturCachesOnly && key.substring(0, 5) !== "nick.") return;
		GM_deleteValue(key);
	});
}

if (window.top !== window.self)
	return;

if(/[?&]cleanSignatureCache(?:&|)/i.test(document.URL)){
	clearSettings();
	return;
}

member = /https?:\/\/[^\/]+\/Members\/([^\/?]*)/i.exec(document.URL);
if(member){
	var matches = reMatchSignature.exec(document.body.innerHTML);
	if(matches) updateSignature(member[1], matches[0]);
}

if(/\/Account\/Settings/i.test(document.URL)){
	var settingsArea, elmMaxHeight, expireArea, elmExpireVal, elmExpireInterval;
	
	settingsArea = document.querySelectorAll("fieldset ol")[0];
	settingsArea.insertAdjacentHTML("beforeend", "<li><input value=true id=SignatureMaxHeight type=checkbox><label for=SignatureMaxHeight>Uzun imzaları olduğu gibi göster. (<i>Userscript</i>)</label>&nbsp;<span style=\"display:none; padding: 0 2px; 0 2px; background: #fff000;\" id=sigheightmsg></span></li>");
	settingsArea.insertAdjacentHTML("beforeend", "<li id=sigExpire><input class=sigtight type=number pattern=\"\\d+\" value=7 min=1 /> <select class=sigtight><option value=60>Dakika</option><option value=3600>Saat</option><option value=86400 selected>Gün</option><option value=2592000>Ay</option></select> boyunca imza önbelleklemesi yap. (<i>Userscript</i>)&nbsp;<span style=\"display:none; padding: 0 2px; 0 2px; background: #fff000;\" id=sigexpiremsg></span></li>");
	settingsArea.insertAdjacentHTML("beforeend", "<li><input class=\"button orange\" type=button style=\"font-size: 90%;\" id=clearSignatureCache value=\"İmza Önbelleğini Temizle (Userscript)\" /></li>");
	
	elmMaxHeight = document.getElementById("SignatureMaxHeight");
	elmMaxHeight.checked = GM_getValue("settings.fullHeight", false) === true;
	elmMaxHeight.onclick = function(e){
		var t = e.target || e.srcElement;
		GM_setValue("settings.fullHeight", t.checked);
		fadeOut("sigheightmsg");
	};
	
	expireArea = document.getElementById("sigExpire");
	
	elmExpireVal = expireArea.querySelectorAll("input")[0];
	elmExpireVal.value = GM_getValue("settings.expireValue", 7);
	
	elmExpireInterval = expireArea.querySelectorAll("select")[0];
	elmExpireInterval.value = GM_getValue("settings.expireInterval", 86400);
	
	elmExpireVal.onchange = function(e){
		var t = e.target || e.srcElement;
		if(!/^\d+$/.test(t.value)) return;
		GM_setValue("settings.expireValue", t.value);
		fadeOut("sigexpiremsg");
	};
	
	elmExpireInterval.onchange = function(e){
		var t = e.target || e.srcElement;
		GM_setValue("settings.expireInterval", t.value);
		fadeOut("sigexpiremsg");
	};
	
	document.getElementById("clearSignatureCache").onclick = function(e){
		if(confirm("İmza önbelleğini temizlemek istediğinizden emin misiniz?")){
			clearSettings(true);
			alert("Önbellek başarıyla temizlendi!");
		}
	};
}

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
			if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200)
				updateSignature(nick, xhr.responseText);
		};
		xhr.send();
	} else {
		putSignature(signature, signatures[nick]);
	}
});
