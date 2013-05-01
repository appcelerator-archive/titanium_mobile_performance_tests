/*global Ti*/

/**
 * Test overview:
 *
 * Question:
 * Given n child views in a deeply-nested structure, with t child views per tree level and l levels, if we change the
 * position of m <= n child views, how long does the system take to lay out the changes?
 *
 * Limitations and known quantities:
 * 1) The time it takes to lay out a set of changes is not directly exposed
 * 2) We do not know what the last element to be laid out is
 * 3) We do know when the first element will be laid out
 *
 * Test setup:
 * 1) Create a layout that is, for the purposes of this test, a root level view.
 * 2) Create a single child view, referred to as "container", of the root level view such that the root level view's
 *    dimensions can be changed without requiring the container to be re-laid out. Whether or not the container is
 *    actually re-laid out is dependent on the underlying layout engine
 * 3) Set the container as the view of interest
 * 4) Recursively create a complete tree with l levels of views and t children per level. This gives t^l children
 *
 * Test operation:
 * 1) Per iteration:
 *		1) Randomly select m views to shift
 *		2) Select p views from m to sample the layout time of
 *		3) Record the time to determine the setup time for the layout
 *		3) Listen for the 'postlayout' event on the root view. This is used as an analogue for when the layout began (post-setup)
 *		4) Listen for the 'postlayout' event on all of the elements to be sampled
 *		5) Store the time difference between the root view's postlayout event and the child being sampled
 *		6) Calculate the median layout time of all the children being sampled and store it
 * 7) Once all iterations are complete, calculate the median of the iteration layout times
 */

var displayCaps = Ti.Platform.displayCaps || Ti.Platform.DisplayCaps,

	displayName,
	testNodes,
	topLevel,
	status,
	testWin,
	testDelay,

	iteration,
	layoutMean,
	samplesCollected,
	sampleMean,
	offset,
	startTime,
	setupTime,
	warmupRoundsRemaining,
	data,

	// The minimum distance a child must be shifted. Must be a positive integer
	OFFSET_MIN = 2,

	// The variability in the distance a child will be shifted above the minimum. Must be a positive integer
	OFFSET_SPREAD = 5,

	// The number of tree levels in the layout to create
	NUM_LEVELS = 5,

	// The number of children to create per level
	NUM_CHILDREN_PER_LEVEL = 4,

	// The number of test iterations to run
	NUM_ITERATIONS = 1000,

	// The number of children to shift per iteration
	NUM_CHILDREN_TO_CHANGE = 100,

	// The number of samples to take per iteration. Must be less than or equal to the number of children to shift
	NUM_SAMPLES_TO_TAKE = 1,

	// The number of rounds to run to prime the test delay estimate
	WARMUP_ROUNDS = 10,

	// The time delay after the last sample was taken until the next test is started
	WARMUP_ROUND_DELAY = 1000;

function createPostLayout(node) {
	node.addEventListener('postlayout', function postLayout() {
		var layoutTime = Date.now() - startTime,
			dataEntry = data[data.length - 1];

		node.removeEventListener('postlayout', postLayout);

		// Update the sample mean
		if (++samplesCollected > 1) {
			sampleMean = (sampleMean * (samplesCollected - 1) + layoutTime) / samplesCollected;
		} else {
			sampleMean = layoutTime;
		}

		if (dataEntry) {
			dataEntry.sampleTimes.push(layoutTime);
				dataEntry.setupTime = setupTime;
		}

		if (samplesCollected === NUM_SAMPLES_TO_TAKE) {

			layoutTime = sampleMean * 2 + setupTime;

			// Update the iteration mean
			if (iteration > 1) {
				layoutMean = (layoutMean * (iteration - 1) + layoutTime) / iteration;
			} else {
				layoutMean = layoutTime;
			}

			// Update the status text
			if (warmupRoundsRemaining) {
				status.text = 'Warming up';
			} else {
				status.text = 'Iteration: ' + iteration +
					'\nSetup Time: ' + setupTime +
					'ms\nSample Mean: ' + Math.round(sampleMean) +
					'ms\nEstimated Layout Time: ' + Math.round(layoutTime) +
					'ms\nLayout Mean: ' + Math.round(layoutMean) + 'ms';
			}
			runTest();
		}
	});
}

function configureTest(name) {
	var configWin = Ti.UI.createWindow({
			backgroundColor: '#fff',
			layout: 'vertical'
		}),
		configTable = Ti.UI.createTableView({
			top: 5
		}),
		runButton = Ti.UI.createButton({
			title: 'Run Test',
			top: 5
		}),
		inputValidators = [];

	displayName = name;

	function createEntry(name, defaultValue) {
		var row = Ti.UI.createTableViewRow({
				layout: 'horizontal',
				horizontalWrap: false
			}),
			label = Ti.UI.createLabel({
				text: name + ': ',
			}),
			inputField = Ti.UI.createTextField({
				value: defaultValue || '',
				width: Ti.UI.FILL
			});
		row.add(label);
		row.add(inputField);
		configTable.appendRow(row);
		return inputField;
	}
	inputValidators.push({
		inputField: createEntry('Num Levels', NUM_LEVELS),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0) {
				NUM_LEVELS = value;
				console.log('Running test with ' + NUM_LEVELS + ' levels');
			} else {
				console.warn('Invalid number of levels specified, using the default of ' + NUM_LEVELS);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Num Children Per Level', NUM_CHILDREN_PER_LEVEL),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0) {
				NUM_CHILDREN_PER_LEVEL = value;
				console.log('Running test with ' + NUM_CHILDREN_PER_LEVEL + ' children per level');
			} else {
				console.warn('Invalid number of children per level specified, using the default of ' + NUM_CHILDREN_PER_LEVEL);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Num Iterations', NUM_ITERATIONS),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0) {
				NUM_ITERATIONS = value;
				console.log('Running test with ' + NUM_ITERATIONS + ' iterations');
			} else {
				console.warn('Invalid number of iterations specified, using the default of ' + NUM_ITERATIONS);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Children To Shift', NUM_CHILDREN_TO_CHANGE),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0 && value <= Math.pow(NUM_LEVELS, NUM_CHILDREN_PER_LEVEL)) {
				NUM_CHILDREN_TO_CHANGE = value;
				console.log('Running test with ' + NUM_CHILDREN_TO_CHANGE + ' children to shift');
			} else {
				console.warn('Invalid number of children to shift specified, using the default of ' + NUM_CHILDREN_TO_CHANGE);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Num Samples', NUM_SAMPLES_TO_TAKE),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0 && value <= NUM_CHILDREN_TO_CHANGE) {
				NUM_SAMPLES_TO_TAKE = value;
				console.log('Running test with ' + NUM_SAMPLES_TO_TAKE + ' samples');
			} else {
				console.warn('Invalid number of samples to take specified, using the default of ' + NUM_SAMPLES_TO_TAKE);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Offset Min', OFFSET_MIN),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0) {
				OFFSET_MIN = value;
				console.log('Running test with an offset min of ' + OFFSET_MIN);
			} else {
				console.warn('Invalid offset minimum specified, using the default of ' + OFFSET_MIN);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Offset Spread', OFFSET_SPREAD),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0) {
				OFFSET_SPREAD = value;
				console.log('Running test with an offset spread of ' + OFFSET_SPREAD);
			} else {
				console.warn('Invalid offset spread specified, using the default of ' + OFFSET_SPREAD);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Warmup Rounds', WARMUP_ROUNDS),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0) {
				WARMUP_ROUNDS = value;
				console.log('Running test with ' + WARMUP_ROUNDS + ' warmup rounds');
			} else {
				console.warn('Invalid number of warmup rounds specified, using the default of ' + WARMUP_ROUNDS);
			}
		}
	});
	inputValidators.push({
		inputField: createEntry('Warmup Round Delay', WARMUP_ROUND_DELAY),
		parseValue: function () {
			var value = parseInt(this.inputField.value, 10);
			if (!isNaN(value) && value > 0) {
				WARMUP_ROUND_DELAY = value;
				console.log('Running test with a ' + WARMUP_ROUND_DELAY + ' ms warmup round delay');
			} else {
				console.warn('Invalid warmup round delay specified, using the default of ' + WARMUP_ROUND_DELAY);
			}
		}
	});

	runButton.addEventListener('click', function () {

		var i, len,
			loadingWin = Ti.UI.createWindow({
				backgroundColor: '#fff'
			});

		console.log('\n*****************\nRunning ' + displayName);

		// Parse the input
		for (i = 0, len = inputValidators.length; i < len; i++) {
			inputValidators[i].parseValue();
		}
		configWin.close();

		loadingWin.add(Ti.UI.createLabel({
			text: 'Loading test'
		}));
		loadingWin.open();

		setTimeout(function () {
			// Initialize the test
			initTest();
			loadingWin.close();

			// Kickstart the test
			testDelay = WARMUP_ROUND_DELAY;
			iteration = 0;
			offset = -5;
			warmupRoundsRemaining = WARMUP_ROUNDS;
			runTest();
		}, 100);
	});
	configWin.add(runButton);
	configWin.add(configTable);
	configWin.open();
}

function initTest() {

	var container = Ti.UI.createView({
			left: 0,
			top: 0,
			width: displayCaps.platformWidth - 10,
			height: displayCaps.platformHeight - 10,
			backgroundColor: '#fff'
		}),
		color = [0, 0, 0];

	testNodes = [];
	function createViewGroup(level, parent) {
		var view,
			i,
			width = parent.width / Math.sqrt(NUM_CHILDREN_PER_LEVEL),
			height = parent.height / Math.sqrt(NUM_CHILDREN_PER_LEVEL);

		color[0] += 5;
		if (color[0] === 260) {
			color[0] = 0;
			color[1] += 5;
			if (color[1] === 260) {
				color[1] = 0;
				color[2] += 5;
				if (color[2] === 260) {
					color[2] = 0;
				}
			}
		}

		for (i = 0; i < NUM_CHILDREN_PER_LEVEL; i++) {
			view = Ti.UI.createView({
				borderWidth: 2,
				borderColor: '#' +
					('00' + color[2]).slice(-2) +
					('00' + color[1]).slice(-2) +
					('00' + color[0]).slice(-2),
				left: Math.floor(Math.random() * (parent.width - width)),
				top: Math.floor(Math.random() * (parent.height - height)),
				width: width,
				height: height
			});
			testNodes.push(view);
			if (level !== NUM_LEVELS) {
				createViewGroup(level + 1, view);
			}
			parent.add(view);
		}
	}
	createViewGroup(1, container);

	data = [];

	status = Ti.UI.createLabel({
		left: 0,
		top: 0,
		borderColor: '#000',
		borderWidth: 1,
		backgroundColor: '#fff',
		width: 300,
		height: 100
	});

	topLevel = Ti.UI.createView({
		left: 0,
		top: 0,
		width: displayCaps.platformWidth,
		height: displayCaps.platformHeight,
		backgroundColor: '#f00'
	});
	topLevel.addEventListener('postlayout', function () {
		var currentTime = Date.now();
		setupTime = currentTime - startTime;
		startTime = currentTime;
	});
	topLevel.add(container);
	topLevel.add(status);

	testWin = Ti.UI.createWindow({
		backgroundColor: '#fff'
	});
	testWin.add(topLevel);
	testWin.open();
}

function runTest() {
	if (warmupRoundsRemaining) {
		warmupRoundsRemaining--;
		if (!warmupRoundsRemaining) {
			iteration = 1;
			testDelay = layoutMean;
			console.log('Running tests with ' + testNodes.length + ' nodes and a test delay of ' + testDelay + 'ms');
		}
	} else {
		iteration++;
	}
	if (iteration <= NUM_ITERATIONS) {
		setTimeout(function () {
			var childrenToChange = [],
				childrenToSample = [],
				availableChildren,
				child,
				i,
				direction;

			// Randomly select NUM_CHILDREN_TO_CHANGE from the list of all test nodes
			availableChildren = [].concat(testNodes);
			while(childrenToChange.length < NUM_CHILDREN_TO_CHANGE && availableChildren.length) {
				childrenToChange.push(availableChildren.splice(Math.floor(Math.random() * availableChildren.length), 1)[0]);
			}

			// Randomly select NUM_SAMPLES_TO_TAKE from the list of children randomely selected above
			availableChildren = [].concat(childrenToChange);
			while(childrenToSample.length < NUM_SAMPLES_TO_TAKE && availableChildren.length) {
				childrenToSample.push(availableChildren.splice(Math.floor(Math.random() * availableChildren.length), 1)[0]);
			}

			samplesCollected = 0;
			if (iteration) {
				data.push({
					sampleTimes: []
				});
			}

			startTime = Date.now();

			// Trigger a layout of the parent window to test optimization
			topLevel.width += offset;
			topLevel.height += offset;
			offset *= -1;

			// Trigger a layout on the selected children
			for (i = 0; i < NUM_CHILDREN_TO_CHANGE; i++) {
				direction = (Math.random() - 0.5) > 0 ? 1 : -1;
				child = childrenToChange[i];
				child.left = Math.floor(child.left + direction * (Math.random() * OFFSET_SPREAD + OFFSET_MIN));
				child.top = Math.floor(child.top + direction * (Math.random() * OFFSET_SPREAD + OFFSET_MIN));
				if (childrenToSample.indexOf(child) !== -1) {
					createPostLayout(child);
				}
			}
		}, testDelay);
	} else {
		var resultsWin = Ti.UI.createWindow({
				backgroundColor: '#fff'
			}),
			closeButton = Ti.UI.createButton({
				title: 'Close',
				bottom: 5
			}),
			results = Ti.UI.createLabel({
				text: 'Mean layout time per iteration: ' + layoutMean.toFixed(1) + 'ms'
			});
		closeButton.addEventListener('click', function () {
			resultsWin.close();
		});
		resultsWin.add(closeButton);
		resultsWin.add(results);
		testWin.close();
		resultsWin.open();
		console.log(JSON.stringify(data, false, '\t'));
	}
}

exports.run = function (name) {
	configureTest(name);
};
