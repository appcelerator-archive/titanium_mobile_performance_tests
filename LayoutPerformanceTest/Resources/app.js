/*global Ti*/
Ti.UI.setBackgroundColor('#000');

var win = Ti.UI.createWindow({
		backgroundColor:'#fff'
	}),
	tests = [{
			title: 'Test 1 - Wide and Shallow',
			url: 'tests/1'
		},{
			title: 'Test 2 - Narrow and Deep',
			url: 'tests/2'
		},{
			title: 'Test 3 - SIZE stress',
			url: 'tests/3'
		},{
			title: 'Test 4 - FILL stress',
			url: 'tests/4'
		}],
	testList = Ti.UI.createTableView({
		data: tests
	}),
	loadingScreen = Ti.UI.createView({
		visible: false
	});

loadingScreen.add(Ti.UI.createView({
	backgroundColor: '#000',
	opacity: 0.5
}));
loadingScreen.add(Ti.UI.createLabel({
	text: 'Loading Test...',
	backgroundColor: '#fff',
	borderWidth: 1,
	borderColor: '#000',
	width: '50%',
	height: '10%',
	textAlign: Ti.UI.TEXT_ALIGNMENT_CENTER
}));

testList.addEventListener('click', function (e) {
	var test = tests[e.index],
		testInstance;

	loadingScreen.visible = true;
	console.debug('\n*****************\nStarting test ' + test.title);

	setTimeout(function () {
		testInstance = require(test.url);
		testInstance.init();
		loadingScreen.visible = false;
		setTimeout(function () {
			testInstance.run(1000, 100);
		}, 0);
	}, 0);
});

win.add(testList);
win.add(loadingScreen);
win.open();