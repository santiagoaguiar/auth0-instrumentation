@Library('auth0') _

/*
NOTES: 

* Some extra work is done for v8 in build step to get npm version to handle aliases.
* Node 10 runs in xunit mode with coverage. Treated it special because:
  * Current LTS
  * v12 has deprecation warnings that screw up test parsing
  * mocha multi reporter story sucks - still having spec is nice for human debugging.
*/


def nodeVersions = ['8', '10', '12'] // versions to test

def stages = [:]
nodeVersions.each { version -> // define stages
  stages["node v${version}"] = createStage(version, {
    stage("node v${version}: Build") {
      cleanInstall(version)
    }
    stage("node v${version}: Test") {
      runTests(version)
    }
  })
}

// pipeline
node('crew-sre') {
  auth0Wrap() {
    try {
      parallel stages
    } catch(err) {
      currentBuild.result = 'FAILURE'
      throw err
    } finally {
      validateAndPublishArtifact()
      publishReports()
      updateSlack()
      deleteDir()
    }
  }
}

/*
-----------------------------
Helpers Functions
-----------------------------
*/


def createStage(String version, Closure cls) {
  return {
    sh("mkdir -p temp/v${version}")
    dir("temp/v${version}") {
      deleteDir()
      docker.image("node:${version}").inside("-e HOME='.'") {
        checkout scm
        sh "git clean -fdx"
        withArtifactoryNPM {
          cls()
        }
      }
    }
  }
}

def runTests(String version) {
  try {
    def npmCmd = getNpm(version)

    if (version == '10') {
      sh "${npmCmd} run coverage"
    } else {
      sh "${npmCmd} test"
    }

    githubNotify context: 'jenkinsfile/auth0/tests', description: 'Tests passed', status: 'SUCCESS'
  } catch (error) {
    githubNotify context: 'jenkinsfile/auth0/tests', description: 'Tests failed', status: 'FAILURE'
    throw error
  }
}

def cleanInstall(version) {
  def npmCmd = getNpm(version)
  sh "npm config set loglevel error"
  sh "export npm_config_cache=/tmp"
  
  if(version == '8') {
    sh 'mkdir `pwd`/.npm-global'
    sh 'npm config set prefix "`pwd`/.npm-global"'
    sh "NPM_CONFIG_PREFIX=`pwd`/.npm-global"
    sh "npm install -g npm@6"
  }

  sh "${npmCmd} install"
}

def getNpm(version) {
  echo "NODE VERSION: ${version}"
  if (version == '8') {
    return './.npm-global/bin/npm' 
  } else {
    return 'npm'
  }
}

def publishReports() {
  dir("temp/v10") {
    publishHTML (target: [
      allowMissing: true,
      alwaysLinkToLastBuild: false,
      keepAll: true,
      reportDir: 'coverage',
      reportFiles: 'index.html',
      reportName: "Code Coverage"
    ])
  }
}

def updateSlack() {
  String additionalMessage = '';
  additionalMessage += "\nPR: ${env.CHANGE_URL}\nTitle: ${env.CHANGE_TITLE}\nAuthor: ${env.CHANGE_AUTHOR}";
  additionalMessage += "\n" + junitResultsToString('temp/v10/xunit.report.xml');
  notifySlack('#sre-build', additionalMessage);
}

def validateAndPublishArtifact() {
  try {
    if(currentBuild.currentResult == 'SUCCESS' && env.BRANCH_NAME == 'master') {
      dir("temp/v10") {
        docker.image("node:10").inside("-e HOME='.'") {
          withArtifactoryNPM {
            sh """
              export npm_config_cache=/tmp
              npm run release
            """
          }
        }
      }
    }
  } catch (err) {
    currentBuild.result = 'FAILURE'
    currentBuild.currentResult == 'FAILURE'
  }
}

def auth0Wrap(Closure cl) {
  timeout(time: 10, unit: 'MINUTES') {
    ansiColor('xterm') {
      withCredentials([string(credentialsId: 'auth0extensions-token', variable: 'GITHUB_TOKEN')]) {
        sshagent(['auth0extensions-ssh-key']) {
          cl()
        }
      }
    }
  }
}
