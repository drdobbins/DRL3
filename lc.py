import flask
import json
import os
import requests


# server = "mainSite" #mainSite for liftingcast.com, "relay" for relay server.
# localServerIP = "192.168.1.160" #if using a relay server, define the IP here.





# meet_id = 'mrzivliqz10r' #liftingcast meet ID
#USAPL Platform IDs
# platform_id = 'pi40bz3ayeqz' #liftingcast platform ID added  at the end.
#define meet password
# password = 'TSS20' #meet password

meet_id = ""
platform_id = ""
password = ""
meet_url = ""
protocol = ""
# these are the URLs used to make requests to liftingcast
light_url = ""
set_clock_url = ""
start_clock_url= ""
reset_clock_url= ""
password_data={}
configured = False # configured being True means meet ID, platform ID, and password have been entered. When this is true the sync icon is drawn on the screen.

# if server == "mainSite":
#     print("Liftingcast Server is: Main Site")
#     meet_url = "liftingcast.com" #main server address
#     protocol = "https://"
#
# elif server == "relay":
#     print("Liftingcast Server is: Relay Server")
#     meet_url = localServerIP #local relay server IP
#     protocol = "http://"


good_sync = False #this variable is checked by the main thread for drawing the sync icons. 
bad_sync = False #this variable is checked by the main thread for drawing the sync icons. 
#-----------------------------------
#these are the URLs used to make requests to liftingcast
# light_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/lights"
# set_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/clock"
# start_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/start_clock"
# reset_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/reset_clock"
# password_data = {"password": password}
#
# print("Light URL:")
# print(light_url)
# print("Set CLock URL")
# print(set_clock_url)
# print("Start Clock URL")
# print(start_clock_url)
# print("Reset Clock URL")
# print(reset_clock_url)
#-------------------------------------

def start_liftingcast_clock():
    global good_sync, bad_sync
    print("Start Clock URL")
    print(start_clock_url)
    try:
        print("ATTEMPTING TO POST CLOCK START TO LIFTINGCAST.....\n")
        print("Start Clock URL")
        print(start_clock_url)
        r = requests.post(start_clock_url,json=password_data, timeout=3) #start the liftingcast clock
        #place_image(good_sync_image, True) #draw the green sync
        # I need to put something in the queu of the main thread letting it know to draw the green sync.
        good_sync = True #this will draw a green sync icon on the main thread. 
    except:
        print("\n\nError when making post request to start the clock\n\n")
        print("Start Clock URL")
        print(start_clock_url)
        bad_sync = True #this will draw a red sync icon on the main thread. 

def reset_liftingcast_clock():
    print("Reset Clock URL")
    print(reset_clock_url)
    r = requests.post(reset_clock_url,json=password_data) #reset the liftingcast clock

def set_liftingcast_clock(time):
    print("Set CLock URL")
    print(set_clock_url)
    global password
    reset_data={"clockTimerLength": time,"password":password} #create the json package to set the clock. 
    r = requests.post(set_clock_url,json=reset_data) #we have to include the time duration on this type of request

def drl_lights_to_liftingcast_decision(white, red, blue, yellow):
    if white:
        return "good"
    else:
        return "bad"

def drl_lights_to_cards(red, blue, yellow):
    return {"red": red, "blue": blue, "yellow": yellow}

def drl_lights_to_decision_cards(white, red, blue, yellow):
    """Takes 4 booleans representing a referee's white light and red, blue, and
    yellow cards and returns a map of decision and cards.
    white, red, blue, yellow
    => {"decision": "good" | "bad",
        "cards": {"red": True | False,
                  "blue": True | False,
                  "yellow": True | False}}
    """
    return {"decision": drl_lights_to_liftingcast_decision(white, red, blue, yellow),
            "cards": drl_lights_to_cards(red, blue, yellow)}

def drl_decisions_to_liftingcast_decisions(left_white,
                                           left_red,
                                           left_blue,
                                           left_yellow,
                                           head_white,
                                           head_red,           
                                           head_blue,
                                           head_yellow,
                                           right_white,
                                           right_red,
                                           right_blue,
                                           right_yellow):
    global password, light_url
    
    liftingCastLights =  {
        "left": drl_lights_to_decision_cards(left_white,
                                             left_red,
                                             left_blue,
                                             left_yellow),
        "head": drl_lights_to_decision_cards(head_white,
                                             head_red,
                                             head_blue,
                                             head_yellow),
        "right": drl_lights_to_decision_cards(right_white,
                                              right_red,
                                              right_blue,
                                              right_yellow),
        "select_next_attempt":True,
        "select_next_attempt_delay":1,
        "clear_lights_delay":3,
        "password":password
    }
    #q.put(liftingCastLights)
    #now we have our json package ready to send, call the proper function to send it. 
    liftingcast_post(light_url, liftingCastLights)


def liftingcast_decisions_to_result(liftingcast_decision_cards_dict):
    """Takes a map of referee to decision and cards and returns a result for the
    lift.
    {"head": {"decision": <decision>, "cards": <cards>},
     "left": {"decision": <decision>, "cards": <cards>},
     "right": {"decision": <decision>, "cards": <cards>}}
    => "good" | "bad"
    """
    num_good_decisions = len([dc["decision"] for dc in liftingcast_decision_cards_dict.values() if dc["decision"] == "good"])

    if num_good_decisions < 2:
        return "bad"
    else:
        return "good"

def are_valid_light_and_cards(white, red, blue, yellow):
    return (not (white and (red or blue or yellow)) and
            (white or red or blue or yellow))

def empty_decisions():
    return {
        "left": {
            "decision": None,
            "cards": {
                "red": None,
                "blue": None,
                "yellow": None
            }
        },
        "head": {
            "decision": None,
            "cards": {
                "red": None,
                "blue": None,
                "yellow": None
            }
        },
        "right": {
            "decision": None,
            "cards": {
                "red": None,
                "blue": None,
                "yellow": None
            }
        }
    }

def liftingcast_post(url,data):

    try:
        r = requests.post(url,json=data)
        print("Referee Data Sent")
        #place_image("network_good.png",2,windo_size[0]/8,windo_size[1]/8)
        #pygame.display.update()
        #time.sleep(1)
    except:
        print ("error sending referee light data, check internet connection")
        #network_error = True
        #place_image("network_bad.png",2,windo_size[0]/8,windo_size[1]/8)
        #pygame.display.update()
        #time.sleep(1)



# Flask app that
# 1. Serves the site that allows the user to select the LiftingCast meet and platform for which this instance of DRL
#    will be used and to enter the LiftingCast password for the meet.
# 2. Receives those values from the site and sets the appropriate variables, to be used in the main thread of DRL.
app = flask.Flask(__name__)

# Endpoint for main Svelte app page
@app.route("/")
def base():
    return flask.send_from_directory("lifting-cast-config-app/public", "index.html")

# Endpoint for assets (compiled JS, CSS, etc.)
@app.route("/<path:path>")
def home(path):
    return flask.send_from_directory("lifting-cast-config-app/public", path)

ACCEPTED = 202
BAD_REQUEST = 400
SERVER_TYPES = ["mainSite", "relay"]

# Receive LiftingCast information to configure DRL for the given meet and platform.
@app.post("/lifting-cast-platform-config")
def lifting_cast_platform_config():
    global meet_id, password, platform_id, meet_url, protocol, light_url, set_clock_url, start_clock_url, reset_clock_url, password_data, configured

    if not flask.request.is_json:
        return flask.jsonify({"msg": "Invalid request"}), BAD_REQUEST

    server_type = flask.request.json.get("server_type", None)
    local_relay_server_ip_address = flask.request.json.get("local_relay_server_ip_address", None)
    meet_id = flask.request.json.get("meet_id", None)
    password = flask.request.json.get("password", None)
    platform_id = flask.request.json.get("platform_id", None)

    if server_type == "mainSite":
        print("Liftingcast server type is: Main Site")
        meet_url = "liftingcast.com"  #main server address
        protocol = "https://"
    elif server_type == "relay":
        print("Liftingcast server type is: Relay Server")
        meet_url = local_relay_server_ip_address #local relay server IP
        protocol = "http://"
    else:
        meet_url = ""
        protocol = ""

    if meet_id is not None \
            and password is not None \
            and platform_id is not None \
            and server_type in SERVER_TYPES \
            and meet_url != "" \
            and protocol != "":
        light_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/lights"
        set_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/clock"
        start_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/start_clock"
        reset_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/reset_clock"
        password_data = {"password": password}
        configured = True
        print("Configured DRL with")
        print(f"  meet_url: {meet_url}")
        print(f"  protocol: {protocol}")
        print(f"  meet_id: {meet_id}")
        print(f"  password: {password}")
        print(f"  platform_id: {platform_id}")
        print(f"`configured` set to `{configured}`")
        print("Light URL:")
        print(light_url)
        print("Set CLock URL")
        print(set_clock_url)
        print("Start Clock URL")
        print(start_clock_url)
        print("Reset Clock URL")
        print(reset_clock_url)

        return flask.jsonify({"msg": "Accepted"}), ACCEPTED
    else:
        configured = False
        msg = f"Insufficient information from config app to configure DRL. Received:\n  server_type: {server_type}\n  local_relay_server_ip_address (required if and only if server_type is 'relay'): {local_relay_server_ip_address}\n  meet_id: {meet_id}\n  password: {password}\n  platform_id: {platform_id}\n  `configured` set to `False`"
        print(msg)
        return flask.jsonify({"msg": msg}), BAD_REQUEST


