/* Copyright (c) 2017 5GTANGO and Paderborn University ALL RIGHTS RESERVED. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Neither the name of 5GTANGO, Paderborn University
nor the names of its contributors may be used to endorse or promote
products derived from this software without specific prior written
permission.

This work has been performed in the framework of the 5GTANGO project,
funded by the European Commission under Grant number 761493 through
the Horizon 2020 and 5G-PPP programmes. The authors would like to
acknowledge the contributions of their colleagues of the 5GTANGO
partner consortium (www.5gtango.eu). */


var defaultVnfd;
var defaultNsd;

// button click
$('#submitBtn').on('click', loadDescriptors);
$('#newBtn').on('click', refresh);
$('#downloadBtn').on('click', download);

// hide newBtn and downloadBtn at the beginning
window.onload = function() {
	document.getElementById('newBtn').style.display = 'none';
	document.getElementById('downloadBtn').style.display = 'none';
}

// reload window to allow creating new descriptors
function refresh() {
	location.reload();
}


// load default VNFD and NSD from GitHub (asynchronous -> set VNFD, NSD and ask for user input when ready)
function loadDescriptors() {
	var vnfdUrl = "https://cdn.rawgit.com/sonata-nfv/tgn-descriptor-generator/c93807fc/default-vnfd.yml";
	var nsdUrl = "https://cdn.rawgit.com/sonata-nfv/tgn-descriptor-generator/c93807fc/default-nsd.yml";
	
	// hide the generate button and input and show the generate new and download buttons
	document.getElementById('input').style.display = 'none';
	document.getElementById('submitBtn').style.display = 'none';
	document.getElementById('newBtn').style.display = 'block';
	document.getElementById('downloadBtn').style.display = 'block';
	
	$.get(vnfdUrl, setVnfd);
	$.get(nsdUrl, setNsd);
	
	return false;			// better to return false after button click
}
function setVnfd(data) {
	defaultVnfd = jsyaml.load(data);
	
	if (typeof defaultNsd != 'undefined')
		editDescriptors();
}
function setNsd(data) {
	defaultNsd = jsyaml.load(data);
	
	if (typeof defaultVnfd != 'undefined')
		editDescriptors();
}


// use provided information to copy and edit the default descriptors
function editDescriptors() {	
	// copy and edit VNFDs
	var vnfds = [];
	defaultVnfd.author = document.getElementById('author').value;
	defaultVnfd.vendor = document.getElementById('vendor').value;
	var numVnfs = Number(document.getElementById('vnfs').value);
	for (i=0; i<numVnfs; i++) {
		vnfds[i] = Object.assign({}, defaultVnfd);		// shallow copy defaultVnfd (enough since VNFDs aren't nested)
		vnfds[i].name = "ubuntu-vnf" + i;
	}	
	
	// copy and edit NSD: general info and involved vnfs
	var nsd = defaultNsd;		// since there's only one NSD, no proper copy needed
	nsd.author = document.getElementById('author').value;
	nsd.vendor = document.getElementById('vendor').value;
	nsd.name = document.getElementById('name').value;
	nsd.description = document.getElementById('description').value;
	
	for (i=0; i<numVnfs; i++) {
		// list involved vnfs
		if (!nsd.network_functions[i])		//create new entry if non-existent
			nsd.network_functions[i] = {};
		nsd.network_functions[i].vnf_id = "vnf" + i;
		nsd.network_functions[i].vnf_name = vnfds[i].name;
		nsd.network_functions[i].vnf_vendor = vnfds[i].vendor;
		nsd.network_functions[i].vnf_version = vnfds[i].version;
		
		// create corresponding vLinks
		nsd.virtual_links[0].connection_points_reference[i] = "vnf" + i + ":mgmt";		// mgmt
		nsd.virtual_links[1].id = "input-2-vnf0";								// input to 1st vnf
		nsd.virtual_links[1].connection_points_reference[1] = "vnf0:input";

		if (!nsd.virtual_links[i+2])		//create new entry if non-existent
			nsd.virtual_links[i+2] = {id:"", connectivity_type:"", connection_points_reference:[]};
		nsd.virtual_links[i+2].connectivity_type = "E-Line";
		nsd.virtual_links[i+2].connection_points_reference[0] = "vnf" + i + ":output";
		if (i != numVnfs-1) {
			nsd.virtual_links[i+2].id = "vnf" + i + "-2-vnf" + (i+1);
			nsd.virtual_links[i+2].connection_points_reference[1] = "vnf" + (i+1) + ":input";
		}
		else {
			nsd.virtual_links[i+2].id = "vnf" + i + "-2-output";
			nsd.virtual_links[i+2].connection_points_reference[1] = "output";
		}
	}
	nsd.virtual_links[0].connection_points_reference[numVnfs] = "mgmt";	
	
	// adjust forwarding graph
	nsd.forwarding_graphs[0].number_of_virtual_links = numVnfs + 1;
	for (i=1; i<nsd.virtual_links.length; i++)		// skip 1st vLink (mgmt)
		nsd.forwarding_graphs[0].constituent_virtual_links[i-1] = nsd.virtual_links[i].id;
	for (i=0; i<numVnfs; i++)
		nsd.forwarding_graphs[0].constituent_vnfs[i] = "vnf" + i;
	var pos = 0;
	// take in- and output of each vLink
	for (i=1; i<nsd.virtual_links.length; i++) {		// skip 1st vLink (mgmt)
		nsd.forwarding_graphs[0].network_forwarding_paths[0].connection_points[pos] = {connection_point_ref: nsd.virtual_links[i].connection_points_reference[0], position: pos+1};
		pos++;
		nsd.forwarding_graphs[0].network_forwarding_paths[0].connection_points[pos] = {connection_point_ref: nsd.virtual_links[i].connection_points_reference[1], position: pos+1};
		pos++;
	}
	
	globalNsd = nsd;
	
	showDescriptors(nsd, vnfds);
}


// show the edited descriptors for further editing and copying
function showDescriptors(nsd, vnfds) {	
	// print instructions
	document.getElementById('info').innerHTML = "Please edit, copy, and paste the generated descriptors below as needed.";
	
	// print NSD
	var nsdHeader = document.getElementById('nsd');
	nsdHeader.innerHTML = "NSD";
	var nsdCode = document.getElementById('nsd-code');
	addCode(nsd, nsdCode);
	addDownloadButton("nsd", nsd, nsdCode);
	
	// print VNFDs
	var vnfdHeader = document.getElementById('vnfds');
	vnfdHeader.innerHTML = "VNFDs";
	var vnfdCode = document.getElementById('vnfd-code');
	for (i = 0; i < vnfds.length; i++) {
		var vnfdSubheader = document.createElement('h3');
		vnfdSubheader.innerHTML = "VNFD " + i;
		vnfdCode.appendChild(vnfdSubheader);
		addCode(vnfds[i], vnfdCode);
		addDownloadButton("vnfd" + i, vnfds[i], vnfdCode);
	}
}


// add the specified code in an editable text field
function addCode(descriptorCode, parentNode) {
	var code = document.createElement('pre');
	code.className = "prettyprint lang-yaml";
	code.setAttribute("contentEditable", "true");
	code.innerHTML = jsyaml.safeDump(descriptorCode);
	parentNode.appendChild(code);
}


// add a download button for the specified descriptor
function addDownloadButton(name, descriptor, parentNode) {
	var downloadBtn = document.createElement('button');
	downloadBtn.id = name.toLowerCase() + "DownloadBtn";
	downloadBtn.className = "btn btn-primary btn-block";
	downloadBtn.type = "button";
	downloadBtn.innerHTML = "Download " + name.toUpperCase();
	downloadBtn.addEventListener('click', function() {
		download(jsyaml.safeDump(descriptor), name.toLowerCase() + ".yaml");
	});
	parentNode.appendChild(downloadBtn);
}


// trigger download of a file with the specified data and filename
// adapted from https://stackoverflow.com/a/30832210/2745116
function download(data, filename, type = "text/plain") {
    var file = new Blob([data], {type: type});
	var a = document.createElement("a"), url = URL.createObjectURL(file);
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	setTimeout(function() {
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);  
	}, 0); 
}
	
	