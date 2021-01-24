import os
import json
import requests


server = "mainSite" #mainSite for liftingcast.com, "relay" for relay server. 
localServerIP = "192.168.1.160" #if using a relay server, define the IP here. 

meet_id = 'mrzivliqz10r' #liftingcast meet ID
#USAPL Platform IDs
platform_id = 'pi40bz3ayeqz' #liftingcast platform ID added  at the end. 
#define meet password
password = 'TSS20' #meet password

configured = True #this means meet ID, platform ID, and password have been entered. When this is true the sync icon is drawn on the screen. 
good_sync = False #this variable is checked by the main thread for drawing the sync icons. 
bad_sync = False #this variable is checked by the main thread for drawing the sync icons. 

if server == "mainSite":
    print("Liftingcast Server is: Main Site")
    meet_url = "liftingcast.com" #main server address
    protocol = "https://"
    
elif server == "relay":
    print("Liftingcast Server is: Relay Server")
    meet_url = localServerIP #local relay server IP
    protocol = "http://"

#-----------------------------------
#these are the URLs used to make requests to liftingcast
light_url = protocol+meet_url+"/api/meets/"+meet_id+"/platforms/"+platform_id+"/lights"
set_clock_url = protocol+meet_url+"/api/meets/"+meet_id+"/platforms/"+platform_id+"/clock"
start_clock_url= protocol+meet_url+"/api/meets/"+meet_id+"/platforms/"+platform_id+"/start_clock"
reset_clock_url= protocol+meet_url+"/api/meets/"+meet_id+"/platforms/"+platform_id+"/reset_clock"
password_data={"password":password}

print("Light URL:")
print(light_url)
print("Set CLock URL")
print(set_clock_url)
print("Start Clock URL")
print(start_clock_url)
print("Reset Clock URL")
print(reset_clock_url)
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
