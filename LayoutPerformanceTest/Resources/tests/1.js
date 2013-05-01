/*global Ti*/

/**
 * Test overview:
 *
 * Question:
 * Given n child views, if we change the position of m <= n
 * child views, how long does the system take to lay out the changes?
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
 * 3) Add n views to the container of a fixed width and height, but at a randomized left and top position
 *
 * Test operation:
 * 1) Per iteration:
 *		1) Randomly select m views to shift
 *		2) Select p views from m to sample the layout time of
 *		3) Listen for the 'postlayout' event on the root view. This is used as an analogue for when the layout began
 *		4) Listen for the 'postlayout' event on all of the elements to be sampled
 *		5) Store the time difference between the root view's postlayout event and the child being sampled
 *		6) Calculate the median layout time of all the children being sampled and store it
 * 7) Once all iterations are complete, calculate the median of the iteration layout times
 * 8) Multiply times 2 to get the estimated layout time
 */

var displayCaps = Ti.Platform.displayCaps || Ti.Platform.DisplayCaps,

	win,
	testNodes,
	topLevel,
	status,

	iteration,
	layoutTimes,
	iterationTimes,
	offset,
	startTime,

	// The minimum distance a child must be shifted. Must be a positive integer
	OFFSET_MIN = 10,

	// The variability in the distance a child will be shifted above the minimum. Must be a positive integer
	OFFSET_SPREAD = 20,

	// The number of child views to render to the screen
	NUM_ELEMENTS = 1000,

	// The number of test iterations to run
	NUM_ITERATIONS = 1000,

	// The number of children to shift per iteration
	NUM_CHILDREN_TO_CHANGE = 100,

	// The number of samples to take per iteration. Must be less than or equal to the number of children to shift
	NUM_SAMPLES_TO_TAKE = 1,

	// The time delay after the last sample was taken until the next test is started
	TEST_DELAY = 250;

function createPostLayout(node) {
	node.addEventListener('postlayout', function postLayout() {
		var layoutTime,
			sorted;
		node.removeEventListener('postlayout', postLayout);
		layoutTime = Date.now() - startTime;
		iterationTimes.push(layoutTime);
		if (iterationTimes.length === NUM_SAMPLES_TO_TAKE) {
			sorted = iterationTimes.sort();
			layoutTime = sorted[Math.floor(sorted.length / 2)];
			layoutTimes.push(layoutTime);
			sorted = layoutTimes.sort();
			status.text = 'Iteration: ' + iteration +
				'\nTime: ' + layoutTime +
				'ms\nMedian Time: ' + sorted[Math.floor(sorted.length / 2)] + 'ms';
			runTest();
		}
	});
}

function runTest() {
	iteration++;
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

			numSamplesTaken = 0;
			iterationTimes = [];

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
		}, TEST_DELAY);
	}
}

exports.init = function () {
	var container = Ti.UI.createView({
			left: 0,
			top: 0,
			width: displayCaps.platformWidth - 10,
			height: displayCaps.platformHeight - 10,
			backgroundColor: '#fff'
		}),
		child,
		color = [0, 0, 0],
		i;

	for (i = 0; i < NUM_ELEMENTS; i++) {
		color[0] += 15;
		if (color[0] > 255) {
			color[0] = 0;
			color[1] += 15;
			if (color[1] > 255) {
				color[1] = 0;
				color[2] += 15;
				if (color[2] > 255) {
					color[2] = 0;
				}
			}
		}

		child = Ti.UI.createView({
			backgroundColor: '#' +
				('00' + color[2]).slice(-2) +
				('00' + color[1]).slice(-2) +
				('00' + color[0]).slice(-2),
			left: Math.floor(Math.random() * (displayCaps.platformWidth - 25)),
			top: Math.floor(Math.random() * (displayCaps.platformHeight - 25)),
			width: 20,
			height: 20
		});
		container.add(child);
	}
	testNodes = container.children;

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
		startTime = Date.now();
	});
	topLevel.add(container);
	topLevel.add(status);

	win = Ti.UI.createWindow({
		backgroundColor: '#fff'
	});
	win.add(topLevel);
	win.open();
};

exports.run = function () {
	iteration = 0;
	layoutTimes = [];
	offset = -5;
	runTest();
};
