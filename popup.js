//Make any "state" of the extension by deactivating the following getElementById calls


//Hide Elements of first state: Listening
document.getElementById('header').style.display = "none";
document.getElementById('readyButton').style.display = "none";
document.getElementById('info').style.display = "none";
document.getElementById('sampleCommands').style.display = "none";

//Hide elements of second state: Analysis
document.getElementById('analyzing').style.display = "none";
document.getElementById('loadingImage').style.display = "none";

// Hide elements of third state: Success
document.getElementById('success').style.display = 'none';

// Hide elements of fourth state: Learning
// document.getElementById('notFound').style.display = 'none';
// document.getElementById('instructions').style.display = 'none';
// document.getElementById('button1').style.display = 'none';
// document.getElementById('button2').style.display = 'none';



//These functions communicate with the background.js file in order to create a status icon in the toolbar.
//If the function is working and provides a result, the icon will be green when the extension is activated.
chrome.runtime.sendMessage({action: 'changeIcon', icon: 'icon-green.png'}, function(response) {
});


//If no command is found, the icon will turn red to alert the user.
if ($('#notFound').is(':visible')) {
  chrome.runtime.sendMessage({action: 'errorIcon', icon: 'icon-red.png'}, function(response) {
  });
} else {
  console.log('error');
}

// //for listening any message which comes from runtime
// chrome.runtime.onMessage.addListener(messageReceived);
// function messageReceived(msg) {
//    // Do your work here
// }
