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
	});

testList.addEventListener('click', function (e) {
	var test = tests[e.index];
	if (test) {
		require(test.url).run(test.title);
	}
});

win.add(testList);
win.open();