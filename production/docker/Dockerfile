# Create a Dockerized API server
#

#IMAGE BUILD COMMANDS
FROM ubuntu:22.04
MAINTAINER Chris Troutner <chris.troutner@gmail.com>

#Update the OS and install any OS packages needed.
RUN apt-get update
RUN apt-get install -y sudo git curl nano gnupg wget zip unzip python3

#Install Node and NPM
RUN curl -sL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install -y nodejs build-essential

#Create the user 'safeuser' and add them to the sudo group.
RUN useradd -ms /bin/bash safeuser
RUN adduser safeuser sudo

#Set password to 'password' change value below if you want a different password
RUN echo safeuser:password | chpasswd

#Set the working directory to be the home directory
WORKDIR /home/safeuser

#Setup NPM for non-root global install
RUN mkdir /home/safeuser/.npm-global
RUN chown -R safeuser .npm-global
RUN echo "export PATH=~/.npm-global/bin:$PATH" >> /home/safeuser/.profile
RUN runuser -l safeuser -c "npm config set prefix '~/.npm-global'"

# Update to the latest version of npm.
#RUN npm install -g npm@8.3.0

# npm mirror to prevent direct dependency on npm.
#RUN npm set registry http://94.130.170.209:4873/

# Switch to user account.
#USER safeuser
# Prep 'sudo' commands.
#RUN echo 'abcd8765' | sudo -S pwd

#RUN npm install -g node-gyp

# Clone the rest.bitcoin.com repository
WORKDIR /home/safeuser
RUN git clone https://github.com/Permissionless-Software-Foundation/psf-bch-api

# Switch to the desired branch. `master` is usually stable,
# and `stage` has the most up-to-date changes.
WORKDIR /home/safeuser/psf-bch-api

# Install dependencies
RUN npm install
RUN npm install minimal-slp-wallet

# Generate the API docs
RUN npm run docs

COPY .env-local .env


CMD ["npm", "start"]

# Used to debug the container.
#COPY temp.js temp.js
#CMD ["node", "temp.js"]
