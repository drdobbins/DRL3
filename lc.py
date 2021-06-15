import flask
import json
import os
import requests


def make_meet_url_and_protocol(server_type, local_relay_server_ip_address):
    if server_type == "mainSite":
        print("Liftingcast server type is: Main Site")
        meet_url = "liftingcast.com"  # main server address
        protocol = "https://"
    elif server_type == "relay":
        print("Liftingcast server type is: Relay Server")
        meet_url = local_relay_server_ip_address  # local relay server IP
        protocol = "http://"
    else:
        meet_url = ""
        protocol = ""

    return meet_url, protocol


def set_lifting_cast_config_variables(dict):
    global server_type, local_relay_server_ip_address, meet_id, password, platform_id, meet_url, protocol

    server_type = dict.get("server_type", "")
    local_relay_server_ip_address = dict.get("local_relay_server_ip_address", "")
    meet_id = dict.get("meet_id", "")
    password = dict.get("password", "")
    platform_id = dict.get("platform_id", "")
    meet_url, protocol = make_meet_url_and_protocol(server_type, local_relay_server_ip_address)

    print("server_type: " + server_type)
    print("local_relay_server_ip_address: " + local_relay_server_ip_address)
    print("meet_id: " + meet_id)
    print("platform_id: " + platform_id)
    print("password: " + password)
    print("meet_url: " + meet_url)
    print("protocol: " + protocol)


def set_lifting_cast_urls(meet_url, password, meet_id, platform_id):
    global light_url, set_clock_url, start_clock_url, reset_clock_url, password_data
    # these are the URLs used to make requests to liftingcast
    light_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/lights"
    set_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/clock"
    start_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/start_clock"
    reset_clock_url = protocol + meet_url + "/api/meets/" + meet_id + "/platforms/" + platform_id + "/reset_clock"
    password_data = {"password": password}

    print("Light URL:")
    print(light_url)
    print("Set CLock URL")
    print(set_clock_url)
    print("Start Clock URL")
    print(start_clock_url)
    print("Reset Clock URL")
    print(reset_clock_url)


configured = False # configured being True means meet ID, platform ID, and password have been entered. When this is true the sync icon is drawn on the screen.
LIFTING_CAST_CONFIG_FILE = "/home/pi/Desktop/DRL3/lifting_cast_config.json"

server_type = ""
local_relay_server_ip_address = ""
meet_id = ""
password = ""
platform_id = ""
meet_url = ""
protocol = ""

# these are the URLs used to make requests to liftingcast
light_url = ""
set_clock_url = ""
start_clock_url= ""
reset_clock_url= ""
password_data={}

try:
    with open(LIFTING_CAST_CONFIG_FILE, "r") as f:
        LIFTING_CAST_CONFIG_DATA_AT_STARTUP = json.load(f)

    print("Read initial config from" + LIFTING_CAST_CONFIG_FILE)
    set_lifting_cast_config_variables(LIFTING_CAST_CONFIG_DATA_AT_STARTUP)
    set_lifting_cast_urls(meet_url, password, meet_id, platform_id)
    configured = True # configured being True means meet ID, platform ID, and password have been entered. When this is true the sync icon is drawn on the screen.
except OSError:
    print(LIFTING_CAST_CONFIG_FILE + " not found at startup. This file will be created when DRL is configured through the config web app and DRL will attempt to read the initial LiftingCast config from the file on next startup.")

good_sync = False #this variable is checked by the main thread for drawing the sync icons.
bad_sync = False #this variable is checked by the main thread for drawing the sync icons. 
#-----------------------------------

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

# This is a workaround for Flask 0.12.1, used on the DRL Pi.
# Calling `flask.jsonify` resulted in AttributeError: 'Request' object has no attribute 'is_xhr'
# Source: https://stackoverflow.com/questions/60992849/attributeerror-request-object-has-no-attribute-is-xhr
# This is caused by request.is_xhr having been removed by a flask dependency, Werkzeug, and affects the combination of
# Flask <= 0.12.4 and Werkzeug >=1.0.0.
# The stacktrace shows
#   File "/Users/cort/Projects/DRL3/.venv/lib/python3.8/site-packages/flask/json.py", line 251, in jsonify
#     if current_app.config['JSONIFY_PRETTYPRINT_REGULAR'] and not request.is_xhr:
# so a workaround is to short circuit that `and` as per the following:
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False


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
@app.route("/lifting-cast-platform-config", methods=["POST"])
def lifting_cast_platform_config():
    global server_type, local_relay_server_ip_address, meet_id, password, platform_id, meet_url, protocol, light_url, set_clock_url, start_clock_url, reset_clock_url, password_data, configured

    if not flask.request.is_json:
        return flask.jsonify({"msg": "Invalid request"}), BAD_REQUEST

    # This is a workaround for Flask 0.12.1, used on the DRL dev Pi, dev3, with Python 3.8.1.
    # The DRL dev Pi, dev3, runs Python 3.5.3. Installing that on my Mac fails for some reason so I'm using 3.8.1, which
    # is the oldest Python I had handy.
    #     (DRL dev Pi) Python 3.5.3 + Flask 0.12.1 => `flask.request.json` works correctly
    #     (Cort's Mac) Python 3.8.1 + Flask 2.0.1  => `flask.request.json` works correctly
    #     (Cort's Mac) Python 3.8.1 + Flask 0.12.1 => `flask.request.json` has the value `(Ellipsis, Ellipsis)`
    #
    # I want to be able to run this both on my Mac and on the DRL dev Pi so I'm using the following workaround that I
    # found while inspecting the request in the debugger:
    # `flask.request.data` is a binary string of the request JSON.
    request_json = json.loads(flask.request.data.decode("utf-8"))
    set_lifting_cast_config_variables(request_json)

    if meet_id != "" \
            and password != "" \
            and platform_id != "" \
            and server_type in SERVER_TYPES \
            and meet_url != "" \
            and protocol != "":
        set_lifting_cast_urls(meet_url, password, meet_id, platform_id)
        configured = True
        print("`configured` set to {}".format(configured))

        try:
            with open(LIFTING_CAST_CONFIG_FILE, "w") as f:
                json.dump(request_json, f)
        except FileNotFoundError:
            print("Warning: Could not open/create file at {} to persist LiftingCast config info.".format(LIFTING_CAST_CONFIG_FILE))

        return flask.jsonify({"msg": "Accepted"}), ACCEPTED
    else:
        configured = False
        msg = "Insufficient information from config app to configure DRL. Received:\n  server_type: {}\n  local_relay_server_ip_address (required if and only if server_type is 'relay'): {}\n  meet_id: {}\n  password: {}\n  platform_id: {}\n  `configured` set to `False`".format(
            server_type,
            local_relay_server_ip_address,
            meet_id,
            password,
            platform_id
        )
        print(msg)
        return flask.jsonify({"msg": msg}), BAD_REQUEST
