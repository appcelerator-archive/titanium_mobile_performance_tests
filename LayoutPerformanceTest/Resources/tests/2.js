/*global Ti*/
var container = module.exports = Ti.UI.createView(),
	color = [0, 0, 0],
	maxLevel = 4;

function getNextColor() {
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
	return '#' +
		('00' + color[2]).slice(-2) +
		('00' + color[1]).slice(-2) +
		('00' + color[0]).slice(-2);
}

function createViewGroup(level, parent) {
	var tl,
		tr,
		bl,
		br;

	if (level === maxLevel) {
		parent.add(Ti.UI.createView({
			backgroundColor: getNextColor(),
			left: '4%',
			top: '4%',
			width: '42%',
			height: '42%'
		}));
		parent.add(Ti.UI.createView({
			backgroundColor: getNextColor(),
			left: '4%',
			top: '54%',
			width: '42%',
			height: '42%'
		}));
		parent.add(Ti.UI.createView({
			backgroundColor: getNextColor(),
			left: '54%',
			top: '4%',
			width: '42%',
			height: '42%'
		}));
		parent.add(Ti.UI.createView({
			backgroundColor: getNextColor(),
			left: '54%',
			top: '54%',
			width: '42%',
			height: '42%'
		}));
	} else {
		createViewGroup(level + 1, tl = Ti.UI.createView({
			left: '4%',
			top: '4%',
			width: '42%',
			height: '42%'
		}));
		createViewGroup(level + 1, bl = Ti.UI.createView({
			left: '4%',
			top: '54%',
			width: '42%',
			height: '42%'
		}));
		createViewGroup(level + 1, tr = Ti.UI.createView({
			left: '54%',
			top: '4%',
			width: '42%',
			height: '42%'
		}));
		createViewGroup(level + 1, br = Ti.UI.createView({
			left: '54%',
			top: '54%',
			width: '42%',
			height: '42%'
		}));
		parent.add(tl);
		parent.add(bl);
		parent.add(tr);
		parent.add(br);
	}
}
createViewGroup(0, container);