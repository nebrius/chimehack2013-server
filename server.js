#!/usr/bin/env node
/*
The MIT License (MIT)

Copyright (c) 2013 Bryan Hughes, Nicole Jiang, Jaayden Halko , Bonnie Li

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var fs = require('fs'),
	path = require('path'),
	express = require('express'),

	app = express(),

	Logger = require('transport-logger'),
	logger = new Logger([{
		destination: path.join(__dirname, 'log'),
		minLevel: 'trace'
	}, {
		minLevel: 'trace'
	}]),

	PORT = 8080,
	BATCH_DELAY = 200;

function createEndpoint(name, autoIncrement) {
	var counter = 0,
		filePath = path.join(__dirname, 'data', name + 's.json'),
		data = JSON.parse(fs.readFileSync(filePath)),
		saving;

	function save() {
		if(!saving) {
			saving = true;
			setTimeout(function () {
				fs.writeFileSync(filePath, JSON.stringify(data, false, '\t'));
				saving = false;
			}, BATCH_DELAY);
		}
	}

	// GET /api/<name> -> Array<type>
	app.get('/api/' + name, function (request, response) {
		logger.info('Getting the list of ' + name + 's');
		response.send(200, JSON.stringify(data));
	});

	// GET /api/<name>/:id -> type
	app.get('/api/' + name + '/:id', function (request, response) {
		var requestId = request.params.id,
			entry = data[requestId];
		logger.info('Getting the ' + name + ' with id ' + requestId);
		if (!entry) {
			logger.error('Invalid request, ' + name + ' id "' + requestId + '" was not found');
			response.send(400, 'Invalid request');
			return;
		}
		response.send(200, JSON.stringify(entry));
	});

	// POST /api/students(/:id) type -> type
	if (autoIncrement) {
		app.put('/api/' + name, function (request, response) {
			var info = request.body,
				id = ++counter;
			logger.info('Creating new ' + name + ' ' + id);

			// Save the data
			info.id = id;
			data.push(info);
			save();

			// Send the message
			response.send(200, id);
		});
	}

	// PUT /api/<name>/:id type -> type
	app.put('/api/' + name + '/:id', function (request, response) {
		var id = request.params.id,
			info = request.body;
		logger.info((data[id] ? 'Updating' : 'Creating') + ' the ' + name + ' with id ' + id);

		// Save the data
		data[id] = info;
		save();

		// Send the response
		response.send(200, info);
	});
}

// Initialize express
app.use(express.bodyParser());
app.all('*', function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Content-Length');
	next();
});

// Create the endpoints
createEndpoint('student');
createEndpoint('donor');
createEndpoint('donation', true);

// Start the app
app.listen(PORT);
logger.info('Server started on port ' + PORT);
