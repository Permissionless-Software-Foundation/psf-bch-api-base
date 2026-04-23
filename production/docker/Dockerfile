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
RUN git clone https://github.com/Permissionless-Software-Foundation/psf-bch-api-base

# Switch to the desired branch. `master` is usually stable,
# and `stage` has the most up-to-date changes.
WORKDIR /home/safeuser/psf-bch-api-base

#RUN git checkout round-robin-facilitator

# Install dependencies
RUN npm install
#RUN npm install minimal-slp-wallet

# Runtime entrypoint + apidoc URL patch (see production/docker/entrypoint.sh).
# API docs are generated at container start so APIDOC_URL can be set per deployment.
COPY production/docker/entrypoint.sh /home/safeuser/psf-bch-api/entrypoint.sh
COPY scripts/patch-apidoc-from-env.js /home/safeuser/psf-bch-api/scripts/patch-apidoc-from-env.js
RUN chmod +x /home/safeuser/psf-bch-api/entrypoint.sh

# Runtime `.env` is provided by docker-compose (mount at psf-bch-api/.env), not baked into the image.

ENTRYPOINT ["/home/safeuser/psf-bch-api/entrypoint.sh"]

# Used to debug the container.
#COPY temp.js temp.js
#CMD ["node", "temp.js"]
