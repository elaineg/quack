((window) => {
    try {
	var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	var recognition = new SpeechRecognition();
    }
    catch(e) {
	throw "QUACK: unable to load speech";
    }

    recognition.onstart = function() {}
    recognition.onspeechend = function() {}
    recognition.onerror = function(event) {
	if (event.error == 'no-speech') {
	    throw "QUACK: no speech"; 
	};
    }

    recognition.onresult = function(event) {
	var current    = event.resultIndex;
	var transcript = event.results[current][0].transcript;

	builder.query = transcript;
    }
    
    /* PUBLIC GLOBALS */
    var _ = {};

    /* PRIVATE GLOBALS */
    var print = (m) => { console.log("[quack]", m); }
    var mouse = { x: 0, y: 0 };

    function get(endpoint, params, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
	    print(JSON.parse(this.responseText));
	};
	xhr.open('GET', endpoint, true);
	xhr.send();
    }

    /*post("/command", { type: "command", body: "search for irobot" }, (r) => {
	print(r);
    });*/

    /* USER ACTIONS */

    var cursor;
    var cursor_h = document.createElement("path");
    cursor_h.id               = "cursor_h";
    cursor_h.style.position   = "fixed";
    cursor_h.style.border     = "1px solid rgba(220,0,0,0.8)";
    cursor_h.style["z-index"] = 10000;
    cursor_h.style["pointer-events"] = "none";

    var recorder = {
	state: false,
	steps: [],
	history: [],
    };

    function recorder_start() {
	if (recorder.state) {
	    print("QUACK: warning recording overwritten");
	}
	
	recorder.state = true;
	recorder.steps = [];
    }

    function recorder_stop() {
	recorder.state = false;
	recorder.history.push(recorder.steps);
	recorder.steps = [];
    }

    /*
      
      REQUEST
      {
        
      }

     */
    
    function action_evaluate(action) {	
	for (var i = 0; i < action.steps.length; ++i) {
	    if (action.steps[i].type == "set") {
		action.steps[i].term = action.terms[action.steps[i].term];
	    }

	    window.setTimeout(function() {
		step_evaluate(this.a);
	    }.bind({ a: action.steps[i] }), i*200);
	}
    }

    function step_evaluate(step) {
	var el = path_follow(step.path);

	if (!el)
	    throw "QUACK: failed path follow!!!";
	
	switch (step.type) {
	case "click":
	    return el.click();
	case "set":
	    /*
	     * TODO: action and content aware state???
	     * NOTE: remember to sub term values in
	     */
	    return el.value += step.term;
	default:
	    throw "QUACK: Unhandled evaluation for action of type '" + a.type + "'";
	}
    }
    
    function path_make(el) {
	var path;
	
	for (var ptr = el; ptr; ptr = ptr.parentElement) {
	    if (!ptr.parentElement)
		break;
	    
	    var tag      = ptr.tagName;
	    var siblings = ptr.parentElement.children;

	    for (var i = 0, j = 0; i < siblings.length; ++i) {
		if (siblings[i] == ptr) {
		    path = {
			i:    j,
			next: path,
			tag:  tag,
		    };
		    
		    break;
		}
		else if (siblings[i].tagName == tag) ++j;
	    }
	}

	return path;
    }

    function path_follow_r(n, p) {
	if (!n) return p;
	
	for (var i = 0, j = 0; i < p.children.length; ++i) {
	    if (p.children[i].tagName == n.tag) {
		if (n.i == j) {
		    return path_follow_r(n.next, p.children[i]);
		}
		++j;
	    }
	}
    }
    
    function path_follow(path) {
	return path_follow_r(path.next, document.body);
    }

    function optimize(raw) {
	var res = {
	    terms: [],
	    steps: [],
	};
	
	for (var i = 0; i < raw.length; ++i) {
	    var raw_step = raw[i];

	    switch (raw_step.type) {
	    case "click":
		res.steps.push(raw_step);
		break;
		
	    case "set":
		var term = raw_step.term;

		for (; i + 1 < raw.length && raw[i + 1].type == "set" && path_follow(raw[i + 1]).isSameNode(path_follow(raw_step)); ++i)
		    term += raw[i + 1].term;

		res.terms.push(term);
		res.steps.push({
		    type: "set",
		    path: raw_step.path,
		    term: res.terms.length - 1
		});
		break;
		
	    default:
		print("QUACK: missing optimization for step of type '" + raw_step.type + "'");
		res.steps.push(raw_step);
	    }
	}

	return res;
    }

    function compile() {
	var utterance = builder.query;
	var entities  = [];
	var i = 0;
	
	builder.actions = optimize(builder.actions);
	builder.actions.terms.map((t) => {
	    var pos = builder.query.toLowerCase().search(t.toLowerCase());
	    
	    if (pos > 0) {
		entities.push({
		    entityName: ++i,
		    startCharIndex: pos,
		    endCharIndex: pos + t.length
		});
	    }
	});

	print({ utterance, entities, });
	
	return {
	    utterance,
	    entities,
	};
    }

    window.addEventListener("mousemove", (e) => {
	mouse.x = e.clientX;
	mouse.y = e.clientY;

	cursor_h.style.display = "none";
	cursor = document.elementFromPoint(mouse.x, mouse.y);
	cursor_h.style.display = "";

	var rect = cursor.getBoundingClientRect();
	
	cursor_h.style.left   = rect.left - 2 + "px";
	cursor_h.style.top    = rect.top  - 2 + "px";
	
	cursor_h.style.width  = cursor.offsetWidth  + 2 + "px";
	cursor_h.style.height = cursor.offsetHeight + 2 + "px";
    });

    var builder = {
	state: 0, /* 0: record command
		   * 1: record actions
		   * 2: stop
		   */
	query:     "",
	query_err: false,
	actions:   [],
    };

    window.addEventListener("click", (e) => {
	if (recorder.state)
	    recorder.steps.push(
		{ type: "click",
		  path: path_make(e.target)
		});
    });

    chrome.runtime.onMessage.addListener(
	function(req, sender, res) {
	    console.log("Hello");
	});
    
    window.addEventListener("keydown", (e) => {
	if (e.key == "Escape") {
	    /*switch (builder.state) {
	    case 0:
		recognition.start();
		break;
	    case 1:
		recognition.stop();
		recorder_start();
		break;
	    case 2:
		recorder_stop();
		builder.actions = recorder.history[recorder.history.length - 1];
		var q = compile();

		// get
		var r = {
		    func: "get",
		    appID: "0",
		    utterance: q.utterance,
		    entities: q.entities,
		    function_name: "sentinel",
		};*/

		// https://MorganScott.lib.id/QHActionCreate@dev/?func=get&appID=6041c0a5-7ce9-46e7-9ebe-85c7b47e06b3&utterance=send 20 dollars to matt&entities=null&function_name=null
		(() => {
		    var r = {
			func: "get",
			appID: "6041c0a5-7ce9-46e7-9ebe-85c7b47e06b3",
			utterance: "send 20 dollars to matt",
			entities: null,
			function_name: null,
		    };

		    var xhr = new XMLHttpRequest();
		    xhr.onload = function() {
			print(this.responseText);
		    };
		    xhr.open('GET', "https://MorganScott.lib.id/QHActionCreate@dev/?" + Object.keys(r).map((k) => { return k + "=" + r[k]; }).join("&"), true);
		    xhr.send();
		})();
		
		// https://MorganScott.lib.id/QHActionCreate@dev/?func=create&appID=null&utterance=send 20 dollars to matt&entities="[{\"entityName\":\"amount\",\"startCharIndex\":5,\"endCharIndex\":6},{\"entityName\":\"recipient\",\"startCharIndex\":19,\"endCharIndex\":22}]"&function_name=send_money
		(() => {
		    var r = {
			func: "create",
			appID: "0",
			utterance: q.utterance,
			entities: q.entities,
			function_name: "sentinel",
		    }
		    
		    var xhr = new XMLHttpRequest();
		    xhr.onload = function() {
			print(this.responseText);
		    };
		    xhr.open('GET', "https://MorganScott.lib.id/QHActionCreate@dev/?message=" + JSON.stringify(r), true);
		    xhr.send();
		});

	/*
		break;
	    default:
		print("Unhandled builder state, attempting to restore");
		builder.state = 0;
		builder.query = [];
		builder.query_err = false;
		builder.actions = [];
	    }
	    
	    builder.state = (builder.state + 1) % 3;*/

	    /*switch (builder.state) {
	    case 0:
		recognition.start();
		break;
	    case 1:
		recognition.stop();
		recorder_start();
		break;
	    case 2:
		recorder_stop();
		builder.actions = recorder.history[recorder.history.length - 1];
		var q = compile();
		var r = {
		    user_id: "0",
		    origin: new RegExp(/\:\/\/.*\..*\//).exec(location.href)[0].slice(3),
		    type: "create",
		    steps: builder.actions,
		    entities: q.entities,
		    utterance: q.utterance,
		    entity_names: q.entities.map((k) => { return k.entityName; })
		};

		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
		    var todo = JSON.parse(this.responseText);

		    Object.keys(todo.value[0]).map((k) => {
			if (k != "luis") {
			    action_evaluate(todo.value[0][k].steps);
			}
		    });
		};
		xhr.open('GET', "https://morganscott.lib.id/quackquack@dev/?message=" + JSON.stringify(r), true);
		xhr.send();
		
		break;
	    default:
		print("Unhandled builder state, attempting to restore");
		builder.state = 0;
		builder.query = [];
		builder.query_err = false;
		builder.actions = [];
	    }
	    
	    builder.state = (builder.state + 1) % 3;

	    return;*/

	return;
	}
	
	if (recorder.state && e.target == document.querySelector(":focus") && !e.ctrlKey)
	    recorder.steps.push(
		{ type: "set",
		  path: path_make(e.target),
		  term: e.key
		});
    });
    
    window.addEventListener("load", () => {
	window.document.body.appendChild(cursor_h);
	print("Quack Loaded!");
    });
})
(window);
