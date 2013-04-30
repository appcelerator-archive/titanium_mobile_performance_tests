/*global Ti*/

var displayCaps = Ti.Platform.displayCaps || Ti.Platform.DisplayCaps,

	win,
	testNodes,
	topLevel,
	status,

	iteration,
	iterationTimes,
	iterationVelocities,
	childrenLaidOut,
	offset,

	OFFSET_SPREAD = 20,
	OFFSET_MIN = 10,
	NUM_ELEMENTS = 1000,
	TEST_DELAY = 1000,
	NUM_ITERATIONS = 1000,
	NUM_CHILDREN_TO_CHANGE = 100;

function runTest() {
	iteration++;
	if (iteration < NUM_ITERATIONS) {
		setTimeout(function () {
			var childrenToChange = [],
				child,
				i,
				direction;

			while(childrenToChange.length < NUM_CHILDREN_TO_CHANGE) {
				child = testNodes[Math.floor(Math.random() * testNodes.length)];
				if (childrenToChange.indexOf(child) === -1) {
					childrenToChange.push(child);
				}
			}

			topLevel.width += offset;
			topLevel.height += offset;
			offset *= -1;
			childrenLaidOut = 0;

			for (i = 0; i < NUM_CHILDREN_TO_CHANGE; i++) {
				direction = (Math.random() - 0.5) > 0 ? 1 : -1;
				child = childrenToChange[i];
				child.left = Math.floor(child.left + direction * (Math.random() * OFFSET_SPREAD + OFFSET_MIN));
				child.top = Math.floor(child.top + direction * (Math.random() * OFFSET_SPREAD + OFFSET_MIN));
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
		i,
		startTime;

	function postLayout() {
		var layoutTime,
			velocity = NaN,
			sorted;
		if (iteration) {
			childrenLaidOut++;
			if (childrenLaidOut === NUM_CHILDREN_TO_CHANGE) {
				layoutTime = (Date.now() - startTime);
				iterationTimes.push(layoutTime);
				if (iterationTimes.length > 1) {
					iterationVelocities.push(velocity = iterationTimes[iterationTimes.length - 1] - iterationTimes[iterationTimes.length - 2]);
				}
				status.text = 'Iteration: ' + iteration +
					'\nTime: ' + layoutTime +
					'ms\nVelocity: ' + velocity +
					'ms\nMedian Time: ' + (sorted = iterationTimes.sort())[Math.floor(sorted.length / 2)] +
					(isNaN(velocity) ? 'ms' : 'ms\nMedian Velocity: ' + (sorted = iterationVelocities.sort())[Math.floor(sorted.length / 2)] + 'ms');
				runTest();
			}
		}
	}

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
		child.addEventListener('postlayout', postLayout);
		container.add(child);
	}
	testNodes = container.children;

	status = Ti.UI.createLabel({
		left: 0,
		top: 0,
		borderColor: '#000',
		borderWidth: 1,
		backgroundColor: '#fff'
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
	iterationTimes = [];
	iterationVelocities = [];
	childrenLaidOut = 0;
	offset = -5;
	runTest();
};
