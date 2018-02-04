
//Background.js receives the correct message based on status of the extension and changes the icons colors
/*chrome.runtime.onMessage.addListener(messageReceived);

function messageReceived(msg) {
    console.log(msg);
    
    if (msg.action == "errorIcon") {
	chrome.browserAction.setIcon({ path: msg.icon });
    } else if (msg.action == "changeIcon"){
	chrome.browserAction.setIcon({ path: msg.icon });
    } else {
	console.log('no action');
    }
    }*/

/*chrome.runtime.onMessage.addListener(function(req, sender, res) {
    console.log("background");
    res();
    });*/

chrome.browserAction.onClicked.addListener(function() {
    chrome.runtime.sendMessage({ next: true }, function(res) {
	console.log(res);
    });
});

