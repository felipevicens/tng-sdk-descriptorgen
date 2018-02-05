describe('tng-sdk-descriptorgen output', function() {  
	beforeEach(function() {
		// wait 2s for descriptors to generate and load
		browser.get('');
		element(by.id('submitBtn')).click();
		browser.driver.sleep(2000);
	});

	
	// all output tests are based on the default inputs!
	it('should generate and show the descriptors', function() {	
		expect(element(by.id('info')).getText()).toEqual('Please edit, copy & paste, or download the descriptors below as needed.');
		var codeBlocks = element.all(by.className('prettyprint lang-yaml'));
		expect(codeBlocks.first().getAttribute('id')).toEqual('nsdCode');
		expect(codeBlocks.count()).toEqual(3);		// default: 1 NSD + 2 VNFDs
	});
	
	// non-trivial:
	// TODO: check correctness of generated descriptors? 
	// TODO: check if descriptors can be modified?
	// TODO: check downloads
	
	it('should allow starting anew to generate new descriptors', function() {
		element(by.id('newBtn')).click();
		browser.driver.sleep(1000);
		expect(element(by.id('info')).getText()).toEqual('Please provide the following information or keep the default values.');
	});
});
