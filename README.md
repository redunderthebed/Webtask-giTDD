# testingtest
Script to upload mocha tests as issues to a github

This script is intended to be used with Auth0's webtask environment. For more information on webtasks and how they work visit 
https://webtask.io/. The script is intended to relieve some of the administrative overhead of running a TDD project. It receives a 
response from a github repository's push webhook, checks the commit for new tests and adds issues to the repository for the tests
to be implemented. This means that each test can be assigned to a member of your development team to be addressed.

The script will look for a folder called test in the root directory of the project and process any files in there as potentially
being tests. This was designed to work in conjunction with mocha, so it will identify any call to it('whatever test name' as being 
a test.

#Installation

In order to connect this script to your github repository you will first need to install the wt cli client. As follows

```
npm install wt-cli -g
```

Then initialise a webtask container

```
npm wt-init youremail@address.com 
```

And then establish a new web task using the following command

```
wt create webhook.js
```

You should receive a response like

```
You can access your webtask at the following url:

https://webtask.it.auth0.com/api/run/wt-youremail-address_com-0/webhook?webtask_no_cache=1
```


Now go to your github repository, click on the settings tab, then webhooks & services. 
Click the add webhook button.

Set the Payload URL to the URL you received from the wt create command

```
https://webtask.it.auth0.com/api/run/wt-youremail-address_com-0/webhook?webtask_no_cache=1
```

Set it to respond to the push event only and create the webhook.

Now you are ready to start uploading tests. 
