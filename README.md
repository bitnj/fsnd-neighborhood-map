## Udacity Neighborhood Map project

This project implements the Neighborhood Map project from the Udacity Fullstack
Nanodegree accoring to the rubric provided here: [Project Rubric](https://review.udacity.com/#!/rubrics/17/view)

The project uses the following tools:

1. Knockout 
  * a lightweight JavaScript MVVM library that is a requirement of the project. 
2. Google Maps API
3. NYT Arcticle Search API  
4. Foursquare API  
5. Grunt
  * a JavaScript task-runner.  Not a project requirement, but was used to run
      linting, create minified files, and to populate the dist directory from
      src.

## Getting Started

First download the git repository and maintain the directory structure.

This project was developed on a local Ubuntu 16.04LTS machine. No provisioned
virtual machine is provided here.

## Knockout
The project depends on *Knockout* so this must be installed to successfully run
the code. 

#### The project has been updated to provide Knockout via CDN so that local installation is not required.

Alternatively, to have Knockout installed locally type to following in the root
of the project directory:

Linux:
  * sudo npm install knockout
Mac
  * bower install knockout

The src attribute of the script in Index.html would need to be updated to point
to the local knockout.js.


## Grunt
The project also utilizes the Grunt task-runner though it is not a requirement
of the rubric.  In order to utilize the Grunt functionality the following are
required.

In the root of the project directory type:

  * sudo npm install -g grunt-cli
  * sudo npm install grunt-contrib-clean --save-dev 
  * sudo npm install grunt-contrib-copy --save-dev 
  * sudo npm install grunt-contrib-jshint --save-dev 
  * sudo npm install grunt-contrib-uglify --save-dev 
  * sudo npm install grunt-htmllint --save-dev 
  * sudo npm install grunt-mkdir --save-dev 
  * sudo npm install htmllint --save-dev 
  * sudo npm install load-grunt-tasks --save-dev

To run the Grunt tasks, simply type grunt at the command line in the project
directory.

