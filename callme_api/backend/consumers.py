import json
from channels.generic.websocket import AsyncWebsocketConsumer


class WebRTCSignaller(AsyncWebsocketConsumer):
    
    # map_channel_names = {}
    room_group_name = "myroom"
    async def connect(self):

        username = self.scope['url_route']['kwargs']['username']
        room = self.scope['url_route']['kwargs']['room']
        self.room_group_name = "room_" + room
        print('Connection stablished with:')
        print(self.room_group_name)
        print(self.channel_name)
        print('username', username)
        print('room', room)
        # self.map_channel_names[username] = self.channel_name
        print('-'*50)
        await self.channel_layer.group_add("room_" + room, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        path = self.scope["path"]
        peer = path.split("/")[-1]
        signal = {
            "peer": peer,
            "action": "disconnect",
            "message":{}
        }
        room = self.scope['url_route']['kwargs']['room']
        await self.channel_layer.group_send(
            "room_" + room,
            {
                'type': 'send_sdp', 
                'message': {
                            'type': 'send_sdp', 
                            'message': signal
                            }
            }
        )
        # self.map_channel_names = {key: value for key, value in self.map_channel_names.items() if value != self.channel_name}
        await self.channel_layer.group_discard("room_"+room, self.channel_name)
    
    async def receive(self, text_data):
        # print(text_data)
        message = json.loads(text_data)['message']
        
        action = message['action'] # action which the sender is doing
        print(message)
        if action=='new-peer':
            message['message']['receiver_channel_name'] = self.channel_name
            room = self.scope['url_route']['kwargs']['room']
            print("room received->", room)
            await self.channel_layer.group_send(
                "room_" + room,
                {
                    'type': 'send_sdp', 
                    'message': message
                }
            )
        elif action in ['sdp-offer', 'sdp-answer', 'icecandidate']:
            # the user who sent the 'new-peer' request
            receiver_channel_name = message['message']['receiver_channel_name']
            # the user(camera) who sent the 'sdp-offer'
            message['message']['receiver_channel_name'] = self.channel_name
            await self.channel_layer.send(
                receiver_channel_name,
                {
                    'type': 'send_sdp', 
                    'message': message
                }
            )
        # elif action=="disconnect":
        #     peers = message["message"]
        #     for peer_id in peers["peers_id"]:
        #         channel = self.map_channel_names[peer_id] 
        #         message['message'] = {"receiver_channel_name":self.channel_name}

        #         await self.channel_layer.send(
        #             channel,
        #             {
        #                 'type': 'send_sdp', 
        #                 'message': message
        #             }
        #         )

    async def send_sdp(self, event):
        message = event['message']
        print("send sdp->", message)
        if self.channel_name != message['message']['receiver_channel_name']:
            await self.send(
                text_data=json.dumps(
                    {'message': message}
                )
            )
          