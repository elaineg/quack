//Make any "state" of the extension by deactivating the following getElementById calls


//Hide Elements of first state: Listening
// document.getElementById('header').style.display = "none";
// document.getElementById('readyButton').style.display = "none";
// document.getElementById('info').style.display = "none";
// document.getElementById('sampleCommands').style.display = "none";

//Hide elements of second state: Analysis
function setAnalysisDisplay(display){
	document.getElementById('analyzing').style.display = display;
	document.getElementById('loadingImage').style.display = display;
}

// Hide elements of third state: Success
function setSuccessDisplay(display){
	document.getElementById('success').style.display = display;
}

// Hide elements of fourth state: Learning
function setLearningDisplay(display){
	document.getElementById('notFound').style.display = display;
	document.getElementById('instructions').style.display = display;
	document.getElementById('button1').style.display = display;
	document.getElementById('button2').style.display = display;
}

function setListeningDisplay(display){
	document.getElementById('header').style.display = display;
	document.getElementById('readyButton').style.display = display;
	document.getElementById('info').style.display = display;
	document.getElementById('sampleCommands').style.display = display;
}

function setDisplay(name){
	setListeningDisplay("none");
	setLearningDisplay("none");
	setSuccessDisplay("none");
	setAnalysisDisplay("none");
	switch(name) {
		case "Listening":
			setListeningDisplay("");
			break;
		case "Learning":
			setLearningDisplay("");
			break;
		case "Success":
			setSuccessDisplay("");
			break;
		case "Analysis":
			setAnalysisDisplay("");
			break;
		default:
	}
}

setDisplay("Listening")

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
chrome.runtime.onMessage.addListener(messageReceived);
function messageReceived(msg) {
    console.log("state", msg);
    
    switch (msg.state) {
    case 0: setDisplay("Listening"); break;
    case 1: setDisplay("Analysis"); break;
    case 2: setDisplay("Analysis"); break;
    default:
	throw "QUACK Error";
    }
}

