/***
 * APE JSF Setup
 */
APE.Config.baseUrl = 'http://chat.thehelper.test/APE_JSF'; //APE JSF 
APE.Config.domain = 'chat.thehelper.test'; 
APE.Config.server = 'ape.phyrex1an.net:6969'; //APE server URL

APE.Config.transport = 2; // Cross domain requires JSONP, this is not ideal


(function(){
	for (var i = 0; i < arguments.length; i++)
		APE.Config.scripts.push(APE.Config.baseUrl + '/Source/' + arguments[i] + '.js');
})('mootools-core', 'Core/APE', 'Core/Events', 'Core/Core', 'Pipe/Pipe', 'Pipe/PipeProxy', 'Pipe/PipeMulti', 'Pipe/PipeSingle', 'Request/Request','Request/Request.Stack', 'Request/Request.CycledStack', 'Transport/Transport.longPolling','Transport/Transport.SSE', 'Transport/Transport.XHRStreaming', 'Transport/Transport.JSONP', 'Transport/Transport.WebSocket', 'Core/Utility', 'Core/JSON');
