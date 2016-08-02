/**
 * Created by redun on 2/08/2016.
 */

var rp = require('request-promise');
var Buffer = require('buffer').Buffer;

var headers = {
    'Authorization' : 'token a4916e38ee85f8d57fdd07dc79d16b1b404402db',
    'User-Agent' : "TDD-Helper"
};

buffer = new Buffer('fiftytwopeeyou:passw0rd', 'utf-8');
rp({
    uri: 'http://api.github.com/user/repos',
    headers: headers,
    json: true
}).then(function(repos){
    //console.log(repos);
}).catch(function(err){
    console.log(err);
})

var ownerUser = 'redunderthebed'; //ctx.body.repository.owner.username
var targetRepo = 'testingtest'; //ctx.body.repository.name
var treeSha = '997523b08251fc35556d3ebbdde323a10e8c3d3c'; //ctx.body.head_commit.tree_id
var commitSha = 'ee7300dc87926ef9b602abd21778ce0d6d0d68b2';//ctx.body.head_commit.id

function checkForTestLabel(labelName) {
    return rp({
        method: 'GET',
        uri: 'http://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/labels/' + labelName,
        headers: headers,
        json: true
    }).then(function(label){
        console.log(label.name + ' has been found');
    }).catch(function(err){
        console.log(labelName, 'was not found');
        ///repos/:owner/:repo/labels
        return rp({
            method: 'POST',
            uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/labels',
            body: {
                name: labelName,
                color: 'ffffff'
            },
            headers: headers,
            json: true
        }).then(function(body){
            console.log(body);
        }).catch(function(err){
            console.log(err);
        });
    });
}

function getTestTree() {
    return rp({
        method: 'GET',
        uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/git/trees/' + treeSha,
        headers: headers,
        json: true
    }).then(function(tree){
        var testTree = tree.tree.find(function(item){
            return item.path == 'test';
        });

        if(testTree){
            console.log('Found test tree', testTree);
            return rp({
                method: 'GET',
                uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/git/trees/' + testTree.sha,
                headers: headers,
                json:true
            })
        }
        else{
            throw new Error('Test tree not found');
        }
    });
}

function decodeFileContents(contents){
    var buf = new Buffer(contents.content, "Base64");
    var fileContents = buf.toString('utf-8');

    return fileContents;
}

function testForExistingIssues(matches, issues){
    console.log("TEST FOR EXISTING", issues);
    issues.forEach(function(issue){
        if(issue.title) {
            console.log(issue.title);
        }
    });
    return matches.filter(function(match) {
        var issue = issues.find(function (item) {
            if (item.title) {
                return item.title.includes(match) == false;
            }
            else {
                return false;
            }
        });
        if(issue) {
            return false;
        }
    });
}

function processTestFile(test){
    //  /repos/:owner/:repo/git/blobs/:sha
    rp({
        method: 'GET',
        uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/git/blobs/' + test.sha,
        headers: headers,
        json: true
    }).then(function(contents){
        var decoded = decodeFileContents(contents);
        var matches = decoded.match(/(?:it\(')([^']*)/g);
        var testNames = matches.map(function(match){
            return match.substring(4);
        });
        rp({
            method: 'GET',
            uri: 'https://api.github.com/repos/' + ownerUser + '/' + targetRepo + '/issues',
            headers: headers,
            json: true
        }).then(function(issues){
            testForExistingIssues(testNames, issues).forEach(function(test){
                rp({
                    method: 'GET',
                    uri: 'https://api.gethub.com/repos/' + ownerUser + '/' + targetRepo + '/issues',
                    body:{
                        title: 'Test: ' + test,
                        labels: ['test'],
                        body: 'New test added to ' + test.path + ', implementation required\n' +
                        'Issue created by webtask.io script'
                    },
                    headers: headers,
                    json: true
                })
            })
        })
    })  
}

checkForTestLabel('test').then(function(){
    getTestTree().catch(function(err){
        console.log("Couldn't find test tree, no test directory?");
        throw(err);
    }).then(function(testTree){
        console.log(testTree.tree);
        testTree.tree.forEach(function (test) {
            console.log('Test:', test.path, test.sha);
            processTestFile(test);
        });
    })
})