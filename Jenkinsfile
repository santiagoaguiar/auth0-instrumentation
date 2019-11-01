def npmInstall = {
  withArtifactoryNPM {
    sshagent(['auth0extensions-ssh-key']) {
      sh """
        export npm_config_cache=/tmp
        npm install
      """
    }
  }
}
def runTests = {
  try {
    sh "npm test"
    githubNotify context: 'jenkinsfile/auth0/tests', description: 'Tests passed', status: 'SUCCESS'
  } catch (error) {
    githubNotify context: 'jenkinsfile/auth0/tests', description: 'Tests failed', status: 'FAILURE'
    throw error
  }
}

def nodeVersions = ['8', '10', '12']

def stageNodeVersion(version) {
  return {
    agent {
      docker {
        image "node:${version}"
        args '-v /etc/passwd:/etc/passwd:ro -v /var/lib/jenkins/.ssh:/var/lib/jenkins/.ssh:ro'
      }
    }
    stages {
      stage('Install') {
        steps {
          script {
            npmInstall()
          }
        }
      }
      stage('Test') {
        steps {
          script {
            runTests()
          }
        }
      }
    }
  }
}

stepsForParallel = [:]
nodeVersions.each {
  stepsForParallel["node v${it}"] = stageNodeVersion(it)
}

pipeline {
  agent {
    label 'crew-brokkr'
  }

  options {
    timeout(time: 10, unit: 'MINUTES')
    buildDiscarder(logRotator(daysToKeepStr: '30'))
  }

  parameters {
    string(name: 'SlackTarget', defaultValue: '#sre-build', description: 'Target Slack Channel for master notifications')
  }

  stages {
    stage('SharedLibs') { // Required. Stage to load the Auth0 shared library for Jenkinsfile
      steps {
        library identifier: 'auth0-jenkins-pipelines-library@master', retriever: modernSCM(
          [$class: 'GitSCMSource',
          remote: 'git@github.com:auth0/auth0-jenkins-pipelines-library.git',
          credentialsId: 'auth0extensions-ssh-key'])
      }
    }
    stage('node lts') {
      agent {
        docker {
          image "node:12"
          args '-v /etc/passwd:/etc/passwd:ro -v /var/lib/jenkins/.ssh:/var/lib/jenkins/.ssh:ro'
        }
      }
        stages {
          stage('Install') {
            steps {
              script {
                npmInstall()
              }
            }
          }
          stage('Test') {
            steps {
              script {
                runTests()
              }
            }
          }
        }
      }
    }

  post {
    always {
      script {
        String additionalMessage = '';
        additionalMessage += "\nPR: ${env.CHANGE_URL}\nTitle: ${env.CHANGE_TITLE}\nAuthor: ${env.CHANGE_AUTHOR}";
        notifySlack(params.SlackTarget, additionalMessage);
      }
    }
    cleanup {
      deleteDir()
    }
  }
}
