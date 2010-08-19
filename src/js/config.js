/***
 * APE JSF Setup
 */
APE.Config.baseUrl = 'http://chat.thehelper.test/lib/APE_JSF'; //APE JSF 
APE.Config.domain = 'chat.thehelper.test'; 
APE.Config.server = 'ape.phyrex1an.net:6969'; //APE server URL

APE.Config.scripts = [APE.Config.baseUrl + '/Build/uncompressed/apeCoreSession.js'];

APE.Config.transport = 2; // Cross domain requires JSONP, this is not ideal
