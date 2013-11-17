

function LoadBinaryResource(url, OnLoadFunction) {
	var req = new XMLHttpRequest();
	req.open('GET', url, true);
	req.responseType = "arraybuffer";
	req.onreadystatechange = function () {
		if (req.readyState != 4) {
			return;
		}
		if ((req.status != 200) && (req.status != 0)) {
			console.log("Error: Could not load file " + url);
			return;
		}
		var arrayBuffer = req.response;
		if (arrayBuffer) {
			OnLoadFunction(arrayBuffer);
		}
	};
	req.send(null);
}

(function() 
{
	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
	window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
	window.requestAnimationFrame = requestAnimationFrame;
})();


function DebugMessage(message) {
	console.log(message);
}
