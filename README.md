# simple google meet
This is repository is an example implementation of Webrtc using reactjs and backend of django and django channels. currently this app does not need any signin or signup and users create a room a=and choose a username of their choice and wait for their peers to join the same room.
The project has been successfully deployed on an ubuntu 20.04 VPS and you can test and enjoy it using [this link](https://callme.icanapp.name/). have in mind chrome and other browser will not let camera and mic access over http outside the local network.

## Usage

### Create a python environment
```
python3 -m venv mvenv
source mvenv/bin/activate
```
### Install python Requirements
Before running update your redis url and ```ALLOWED_HOSTS``` inside your ```settings.py```
```
pip install django==3.2.4   
pip install channels==3.0.1
pip install channels-redis
# to run django server
python3 manage.py runserver 0.0.0.0:8000
```

### Install Nodejs Requirements
Add a .env file to root directory of callme_app folder and add your ```REACT_APP_WEBOSCKET_URL``` inside the file, for example: ```REACT_APP_WEBOSCKET_URL=ws://localhost:8000/ws0/signal```

```
# I am using nodejs 18.16.1
cd callme_app/
npm run install
# for deployin gon the server
npm run build
# to test on localhost
npm start
```


