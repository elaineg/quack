
//Background.js receives the correct message based on status of the extension and changes the icons colors
chrome.runtime.onMessage.addListener(messageReceived);

function messageReceived(msg) {

   if (msg.action == "errorIcon") {
     chrome.browserAction.setIcon({ path: msg.icon });
   } else if (msg.action == "changeIcon"){
     chrome.browserAction.setIcon({ path: msg.icon });
   } else {
     console.log('no action');
   }
}
