/**
 * Created by redunderthebed on 2/08/2016.
 */

//Include request-promise library for making promise based HTTP requests
var rp = require('request-promise');

//Include string buffer to help with Base64 encoding
var Buffer = require('buffer').Buffer;

//Create a new Buffer of username and password credentials
buffer = new Buffer('ourusernamegoeshere:passwordhere', 'utf-8');


//Create headers object to be reused for each request
var headers = {
    'Authorization' : 'basic ' + buffer.toString('Base64'), //username:password string in Base64
    'User-Agent' : "TDD-Helper"
};

//Variables for API parameters, will be filled later from the github webhook request
var ownerUser = null;
var targetRepo = null;
var treeSha = null;
var commitSha = null;


/**
 * Attempts to get the specified label name from the API, if it fails, it creates it
 * @param labelName The label that should be assigned to test issues
 * @return {Promise}
 */
function checkForTestLabel(labelName) {
    //Check for label
    return rp({
        method: 'GET',
        uri: 'http://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/labels/' + labelName,
        headers: headers,
        json: true
    }).then(function(label){
        console.log(label.name + ' has been found');
    }).catch(function(err){
        //Request failed, attempt to create the label
        console.log(labelName, 'was not found');

        //Create the label through API
        return rp({
            method: 'POST',
            uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/labels',
            //Specify label properties in POST parameters
            body: {
                name: labelName, //name of label
                color: 'ffffff' //color of label tag
            },
            headers: headers,  //include headers (authorization)
            json: true
        }).then(function(body){
            console.log("printing body", body);
        }).catch(function(err){
            console.log('failing here');
            console.log(err.statusCode, err.error);
        });
    });
}

/**
 * Gets the tree from the push event and attempts to navigate to the test folder
 * @returns {*}
 */
function getTestTree() {
    //Get initial tree
    return rp({
        method: 'GET',
        uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/git/trees/' + treeSha,
        headers: headers,
        json: true
    }).then(function(tree){
        //Find an item in the tree who's path is test
        var testTree = tree.tree.find(function(item){
            return item.path == 'test';
        });

        //If test tree was found, get the full details
        if(testTree){
            console.log('Found test tree', testTree);
            //Return promise so next method can carry on
            return rp({
                method: 'GET',
                uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/git/trees/' + testTree.sha,
                headers: headers,
                json:true
            })
        }
        else{
            //testTree wasn't found, throw error to abort
            throw new Error('Test tree not found');
        }
    });
}

/**
 * Accepts a contents object for a blob file
 * @param contents A blob file object
 * @returns {String} Decoded file contents
 */
function decodeFileContents(contents){
    //Load encoded file contents string into buffer, mark as Base64
    var buf = new Buffer(contents.content, "Base64");
    //Convert to utf-8
    var fileContents = buf.toString('utf-8');

    return fileContents;
}

/**
 * Compares an array of test names and an array of existing issues to find which tests need to be added
 * @param matches Array of test names matched from file contents
 * @param issues Array of issue objects fetched from repository
 * @returns {Array.<T>|Array|*} An array of test names that don't have issues yet
 */
function testForExistingIssues(matches, issues){
    console.log("Found", issues.length, "issues");
    issues.forEach(function(issue){
        if(issue.title) {
            console.log(issue.title);
        }
    });
    console.log('matches', matches);
    //Filter out matches that have an issue already
    var filtered = matches.filter(function(match) {

        //Find an issue that matches the test name
        var issue = issues.find(function (item) {
            //issues object has a meta object at the end of the array, must filter this out
            if (item.title) {
                return item.title == "Test: " + match;
            }
            else {
                return false;
            }
        });
        //Select the match if no existing issue could be found
        return issue === undefined;
    });
    console.log(filtered);
    return filtered;
}

/**
 * Processes a test file from a commit, decodes its contents and creates issues for any tests that do not already have
 * issues in the repository
 * @param test the test stub retrieved from the tree
 * @returns {Promise}
 */
function processTestFile(test){
    //Fetch full file data
    return rp({
        method: 'GET',
        uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/git/blobs/' + test.sha,
        headers: headers,
        json: true
    }).then(function(contents){
        //decode file contents
        var decoded = decodeFileContents(contents);

        //Use regex to detect it('whatever test name'
        var matches = decoded.match(/(?:it\(')([^']*)/g);
        //Cut out the first 4 characters "it('" of each match
        var testNames = matches.map(function(match){
            return match.substring(4);
        });
        //Fetch issues from repository
        return rp({
            method: 'GET',
            uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/issues',
            headers: headers,
            json: true
        }).then(function(issues){
            //Filter out test that already have issues
            testForExistingIssues(testNames, issues)
                //Create issues for all remaining tests
                .forEach(function(test){
                rp({
                    method: 'POST',
                    uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/issues',
                    body:{
                        title: 'Test: ' + test,
                        labels: ['test'],
                        body: 'New test added to ' + test.path + ', implementation required\n' +
                        'Issue created by webtask.io script'
                    },
                    headers: headers,
                    json: true
                }).then(function(response){
                    console.log("Created new issue for test '" + test + "'");
                })
            })
        })
    })
}

module.exports = function(ctx, cb) {

    //Fetch push information from the webhook response
    ownerUser = ctx.body.repository.owner.name; //Owner of the repo
    targetRepo = ctx.body.repository.name;      //Name of the repo
    treeSha = ctx.body.head_commit.tree_id;     //SHA id of the head tree object from push
    commitSha = ctx.body.head_commit.id;        //SHA id of the head commit

    //Print out values to ensure they were copied correctly
    console.log('Owner:', ownerUser, 'Target Repository:', targetRepo, 'Head Tree SHA:', treeSha, 'Head Commit SHA:', commitSha);

    //Make sure the label used to mark tests exists
    checkForTestLabel('test').then(function () {
        //Navigate the head tree until we find the test directory
        getTestTree().catch(function (err) {
            console.log("Couldn't find test tree, no test directory?");
            throw(err);
        }).then(function (testTree) {
            console.log(testTree.tree);
            //Process every file in the directory, collect promises in an array
            var promises = testTree.tree.map(function (test) {
                console.log('Test:', test.path, test.sha);
                return processTestFile(test);
            });

            //Wait until all the promises have been completed
            return Promise.all(promises).then(function () {
                console.log("Updated issues ok");
                //Run callback to let wt know we are finished and everything is ok
                cb(null, "ok");
            }).catch(function(err){
                console.log("failed to create an issue", err.statusCode, err.error);
            })
        }).catch(function (err) {
            console.log("Failed to update issues:", err.statusCode, err.error);
            //Something went wrong, return error to callback
            cb(err, "not ok");
        })
    })
};