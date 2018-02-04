//create app
/*
intent:search_and_play
entities:search_value
utterance: I want to watch Hot Fuzz

createLUIS(user, site)
addAction(action_name, entity_names...)
addUtterance(action_name, utterance, entity_locations)
getAction(user, site, utterance)

createLUIS(thelucasbullen, netflix)
addAction(search_and_play, search_value)
addUtterance(search_and_play, I want to watch Hot Fuzz, [16,24])
getAction(thelucasbullen, netflix, I want to watch Hot Fuzz)
*/

// var entities = [];
//     entities.push({"entityName":"amount","startCharIndex": 5,"endCharIndex": 6});
//     entities.push({"entityName":"recipient","startCharIndex": 19,"endCharIndex": 22});
var request = require('request');
var querystring = require('querystring');
const requestRetry = require("requestretry");
var rp = require('request-promise');
var fse = require('fs-extra');
var path = require('path');


// Send JSON as the body of the POST request to the API
var callAddIntent = async (options) => {
    try {

        var response;
        response = await request(options);
        return { response: response };

    } catch (err) {
        console.log(`Error in callAddIntent:  ${err.message} `);
        return 'Error in callAddIntent:  ${err.message} ';
    }
}

var callCreateApp = async (options) => {
    try {

        var response;
        if (options.method === 'POST') {
            response = await rp.post(options);
        } else if (options.method === 'GET') { // TODO: There's no GET for create app
            response = await rp.get(options);
        }
        // response from successful create should be the new app ID
        return { response };

    } catch (err) {
        throw err;
    }
}
// Send JSON as the body of the POST request to the API
var callAddEntity = async (options) => {
    try {

        var response;
        response = await request(options);
        return { response: response };

    } catch (err) {
        console.log(`error in callAddEntity: ${err.message}`);
    }
}

// Send JSON as the body of the POST request to the API
var callAddUtter = async (options) => {
    try {

        var response;
        response = await request(options);
        return { response: response };

    } catch (err) {
        console.log(`error in callAddEntity: ${err.message}`);
    }
}
const createApp = async (config) => {

        try {
            // JSON for the request body
            // { "name": MyAppName, "culture": "en-us"}
            var jsonBody = {
                "name": config.appName,
                "culture": config.culture
            };

            // Create a LUIS app
            var createAppPromise = callCreateApp({
                uri: config.uri,
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
                },
                json: true,
                body: jsonBody
            });

            let results = await createAppPromise;

            // Create app returns an app ID
            let appId = results.response;
            console.log(`Called createApp, created app with ID ${appId}`);
            return appId;


        } catch (err) {
            console.log(`Error creating app:  ${err.message} `);
            return `Error creating app:  ${err.message} `;
        }

    }
const addEntities = async (config) => {
    var entityPromises = [];
    config.uri = config.uri.replace("{appId}", config.LUIS_appId).replace("{versionId}", config.LUIS_versionId);

    config.entityList.forEach(function (entity) {
        try {
            config.entityName = entity;
            // JSON for the request body
            // { "name": MyEntityName}
            var jsonBody = {
                "name": config.entityName,
            };

            // Create an app
            var addEntityPromise = callAddEntity({
                url: config.uri,
                fullResponse: false,
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
                },
                json: true,
                body: jsonBody,
                maxAttempts: maxRetry,
                retryDelay: delayMS,
                retryStrategy: retryStrategy
            });
            entityPromises.push(addEntityPromise);

            console.log(`called addEntity for entity named ${entity}.`);

        } catch (err) {
            console.log(`Error in addEntities:  ${err.message} `);
        }
    }, this);
    let results = await Promise.all(entityPromises);
    console.log(`Results of all promises = ${JSON.stringify(results)}`);
    let response = results;// await fse.writeJson(createResults.json, results);
    return config.LUIS_appId;


}

const delayMS = 1000;

// retry recount
const maxRetry = 5;

// retry request if error or 429 received
var retryStrategy = function (err, response, body) {
    let shouldRetry = err || (response.statusCode === 429);
    if (shouldRetry) console.log("retrying add entity...");
    return shouldRetry;
}

const addExample = async (config) => {
    config.uri = config.uri.replace("{appId}", config.LUIS_appId).replace("{versionId}", config.LUIS_versionId);
    var utterancePromise;
    try {
        var jsonBody = config.utterance;
        console.log("body");
        console.log(jsonBody);
        console.log(jsonBody.entityLabels[0]);

        utterancePromise = callAddUtter({
            url: config.uri,
            fullResponse: false,
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
            },
            json: true,
            body: jsonBody
        });
        var entity = jsonBody.entityLabels[0];
        console.log(`called addExample for utterance`);
        console.log(entity);

    } catch (err) {
        console.log(`Error in addExample:  ${err.message} `);
        //throw err;
    }
    let results = await utterancePromise;

};
const addIntents = async (config) => {
    config.uri = config.uri.replace("{appId}", config.LUIS_appId).replace("{versionId}", config.LUIS_versionId);

    try {

        // JSON for the request body
        var jsonBody = {
            "name": config.intentList[0]
        };

        // Create an intent
        var addIntentPromise = callAddIntent({
            url: config.uri,
            fullResponse: false,
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
            },
            json: true,
            body: jsonBody,
            maxAttempts: maxRetry
        });

        var intent = jsonBody.name;
        console.log("Called addIntents for intent named ${intent}.");

    } catch (err) {
        console.log(`Error in addIntents:  ${err.message} `);

    }
    return config.LUIS_appId;


}
const upload = async (config) => {

    try{

        // read in utterances
        var entireBatch = await fse.readJson(config.inFile);

        // break items into pages to fit max batch size
        var pages = getPagesForBatch(entireBatch.utterances, config.batchSize);

        var uploadPromises = [];

        // load up promise array
        pages.forEach(page => {
            config.uri = "https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/versions/{versionId}/examples".replace("{appId}", config.LUIS_appId).replace("{versionId}", config.LUIS_versionId)
            var pagePromise = sendBatchToApi({
                url: config.uri,
                fullResponse: false,
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
                },
                json: true,
                body: page,
                maxAttempts: maxRetry,
                retryDelay: delayMS,
                retryStrategy: retryStrategy
            });

            uploadPromises.push(pagePromise);
        })

        //execute promise array

        let results =  await Promise.all(uploadPromises)
        console.log("\n\nResults of all promises = ${JSON.stringify(results)}");
        let response = await fse.writeJson(config.inFile.replace('.json','.upload.json'),results);

        console.log("upload done");

    } catch(err){
        throw err;
    }

};

var getPagesForBatch = (batch, maxItems) => {

    try{
        var pages = [];
        var currentPage = 0;

        var pageCount = (batch.length % maxItems == 0) ? Math.round(batch.length / maxItems) : Math.round((batch.length / maxItems) + 1);

        for (let i = 0;i<pageCount;i++){

            var currentStart = currentPage * maxItems;
            var currentEnd = currentStart + maxItems;
            var pagedBatch = batch.slice(currentStart,currentEnd);

            var j = 0;
            pagedBatch.forEach(item=>{
                item.ExampleId = j++;
            });

            pages.push(pagedBatch);

            currentPage++;
        }
        return pages;
    }catch(err){
        throw(err);
    }
}

// send json batch as post.body to API
var sendBatchToApi = async (options) => {
    try {

        var response = await request(options);
        //return {page: options.body, response:response};
        return {response:response};
    }catch(err){
        throw err;
    }
}
const getApp = async (config) => {

        try {
            var getAppPromise = callGetApp({
                uri: config.uri,
                method: 'GET',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
                },
                json: true
            });

            let results = await getAppPromise;

            // Create app returns an app ID
            let appId = results.response.id;
            console.log(`Called getApp, got app with ID ${appId}`);
            return appId;


        } catch (err) {
            console.log(`Error finding app:  ${err.message} `);
            return `Error finding app:  ${err.message} `;
        }

    }

var callGetApp = async (options) => {
    try {

        var response;
        if (options.method === 'POST') {
            response = await rp.post(options);
        } else if (options.method === 'GET') { // TODO: There's no GET for create app
            response = await rp.get(options);
        }
        // response from successful create should be the new app ID
        return { response };

    } catch (err) {
        throw err;
    }
}
const getCommand = async (config) => {

        try {
            // Create a LUIS app
            var createAppPromise = callGetAction({
                uri: config.uri,
                method: 'GET',
                json: true
            });

            let results = await createAppPromise;

            // Create app returns an app ID
            let response = results.response;
            console.log(`Called getAction`);
            return response;


        } catch (err) {
            console.log(`Error getting action:  ${err.message} `);
            return `Error getting action:  ${err.message} `;
        }

    }
var callGetAction = async (options) => {
    try {

        var response;
        response = await rp.get(options);
        // response from successful create should be the new app ID
        return { response };

    } catch (err) {
        throw err;
    }
}
const train = async (config) => {
        config.uri = config.uri.replace("{appId}", config.LUIS_appId).replace("{versionId}", config.LUIS_versionId);
        try {
            // Create a LUIS app
            var trainAppPromise = callAAPostAction({
                uri: config.uri,
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
                },
                body:{},
                json: true
            });

            let results = await trainAppPromise;
            console.log(`Have train promise:  ${results} `);

            //poll GET train
            var doneTraining = false;
            var tryForOneMin = 120;
            console.log("STARTING LOOP");
            while(!doneTraining && tryForOneMin > 0){
            console.log("LOOP TOP");
                tryForOneMin -= 1;
                var pollTraining = callAAGetAction({
                    uri: config.uri,
                    method: 'GET',
                    headers: {
                        'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
                    },
                    body:{},
                    json: true
                });
                results = await pollTraining;
                console.log(`Have pollTraining:  ${results} `);
                if(results == null || results.response.length == 0){
                    break;
                }
                let weGood = true;
                console.log(results.response);
                for (var i = 0; i < results.response.length; i++) {
                    let modResult = results.response[i];
                    console.log(modResult.details.status);
                    if(modResult.details.status == "InProgress"){
                        weGood = false;
                        break;
                    }
                }
                if(weGood){
                    break;
                }
                console.log("BEFORE WAIT");
                var waitTill = new Date(new Date().getTime() + 500);
                while(waitTill > new Date()){}
                console.log("AFTER WAIT");
            }
            return config.LUIS_appId;


        } catch (err) {
            console.log(`Error training:  ${err.message} `);
            return config.LUIS_appId;
        }

    };
   var callAAPostAction = async (options) => {
    try {
        var response;
        response = await rp.post(options);
        return { response };

    } catch (err) {
        throw err;
    }
}

var callAAGetAction = async (options) => {
    try {
        var response;
        response = await rp.get(options);
        return { response };

    } catch (err) {
        throw err;
    }
}
const publish = async (config) => {
        config.uri = config.uri.replace("{appId}", config.LUIS_appId);
        try {
            // JSON for the request body
            // { "name": MyAppName, "culture": "en-us"}
            var jsonBody = {
                "versionId": config.LUIS_versionId,
                "isStaging": config.isStaging,
                "region": config.region
            };

            // Create a LUIS app
            var publishAppPromise = callPublishApp({
                uri: config.uri,
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': config.LUIS_subscriptionKey
                },
                json: true,
                body: jsonBody
            });

            let results = await publishAppPromise;

            // Create app returns an app ID
            let url = results.response.endpointUrl;
            console.log("Called publishApp, created app with endpoint ${url}");
            return url;


        } catch (err) {
            console.log("Error publishing app:");
            console.log(err.message);
            return err.message;
        }

    }
var callPublishApp = async (options) => {
    try {

        var response = await rp.post(options);
        return { response };

    } catch (err) {
        throw err;
    }
}

// Change these values
const LUIS_programmaticKey = "f8986c892c0747ac98ee1f1aaef2c604";
const LUIS_appCulture = "en-us";
const LUIS_versionId = 0.1;

var createLUIS = function hello(name) {
	var configCreateApp = {
	    LUIS_subscriptionKey: LUIS_programmaticKey,
	    LUIS_versionId: LUIS_versionId,
	    appName: name,
	    culture: LUIS_appCulture,
	    uri: "https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/"
	};
	console.log("configCreateApp");
	console.log(configCreateApp);
	return createApp(configCreateApp);
}

var trainData = function (app_id) {
	var configTrain = {
	    LUIS_subscriptionKey: LUIS_programmaticKey,
	    LUIS_appId: app_id,
	    LUIS_versionId: LUIS_versionId,
	    uri: "https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/versions/{versionId}/train"
	};
	return train(configTrain)
}

var publishApp = function (app_id) {
	var configTrain = {
	    LUIS_subscriptionKey: LUIS_programmaticKey,
	    LUIS_appId: app_id,
	    LUIS_versionId: LUIS_versionId,
        isStaging:false,
        region:"westus",
	    uri: "https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/publish"
	};
    console.log("configTrain:");
    console.log(configTrain);
	return publish(configTrain)
}

var addAction = function (app_id, action_name, entity_names) {
    //TODO
    // get app
    // addIntents
    var configAddIntents = {
	    LUIS_subscriptionKey: LUIS_programmaticKey,
	    LUIS_appId: app_id,
	    LUIS_versionId: LUIS_versionId,
	    intentList: [action_name],
	    uri: "https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/versions/{versionId}/intents"
	};
	return addIntents(configAddIntents).then((appID) => {
	    // addEntities
		var configAddEntities = {
		    LUIS_subscriptionKey: LUIS_programmaticKey,
		    LUIS_appId: appID,
		    LUIS_versionId: LUIS_versionId,
		    entityList: entity_names,
		    uri: "https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/versions/{versionId}/entities"
		};
		return addEntities(configAddEntities)
	});
}

var addUtterance = function (app_id, action_name, utterance, entity_labels) {
    //TODO
    // add utterance
    var utt = {
		"text": utterance,
		"intentName": action_name,
		"entityLabels":entity_labels
	};
	var configAddUtterance = {
	    LUIS_subscriptionKey: LUIS_programmaticKey,
	    LUIS_appId: app_id,
	    LUIS_versionId: LUIS_versionId,
	    utterance: utt,
	    uri: "https://westus.api.cognitive.microsoft.com/luis/api/v2.0/apps/{appId}/versions/{versionId}/example"
	};

	return addExample(configAddUtterance).then((appID) => {
		return trainData(app_id);
	}).then((appID) => {
		return publishApp(app_id);
	});
}

var getAction = function (app_id, utterance) {
    var endpoint =
        "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/";
    var urlParam = {
    	"subscription-key":LUIS_programmaticKey,
    	"verbose":  true,
        "q": utterance
    }
    var luisRequest =
        endpoint + app_id +
        '?' + querystring.stringify(urlParam);
        console.log(luisRequest);
    var queryParams = {
        "uri": luisRequest
    }
    return getCommand(queryParams)
    	.then((response) => {
    		if(response == null || response.topScoringIntent == null || response.topScoringIntent.score < 0.5){
				    return "NUUUUUU";
				}
				var entities = [];
				for (var i = 0; i < response.entities.length; i++) {
					var jsonEntity = response.entities[i];
					entities.push({"entity":jsonEntity.type,"value":jsonEntity.entity});
				}
				return {"action":response.topScoringIntent.intent,"entities":entities};
    	});
}











function create(function_name, entities, utterance, context, callback){
	var ent_names = []
	for (var i = 0; i < entities.length; i++) {
		ent_names.push(entities[i].entityName);
	}
	createLUIS(Date.now()+"")
	    .then((appID) => {
	        return addAction(appID, function_name, ent_names);
	    }).then((appID) => {
         //   var res = new Promise(function(res, rej) {
         //       setTimeout(function(){
          //          res(addUtterance(appID, function_name, utterance, entities))
          //      }, 1250)
          //  });
            
         //   return res;
	  //  }).then((appID) => {
	    	callback(null, {"id":appID});
	    });
}


function add(appID, function_name, entities, utterance, context, callback){
	addUtterance(appID, function_name, utterance, entities)
		.then((appID) => {
	    	callback(null,{"id":appID});
		});
}

function get(appID, utterance, context, callback){
    getAction(appID, utterance)
    .then((action) => {
    	var retObj = {};
        retObj.action = action.action;
        retObj.entities = []
        for (var i = 0; i < action.entities.length; i++) {
        	retObj.entities.push({entity:action.entities[i].entity, value:action.entities[i].value});
            //console.log("entity:"+action.entities[i].entity+" value:"+action.entities[i].value+"\n");
        }
	    callback(null, retObj);
    });
}


/**
* Add utterance
* @param {string} func
* @param {string} appID
* @param {string} utterance
* @param {string} entities
* @param {string} function_name
* @returns {object}
*/
module.exports = (func, appID, utterance, entities, function_name, context, callback) => {
    entities = JSON.parse(entities);
    if(func=="create"){
        create(function_name, entities, utterance, context, callback);
    }else if(func=="add"){
        add(appID, function_name, entities, utterance, context, callback);
    }else if(func=="get"){
        get(appID, utterance, context, callback);
    }
    return "no";
};





