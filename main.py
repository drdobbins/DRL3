#!/usr/bin/python3
import pygame
import sys
import pygame.locals as GAME_GLOBALS
import pygame.event as GAME_EVENTS
import pygame.freetype
import time
import os
from threading import Thread
import time
import pexpect
import subprocess
import sys
import re
import socket
import fcntl
import struct
import json
import odometer
import lc
import autoconnect
import requests
import socket


version = "0.10"

debug = False


with open ('/etc/os-release') as f: #open OS file and check version
	lines = f.readlines()
OS_Version = int((lines[3][9:11]))

if OS_Version >10:
    old_OS = False
else:
    old_OS = True

if not old_OS: #only try to import the module on newer systems that are running latest os
    from sh import bluetoothctl


show_main_timer = True #this determines if the main timer is shown or not
pygame.init()  # initialize pygame
mainClock = pygame.time.Clock()
pygame.font.init()  # initialize pygame font
print("Initializing DRL\n")

# Start the flask app to configure DRL with LiftingCast meet and platform info.
# t5 = Thread(target=lc.app.run(host='0.0.0.0',port=Port),debug=False, daemon=True) #this block the main DRL thread
# t5 = Thread(target=lc.app.run) #this doesnt block the main DRL thread
t5 = Thread(target=lc.run_server)
t5.daemon = True
print("starting the flask app")
t5.start()
print("liftingcast app is configured")
# test minimizing a window will work while getting input.
# pygame.display.iconify()
# os.system('amixer cset numid=3 2')  # sets the audio output to digital
# this will be the default
dimensions = pygame.display.Info()  # this grabs the screen's size in pixels

dim_w = dimensions.current_w  # the screens width in pixels
dim_h = dimensions.current_h  # the screens height in pixels.

# this script seems to generate a false positive for connections, and thus will fool the system into thinking each remote is connected
# this triggers the spare configuration menu on every connect.
# os.system("python3 /home/pi/Desktop/DRL3/autoconnect.py") #run the autoconnect script.


with open("/home/pi/Desktop/DRL3/config.json") as f:
    config_data = json.load(f)

leftMac = config_data["left_mac_address"]
chiefMac = config_data["chief_mac_address"]
rightMac = config_data["right_mac_address"]
spareMac = config_data["spare_mac_address"]
openerChange = config_data["opener_change_limit"]
federation = config_data["federation"]  # either "IPF" or non IPF

if federation == "IPF":
    IPF = True
    infractionCards = True
else:
    IPF = False
    infractionCards = False


surface = pygame.display.set_mode((dimensions.current_w, dimensions.current_h), pygame.FULLSCREEN | pygame.DOUBLEBUF)  # creates the main window
#surface = pygame.display.set_mode((dimensions.current_w, dimensions.current_h))


pygame.mouse.set_visible(False)


def check_bluetooth_status():
    global leftMac, chiefMac, rightMac, spareMac
    global leftSync, chiefSync, rightSync, spareSync
    global left_soc, chief_soc, right_soc, spare_soc
    global spare_not_configured, spare_side

    while True:
        # print("")
        # print("Start of the bluetooth querey thread:")
        # print("checking bluetooth device status")
        bl = Bluetoothctl()

        # initial values, will
        leftSync_init = bl.is_connected(
            leftMac
        )  # check if the chief remote is connected
        chiefSync_init = bl.is_connected(
            chiefMac
        )  # check if the chief remote is connected.
        rightSync_init = bl.is_connected(
            rightMac
        )  # check if the chief remote is connected.
        spareSync = bl.is_connected(spareMac)

        if not spareSync:  # the spare remote isn't connected
            spare_not_configured = (
                True  # therefore the remote isn't configured, global variable.
            )

        left_init_soc = get_battery_percent(leftMac, left_soc)
        chief_init_soc = get_battery_percent(chiefMac, chief_soc)
        right_init_soc = get_battery_percent(rightMac, right_soc)
        spare_init_soc = get_battery_percent(spareMac, spare_soc)

        if isinstance(spare_init_soc, int):
            spare_soc = spare_init_soc

        if spare_not_configured:  # the spare remote isn't configured, report as normal
            spare_soc = 0  # reset the battery percentage to 0% if it isn't configured.
            # ----Gather the battery information, everything is normal.
            if isinstance(left_init_soc, int):
                left_soc = left_init_soc
            if isinstance(chief_init_soc, int):
                chief_soc = chief_init_soc
            if isinstance(right_init_soc, int):
                right_soc = right_init_soc
            # everthing is normal, report out the normal sync statuses of the 3 main remotes.
            leftSync = leftSync_init
            chiefSync = chiefSync_init
            rightSync = rightSync_init

        else:  # the spare remote is configured, we need to update the correct battery image with the spare's value!
            try:  # theres a possiblity that the main loop won't update this value by the time we get here, so just hang tight until the spare remote side is selected.
                if spare_side == "left":
                    leftSync = spareSync
                    chiefSync = chiefSync_init
                    rightSync = rightSync_init
                elif spare_side == "chief":
                    leftSync = leftSync_init
                    chiefSync = spareSync
                    rightSync = rightSync_init
                elif spare_side == "right":
                    leftSync = leftSync_init
                    chiefSync = chiefSync_init
                    rightSync = spareSync
            except:
                print(
                    "Spare Remote side hasn't been selected, error when assigning sync responsibility"
                )

            # ---The spare remote is connected, we need to now configure the battery icons.
            if isinstance(
                spare_init_soc, int
            ):  # make sure the spare SOC is a real number.
                try:
                    if spare_side == "left":
                        left_soc = spare_init_soc  # update the left battery icon with the spare's value
                        if isinstance(chief_init_soc, int):
                            chief_soc = chief_init_soc  # update the chief remote with its actual value
                        if isinstance(right_init_soc, int):
                            right_soc = right_init_soc  # update the right remote with its actual value

                    elif spare_side == "chief":
                        chief_soc = spare_init_soc  # update the chief battery icon with the spare's value
                        if isinstance(left_init_soc, int):
                            left_soc = left_init_soc  # udpate the left remote with its actual value
                        if isinstance(right_init_soc, int):
                            right_soc = right_init_soc  # update the right remote with its actual value

                    elif spare_side == "right":
                        right_soc = spare_init_soc  # update the right battery icon with the spare's value.
                        if isinstance(left_init_soc, int):
                            left_soc = left_init_soc  # udpate the left remote with its actual value
                        if isinstance(chief_init_soc, int):
                            chief_soc = chief_init_soc  # update the chief remote with its actual value
                except:
                    if debug:
                        print("Spare side has not been defined yet... \n\n")

        # print("Battery values are: Left: " +str(left_soc) + "% , Chief: " +str(chief_soc) + "% , Right: " + str(right_soc) +"% , Spare: " +str(spare_soc))
        time.sleep(1)
        # print("Bluetooth Thread sleeping for 5 seconds...")


class BluetoothctlError(Exception):

    """This exception is raised, when bluetoothctl fails to start."""

    pass


class Bluetoothctl:

    """A wrapper for bluetoothctl utility."""

    def __init__(self):
        out = subprocess.check_output("rfkill unblock bluetooth", shell=True)
        self.child = pexpect.spawn("bluetoothctl", echo=False)

    def get_output(self, command, pause=0):
        """Run a command in bluetoothctl prompt, return output as a list of lines."""
        self.child.send(command + "\n")
        time.sleep(pause)
        # start_failed = self.child.expect(["bluetooth", pexpect.EOF])
        start_failed = self.child.expect(["#", pexpect.EOF])

        if start_failed:
            raise BluetoothctlError("Bluetoothctl failed after running " + command)

        return self.child.before.split(b"\r\n")
        # return self.child

    def is_connected(self, mac):
        match = False
        out = subprocess.check_output(["hcitool", "con"])
        out = out.split(b"\n")
        if debug:
            print("searching for address: " + mac)
        for device in out:
            if mac in device.decode():
                if debug:
                    print("Match found for address: " + mac)
                match = True
        return match


def get_color_from_time(time):
    # The purpose of this function is to map 60->30->0 in the RGB spectrum
    # depending on time.
    rgb = [0, 0, 0]
    time = int(time)
    if time <= 60 and time > 30:  # transition from green to yellow
        rgb[0] = int((-61 / 15) * (time) + 345)
        # equation to translate green to yellow for red.
        rgb[1] = int((-23 / 15) * (time) + 276)
        rgb[2] = int((29 / 30) * (time) + 12)
    if time <= 30 and time > 0:
        rgb[0] = int((1 / 5) * (time) + 217)
        rgb[1] = int((33 / 5) * (time) + 32)
        rgb[2] = int((1 / 30) * (time) + 40)
    if time == 0:
        rgb = [23, 23, 23]
    return rgb


def draw_background_box(textID, update):
    # def draw_background_box(position):
    # depending on the unique ID, raw the background box for the text.

    # pygame.draw.rect(surface, [255,23,23],position,1) #used for debugging
    if textID == "mainTimer":
        # this draws the background behind the main timer for each tick.
        x = (dimensions.current_w / 100) * 25
        y = (dimensions.current_h / 100) * 55
        width = (dimensions.current_w / 100) * 50
        height = (dimensions.current_h / 100) * 34
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        # pygame.display.update((x, y, width, height))
        # print("display updated - draw_background_box")
    if textID == "attemptChange":
        print("drawing backgound box for attempt change arrows")
        x = 0
        y = 0
        width = dimensions.current_w
        height = (
            dimensions.current_h / 100
        ) * 30  # just color the top quarter of the screen.
        pygame.draw.rect(surface, [25, 23, 23], (x, y, width, height))
        # pygame.display.update((x, y, width, height)) #immeadetly update the
        # screen.

    if textID == "breakTimer":
        print("drawing backgound box for breakTimer")
        x = (dimensions.current_w / 100) * 25.5
        y = (dimensions.current_h / 100) * 26
        width = (dimensions.current_w / 100) * 52
        height = (dimensions.current_h / 100) * 30
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        # pygame.display.update((x, y, width, height))

    if textID == "openerChange":
        print("drawing backgound box for openerChange")
        x = (dimensions.current_w / 100) * 20
        y = (dimensions.current_h / 100) * 66
        width = (dimensions.current_w / 100) * 53
        height = (dimensions.current_h / 100) * 16.5
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        # pygame.display.update((x, y, width, height))

    if textID == "timerChange":
        print("drawing backgound box for timerChange")
        x = (dimensions.current_w / 100) * 8
        y = (dimensions.current_h / 100) * 55
        width = dimensions.current_w
        height = (dimensions.current_h / 100) * 36
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))

    if textID == "lights":
        x = 0
        y = 0
        width = dimensions.current_w
        height = (dimensions.current_h / 100) * 55
        print("Covering up the lights")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        pygame.display.update(x, y, width, height)

    if textID == "left":
        x = 0
        y = 0
        width = (dimensions.current_w / 100) * 33
        height = (dimensions.current_h / 100) * 55
        if debug:
            print("Covering up the left desync")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        pygame.display.update(x, y, width, height)

    if textID == "chief":
        x = (dimensions.current_w / 100) * 33
        y = 0
        width = (dimensions.current_w / 100) * 33
        height = (dimensions.current_h / 100) * 55
        if debug:
            print("Covering up the chief desync")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        pygame.display.update(x, y, width, height)

    if textID == "right":
        x = (dimensions.current_w / 100) * 66
        y = 0
        width = (dimensions.current_w / 100) * 33
        height = (dimensions.current_h / 100) * 55
        if debug:
            print("Covering up the right desync")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        pygame.display.update(x, y, width, height)

    if textID == "leftBatt":
        x = (dimensions.current_w / 100) * 6
        y = (dimensions.current_h / 100) * 96
        width = (dimensions.current_w / 100) * 4
        height = (dimensions.current_h / 100) * 4
        if debug:
            print("Covering up the left battery")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        if update:
            pygame.display.update(x, y, width, height)

    if textID == "chiefBatt":
        x = (dimensions.current_w / 100) * 10
        y = (dimensions.current_h / 100) * 96
        width = (dimensions.current_w / 100) * 4
        height = (dimensions.current_h / 100) * 4
        print("Covering up the chief battery")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        if update:
            pygame.display.update(x, y, width, height)

    if textID == "rightBatt":
        x = (dimensions.current_w / 100) * 14
        y = (dimensions.current_h / 100) * 96
        width = (dimensions.current_w / 100) * 4
        height = (dimensions.current_h / 100) * 4
        if debug:
            print("Covering up the right battery")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        if update:
            pygame.display.update(x, y, width, height)
    if textID == "spareMenu":
        x = (dimensions.current_w / 100) * 0
        y = (dimensions.current_h / 100) * 15
        width = dimensions.current_w
        height = (dimensions.current_h / 100) * 30
        if debug:
            print("drawing Spare Config Menu \n\n\n")
        pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        if update:
            pygame.display.update(x, y, width, height)


def draw_attempt_box(time, logo_position):
    # squareWidth = logo_position.width
    # squareLength = logo_position.height
    # squareX = logo_position.left
    # squareY = logo_position.top
    pygame.draw.rect(surface, get_color_from_time(time), logo_position)
    # pygame.draw.rect(surface, get_color_from_time(time), (squareX, squareY, squareWidth, squareLength))
    # print("display updated - draw_attempt_box")
    # Green 101, 184, 70
    # Yellow 233, 230, 41
    # 217, 32, 40


def format_image(logo, scaling_factor, x, y):
    global surface
    # this will be a function which takes in an image, scaling size, and
    # location and prints it on the screen.
    raw_logo = pygame.image.load(logo).convert_alpha()
    # load in the image you want displayed, this
    # should only be done once!
    image_dimensions = raw_logo.get_rect().size
    x_scale = (
        ((float(dimensions.current_h / 100) * scaling_factor))
        * float(image_dimensions[0])
    ) / (float(image_dimensions[1]))
    scaled_logo_main = pygame.transform.scale(
        raw_logo, ((int(x_scale)), int((dimensions.current_h / 100) * scaling_factor))
    )
    logo_position = scaled_logo_main.get_rect()
    logo_position.centerx = (
        dimensions.current_w / 100
    ) * x  # this should be the middle of the screen
    logo_position.centery = (dimensions.current_h / 100) * y
    return scaled_logo_main, logo_position
    # surface.blit(scaled_logo_main, logo_position)  # put the image on the
    # screen.


def place_image(image, update_display):
    photo = surface.blit(image[0], image[1])  # put the image on the screen.
    if update_display:
        pygame.display.update(photo)
        print("display updated-place_image")


def init_arrow(image):
    raw_logo = pygame.image.load(image).convert_alpha()
    scaling_factor = 12
    image_dimensions = raw_logo.get_rect().size
    x_scale = (
        ((float(dimensions.current_h / 100) * scaling_factor))
        * float(image_dimensions[0])
    ) / (float(image_dimensions[1]))
    scaled_logo_main = pygame.transform.scale(
        raw_logo, ((int(x_scale)), int((dimensions.current_h / 100) * scaling_factor))
    )  # scale the image to fit
    logo_position = scaled_logo_main.get_rect()
    return scaled_logo_main, logo_position


def draw_arrow(raw_logo, x, y, arrow):
    global top_arrow_surface, bottom_arrow_surface, arrow_height, arrow_width
    print("drawing the arrow")
    """scaling_factor = 12
    image_dimensions = raw_logo.get_rect().size
    x_scale = (((float(dimensions.current_h / 100) * scaling_factor)) * float(image_dimensions[0])) / (float(image_dimensions[1]))
    scaled_logo_main = pygame.transform.scale(raw_logo,((int(x_scale)), int((dimensions.current_h / 100) * scaling_factor))) #scale the image to fit
    logo_position = scaled_logo_main.get_rect()"""
    scaled_logo_main = raw_logo[0]
    logo_position = raw_logo[1]

    # logo_position.centerx = x  # this should be the middle of the screen
    # logo_position.centery = y

    if arrow == "right":  # top side arrow
        print("drawing the RIGHT arrow")
        logo_position.right = x  # this should be the middle of the screen
        logo_position.centery = y
        # width = (dimensions.current_w)
        # height = (dimensions.current_h / 100) * 16.5 #just color the top quarter of the screen.
        # pygame.draw.rect(surface, [23, 23, 23],(0, 0, width, height))

        print("Drawing arrow at: " + str(logo_position))
        surface.blit(top_arrow_surface, (0, 0, arrow_width, arrow_height))
        photo = surface.blit(scaled_logo_main, logo_position)
        # pygame.display.update((0,0,width,height)) #update the screen.

    elif arrow == "left":  # bottom side arrow
        print("drawing the LEFT arrow")
        logo_position.left = x  # this should be the middle of the screen
        logo_position.centery = y
        # width = (dimensions.current_w)
        # height = (dimensions.current_h / 100) * 13.5 #just color the top quarter of the screen.
        # pygame.draw.rect(surface, [23, 23, 23],(0,
        # ((dimensions.current_h/100)*16.5), width, height))
        surface.blit(
            bottom_arrow_surface,
            (0, ((dimensions.current_h / 100) * 16.5), arrow_width, arrow_height),
        )
        print("Drawing arrow at: " + str(logo_position))
        photo = surface.blit(scaled_logo_main, logo_position)
        # pygame.display.update((0,((dimensions.current_h/100)*16.5),width,height))
        # update the screen.

    print("")


# top_arrow_box = pygame.draw.rect(top_arrow_surface, [23, 23, 23],(0, 0, arrow_width, arrow_height))
# bottom_arrow_box = pygame.draw.rect(bottom_, [23, 23, 23],(0,
# ((dimensions.current_h/100)*16.5), arrow_width, arrow_height))


def place_text(text, Color, textFont, loc_x, loc_y, textID):
    global surface
    if Color == "red":
        color = (217, 32, 40)
    elif Color == "white":
        color = (255, 255, 255)
    elif Color == "yellow":
        color = (255, 228, 0)
    elif Color == "black":
        color = (0, 0, 0)
    elif Color == "gray":
        color = (23, 23, 23)
    else:
        color = (0, 148, 71)
    rendered_message = textFont.render(
        str(text), True, color
    )  # used for the regular pygame font rendering
    # rendered_message = textFont.render(text, color)

    text_position = (
        rendered_message.get_rect()
    )  # get the size of the rendered text (regular
    text_position.centerx = (
        dimensions.current_w / 100
    ) * loc_x  # specify where the center of the message should be on the x axis
    text_position.centery = (
        dimensions.current_h / 100
    ) * loc_y  # specify where the cen

    if textID == "mainTimer":
        #print("Drawing Background for Main Timer")
        draw_background_box(textID, True)
        # over write the exisitng stuff in that spot, and make way for the next text render.
        # I think this needs to be here to keep the left most attempt timer box on top.
        # draw_attempt_box(attempt_timer1.getSeconds(), attempt1_image[1])  # place the pretty frame over the box
        # place_image(attempt1_image)
        # pygame.display.update(text_position) #just update the part of the
        # screen where the text is.
        surface.blit(rendered_message, text_position)
        # place the text on the screen
        pygame.display.update(text_position)
        # just update the part of the screen where the
        # text is.

    if textID == "breakTimer":
        #print("Drawing Background for break timer")
        draw_background_box(textID, True)
        # over write the exisitng stuff in that spot, and
        # make way for the next text render.
        surface.blit(rendered_message, text_position)
        # place the text on the screen
        x = (dimensions.current_w / 100) * 25.5
        y = (dimensions.current_h / 100) * 26
        width = (dimensions.current_w / 100) * 52
        height = (dimensions.current_h / 100) * 30
        # pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        pygame.display.update((x, y, width, height))
        # just update the part of the screen where the
        # text is.

    if textID == "openerChange":
        draw_background_box(textID, True)
        # over write the exisitng stuff in that spot, and
        # make way for the next text render.
        surface.blit(rendered_message, text_position)
        # place the text on the screen
        x = (dimensions.current_w / 100) * 20
        y = (dimensions.current_h / 100) * 66
        width = (dimensions.current_w / 100) * 53
        height = (dimensions.current_h / 100) * 16.5
        # pygame.draw.rect(surface, [23, 23, 23], (x, y, width, height))
        pygame.display.update((x, y, width, height))
        # pygame.display.update(text_position)
        # just update the part of the screen where the
        # text is.

    if textID == "timerChange":
        print("Drawing Background for Main Timer in edit mode")
        draw_background_box(textID, True)
        # over write the exisitng stuff in that spot, and
        # make way for the next text render.
        surface.blit(rendered_message, text_position)
        # place the text on the screen
        pygame.display.update(text_position)
        # just update the part of the screen where the
        # text is.

    if textID == "attempt1":
        print("Drawing Attempt box for attempt1")
        draw_attempt_box(
            attempt_timer1.seconds, attempt1_image[1]
        )  # place the pretty frame over the box
        place_image(attempt1_image, False)
        surface.blit(rendered_message, text_position)
        # place the text on the screen
        pygame.display.update(
            attempt1_image[1]
        )  # just update the part of the screen where the text is.

    if textID == "attempt2":
        print("Drawing Attempt box for attempt2")
        draw_attempt_box(
            attempt_timer2.seconds, attempt2_image[1]
        )  # place the pretty frame over the box
        place_image(attempt2_image, False)
        surface.blit(rendered_message, text_position)
        # place the text on the screen
        pygame.display.update(
            attempt2_image[1]
        )  # just update the part of the screen where the text is.

    if textID == "attempt3":
        print("Drawing Attempt box for attempt3")
        draw_attempt_box(
            attempt_timer3.seconds, attempt3_image[1]
        )  # place the pretty frame over the box
        place_image(attempt3_image, False)
        surface.blit(rendered_message, text_position)
        # place the text on the screen
        # pygame.display.update(text_position) #just update the part of the
        # screen where the text is.
        pygame.display.update(
            attempt3_image[1]
        )  # just update the part of the screen where the text is.

    # surface.blit(rendered_message, text_position)  # place the text on the screen.
    # pygame.display.update(text_position) #just update the part of the screen
    # where the text is.
    #print("display updated - place_text")


def resetLights():
    global leftDecision, leftRed, leftBlue, leftYellow, leftGoodlift
    global chiefDecision, chiefRed, chiefBlue, chiefYellow, chiefGoodlift
    global rightDecision, rightRed, rightBlue, rightYellow, rightGoodlift
    global revealDecision
    leftGoodlift = False
    leftRed = False
    leftBlue = False
    leftYellow = False

    chiefGoodlift = False
    chiefRed = False
    chiefBlue = False
    chiefYellow = False

    rightGoodlift = False
    rightRed = False
    rightBlue = False
    rightYellow = False

    revealDecision = False  # This
    leftDecision = False  # reset
    chiefDecision = False  # reset
    rightDecision = False  # reset

    pygame.time.set_timer(clear_lights_event, 0)
    # Halt the repeating events., just in case.
    pygame.event.get(clear_lights_event)  # remove anything in the queue.


def reset_leftLights():
    global leftDecision, leftRed, leftBlue, leftYellow, leftGoodlift, revealDecision
    leftGoodlift = False
    leftRed = False
    leftBlue = False
    leftYellow = False
    global revealDecision
    revealDecision = False


def reset_chiefLights():
    global chiefDecision, chiefRed, chiefBlue, chiefYellow, chiefGoodlift, revealDecision
    chiefGoodlift = False
    chiefRed = False
    chiefBlue = False
    chiefYellow = False
    global revealDecision
    revealDecision = False


def reset_rightLights():
    global rightDecision, rightRed, rightBlue, rightYellow, rightGoodlift, revealDecision
    rightGoodlift = False
    rightRed = False
    rightBlue = False
    rightYellow = False
    global revealDecision
    revealDecision = False


class clock:
    def __init__(self, minutes, seconds):
        self.hours = 0
        self.minutes = minutes
        self.seconds = seconds
        self.running = False
        self.empty = False
        self.currently_reset = True

    def getSeconds(self):
        return str(self.seconds)

    def status(self):
        if self.seconds < 10:
            value = str(self.minutes) + ":0" + str(self.seconds)
        else:
            value = str(self.minutes) + ":" + str(self.seconds)
        return value

    def break_status(self):
        reported_seconds = str(self.seconds)
        reported_minutes = str(self.minutes)
        reported_hours = str(self.hours)

        if self.seconds < 10:
            reported_seconds = "0" + str(self.seconds)
        if self.minutes < 10:
            reported_minutes = "0" + str(self.minutes)

        value = reported_hours + ":" + reported_minutes + ":" + reported_seconds
        return value

    def start(self):
        # start the clock
        self.running = True
        if (
            self == main_timer
        ):  # we only want to toggle the caps lock value if the main timer is one being started, not attempt timers.
            capsLockOn = get_caps_lock()
            if capsLockOn:  # if caps lock is currently on, turn it off.
                os.system("xte 'key Caps_Lock' -x:0")  # turn off the LED
                print("TURNING OFF ATTEMPT LED")

    def pause(self):
        self.running = False

    def reset(self):
        # reset the clock to 1 minute
        if self == main_timer:
            capsLockOn = get_caps_lock()
            if not capsLockOn:  # if the LED is off
                os.system("xte 'key Caps_Lock' -x:0")  # turn on the LED
                print("Turning ON ATTEMPT CHANGE LED")

        print("Clock has been reset to 1:00")
        self.minutes = 1
        self.seconds = 0
        self.running = False
        self.empty = False
        self.currently_reset = True
        reset_main_liftingcast_clock()

    def reset_status(self):
        return self.currently_reset

    def reset60(self):
        self.minutes = 0
        self.seconds = 60
        self.running = False
        self.empty = False

    def transfer(self, seconds):
        self.seconds = int(seconds)
        self.empty = False
        self.running = True

    def openerStatus(self):
        global openerChange
        reported_hour = self.hours
        reported_minute = self.minutes
        reported_seconds = self.seconds

        if (
            self.minutes < openerChange
        ):  # this is for the use case where an hour needs to change to keep track of the opener change
            if self.hours > 0:
                reported_hour = self.hours - 1
            reported_minute = 60 - (openerChange - self.minutes)
        else:
            reported_minute = self.minutes - openerChange

        if reported_minute < 10:
            reported_minute = "0" + str(reported_minute)

        if self.seconds < 10:  # if its less than 10 seconds, pad a zero.
            reported_seconds = "0" + str(self.seconds)
        # else:
        value = (
            str(reported_hour)
            + ":"
            + str(reported_minute)
            + ":"
            + str(reported_seconds)
        )
        return value

    def tick(self):
        # this function will handle the decimation of the clock and will be executed in a separate thread.
        # while True:
        if self.running:
            self.currently_reset = False  # the timer is no longer reset.
            # print(" is ticking")
            # clock has been started, we need to decimate.
            self.seconds -= 1  # decrement the seconds hand always
            if (
                self.seconds < 0 and self.minutes > -1
            ):  # if the seconds portion has reached zero
                self.seconds = 59  # reset the seonds portion then...l
                self.minutes -= 1  # decrement the minute number

            if self.minutes < 0 and self.hours > 0:
                self.minutes = 59
                self.hours -= 1

            if self.minutes == 0 and self.seconds == 0 and self.hours == 0:
                self.running = False
                self.empty = True


def reset_main_liftingcast_clock():
    global lc, good_sync_image, no_sync_image
    if lc.configured:  # if liftingcast is configured
        try:
            total_time = 60  # 60 seconds
            t2 = Thread(target=lc.set_liftingcast_clock, args=[total_time])
            t2.daemon = True
            t2.start()
            place_image(good_sync_image, True)  # draw the green sync logo
        except:
            place_image(no_sync_image, True)  # draw the red sync logo


def start_attempt_timer1():
    global e, offset, yoffset
    pygame.time.set_timer(attempt_timer1_event, 1000)  # Begin the tick.
    print("Starting the Attempt1 Timer")
    attempt_timer1.start()

    if attempt_timer1.seconds > 0:
        place_text(
            attempt_timer1.seconds,
            "black",
            attempt_timer_font,
            76 + offset + e,
            83 + yoffset,
            "attempt1",
        )  # prints the main timer. #update the timerplace_text


def start_attempt_timer2():
    global e, offset, yoffset
    pygame.time.set_timer(attempt_timer2_event, 1000)  # Begin the tick.
    print("Starting the Attempt2 Timer")
    attempt_timer2.start()
    print("Attempt Timer 2 Should be ticking now")
    if attempt_timer2.seconds > 0:
        place_text(
            attempt_timer2.seconds,
            "black",
            attempt_timer_font,
            83 + offset + e,
            83 + yoffset,
            "attempt2",
        )  # prints the main timer. #update the timerplace_text


def start_attempt_timer3():
    global e, offset, yoffset
    pygame.time.set_timer(attempt_timer3_event, 1000)  # Begin the tick.
    print("Starting the Attempt3 Timer")
    attempt_timer3.start()
    print("Attempt Timer 3 Should be ticking now")
    if attempt_timer3.seconds > 0:
        place_text(
            attempt_timer3.seconds,
            "black",
            attempt_timer_font,
            90 + offset + e,
            83 + yoffset,
            "attempt3",
        )  # prints the main timer. #update the timerplace_text


def assign_timer_spot():
    # this will be called every time the lights come on, to determine what clock values are shuffled around where.
    # check if timer 1 is empty.
    print("Assigning Attempt Selection Spot")
    if attempt_timer1.seconds == 0:
        print("Assigning to First Spot")
        attempt_timer1.reset60()
        # reset the left most 60 second attempt timer.
        start_attempt_timer1()  # start the left most attempt timer.
    else:
        print("First Spot Full...")
        if attempt_timer2.seconds == 0:
            print("Assigning to Second Spot")
            # attempt timer 1 is full, take what it has.
            attempt_timer2.transfer(attempt_timer1.seconds)
            # this should transfer the value from
            # attempt timer 1 to attempt timer 2
            start_attempt_timer2()

            attempt_timer1.reset60()
            # reset the left most 60 second attempt
            # timer.
            start_attempt_timer1()  # start the left most attempt timer.
        else:
            print("Second Spot Full...")
            if attempt_timer3.seconds == 0:
                print("Assigning to Third Spot")
                attempt_timer3.transfer(
                    attempt_timer2.seconds
                )  # transfer second clock to 3rd
                attempt_timer2.transfer(
                    attempt_timer1.seconds
                )  # transfer first clock to 2nd
                attempt_timer1.reset60()  # reset the first timer.

                start_attempt_timer3()
                start_attempt_timer2()
                start_attempt_timer1()
            else:
                print("DRL only supports 3 attempt selection clocks")


def stringToclock(string):
    if len(string) == 5:
        hour = string[0]
        minutes = string[1:3]
        seconds = string[3:]
        finalString = hour + ":" + minutes + ":" + seconds
        print("")
        print(finalString)
        print("")
        return finalString

    else:
        seconds = string[-2:]
        minutes = string[:-2]
        print("beginning of string to clock function")
        print(seconds)
        print(minutes)

        if string == "":

            finalString = "0:00:00"
        else:
            if len(seconds) == 1:

                seconds = "0" + seconds

            if len(minutes) == 0:
                minutes = "00"

            elif len(minutes) == 1:
                minutes = "0" + minutes

            if len(string) > 4:
                minutes = "00"
                seconds = "00"

            print("end of string to clock function")
            print(seconds)
            print(minutes)

            finalString = "0:" + minutes + ":" + seconds

        return finalString


def break_mode():
    global main_timer, input_blocked
    # this will only be entered if a clock of 4 minutes or greater has been selected.
    # first thing we need to do is clear the screen, main timer, and attempt
    # selection timers.
    attempt_timer_reset()  # reset the attempt timers to clear them.
    resetLights()
    input_blocked = True
    surface.fill((23, 23, 23))  # color the screen black
    # pygame.display.update()  # update the entire screen (blank it out).
    pygame.display.update(
        (0, 0, dimensions.current_w, (dimensions.current_h / 100) * 90)
    )
    place_image(break_mode_image, True)  # place it on the screen and update.
    place_image(drlCorner, True)
    draw_background_box("breakTimer", True)
    place_text(
        main_timer.break_status(), "white", main_timer_break_font, 50, 40, "breakTimer"
    )
    # prints the main timer.#display the initial time value on the
    # screen.
    print(main_timer.openerStatus())
    draw_background_box("openerChange", True)
    place_text(
        main_timer.openerStatus(), "red", opener_change_font, 50, 73, "openerChange"
    )
    # draw_background_box("openerChange", True)


def get_battery_percent(mac, soc):
    global old_OS
    if old_OS:
        if debug:
            print("")
            print("reading battery percentage")
        # print("Init bluetooth...")
        bl = Bluetoothctl()
        if debug:
            print(("Checking battery % for device: " + mac))

        macStr = mac.replace(":", "_")
        consoleStr = (
            "select-attribute /org/bluez/hci0/dev_" + macStr + "/service005f/char0060"
        )
        bl.get_output(consoleStr)
        bl.get_output("read")
        bl.get_output("")
        soc = bl.get_output("")
        byteBattery = soc[0][-2:]
        # this gets the battery percentage for that device (in hex!)
        if debug:
            print("Byte battery % for " + str(mac) + " is: " + str(byteBattery))
        strBattery = byteBattery.decode()  # forms a string
        if debug:
            print("Battery Level for Device: " + mac + " is " + strBattery + "h")
        try:
            intBattery = int(byteBattery, 16)
            if debug:
                print("Returning: " + str(intBattery) + "% as the battery value.")
            return intBattery  # gets the final battery %
        except:
            if debug:
                print(
                    "Error Reading battery level, returning previous reading: " + str(soc)
                )
            return soc
    else:
        #info = str(bluetoothctl("info",mac)) #query a sh script. 
        try:
            info = str(bluetoothctl("info",mac)) #query a sh script. 
            soc = int(info[-4:-2]) #extract the battery % in %
            return soc #return the State of Charge
        except:
            try:
                #single digit SOC, remove the (
                soc = int(info[-3:-2]) #extract the battery % in %
                return soc #return the State of Charge
            except:
                return soc #just return the old value if it errors out, don't crash the thread
        


def timer_edit():
    # this will be its own mini loop used to update the timer.
    # first we need to color the main timer red, and have it blink to let the user know they're editing it.
    # main_timer.minutes = 0 #reset the clock for new data entry
    # main_timer.seconds = 0 #reset the clock for new data entry
    global mainClock, main_timer, blinking_text_event, openerChange, breakMode,show_main_timer
    color = "red"
    place_text("0:00:00", color, main_timer_font, 50, 70, "timerChange")
    new_time = ""
    stayLooped = True
    main_timer.reset()
    # reset the clock so everything works good when we come
    # back.

    # pygame.time.set_timer(blinking_text_event, 400)

    while stayLooped:
        for event in GAME_EVENTS.get():

            if event.type == pygame.KEYDOWN:

                if (
                    event.key == pygame.K_KP_ENTER or event.key == pygame.K_RETURN
                ):  # EXIT CONDITION
                    print("exiting the timer loop")
                    stayLooped = False

                    # call a function which maps len to minutes/seconds.
                    if len(new_time) == 5:  # this means hours were entered.
                        hours = int(new_time[0])
                        minutes = int(new_time[1:3])
                        seconds = int(new_time[4:])

                        if seconds > 59:
                            minutes = minutes + 1
                            seconds = seconds - 60

                        if minutes > 59:
                            hours += 1
                            minutes = minutes - 60

                        main_timer.hours = hours
                        main_timer.minutes = minutes
                        main_timer.seconds = seconds

                        print("")
                        print(main_timer.hours)
                        print(main_timer.minutes)
                        print(main_timer.seconds)
                        print("")
                    else:
                        if (
                            len(new_time) < 3
                        ):  # that means the user only entered seconds.
                            minutes = 0
                            hours = 0
                        else:  # the user entered minutes too!
                            minutes = int(new_time[:-2])
                        # this is what handles an empty input vs a non-empty input.
                        if (
                            len(new_time) == 0
                        ):  # this means the user entered nothing, which we default to normal operation.
                            main_timer.hours = 0  # reset the hour variable since its only used on break.
                            system_reset()
                            # update the class value

                        else:  # if the user entered a non zero input.
                            seconds = int(new_time[-2:])
                            if (
                                seconds > 59
                            ):  # handle the weird input of 90 seconds = 1:30 we need to add minutes. 60-99 needs to add a minute
                                minutes = minutes + 1
                                seconds = seconds - 60
                            if minutes > 59:
                                main_timer.hours = (
                                    main_timer.hours + 1
                                )  # add another hour.
                                minutes = minutes - 60
                            else:
                                main_timer.hours = 0
                            main_timer.minutes = minutes  # this is the main deliverable, update the class value with the user input
                            main_timer.seconds = seconds
                            # main_timer.hours = 0

                            # now that we have updated class variables, we need to
                            # handle the scneario where you manually exit break
                            # mode by
                            total_time = (minutes * 60) + seconds
                            if (
                                total_time <= 240 and breakMode
                            ):  # if the requested time is less than 4 minutes, then do normal operation.
                                screen_reset()
                                # we want to exit break mode and
                                # return to normal operation.
                            else:
                                place_text(
                                    "0:00:00",
                                    "gray",
                                    main_timer_font,
                                    50,
                                    70,
                                    "timerChange",
                                )  # "hides" the main timer..
                                if show_main_timer: place_text(
                                    main_timer.status(),
                                    "white",
                                    main_timer_font,
                                    50,
                                    70,
                                    "timerChange",
                                )  # prints the main timer.
                                # update the class value

                elif event.key == pygame.K_BACKSPACE:
                    print("backspace entered, lets see if the string is empty")
                    if len(new_time) > 1:  # this means the string is not empty.
                        print("string is not empty, removing last entry")
                        new_time = new_time[:-1]  # backspace will remove the last input
                        # update the time on the screen
                        place_text(
                            stringToclock(new_time),
                            color,
                            main_timer_font,
                            50,
                            70,
                            "timerChange",
                        )
                    elif len(new_time) == 1:
                        print("string has 1 character left, emptying the string")
                        new_time = ""
                        place_text(
                            stringToclock(new_time),
                            color,
                            main_timer_font,
                            50,
                            70,
                            "timerChange",
                        )

                numericCheck = event.unicode.isnumeric()
                if numericCheck:  # we only want to update the screen with numeric data.
                    print("updating the message with the latest character")
                    new_time += event.unicode

                    if len(new_time) > 5:
                        new_time = ""  # reset the timer.
                    # update the time on the screen.
                    place_text(
                        stringToclock(new_time),
                        color,
                        main_timer_font,
                        50,
                        70,
                        "timerChange",
                    )

    mainClock.tick(120)  # keep the frame rate constant in this function.


def attempt_timer_reset():
    global attempt_timer1, attempt_timer2, attempt_timer3, offset, e, yoffset
    attempt_timer1.minutes = 0
    attempt_timer1.seconds = 0
    attempt_timer1.empty = True
    attempt_timer2.minutes = 0
    attempt_timer2.seconds = 0
    attempt_timer2.empty = True
    attempt_timer3.minutes = 0
    attempt_timer3.seconds = 0
    attempt_timer3.empty = True

    pygame.time.set_timer(attempt_timer1_event, 0)
    # Halt the repeating events.
    pygame.event.get(attempt_timer1_event)

    pygame.time.set_timer(attempt_timer2_event, 0)
    # Halt the repeating events.
    pygame.event.get(attempt_timer2_event)

    pygame.time.set_timer(attempt_timer3_event, 0)
    # Halt the repeating events.
    pygame.event.get(attempt_timer3_event)
    place_text(
        attempt_timer1.seconds,
        "gray",
        attempt_timer_font,
        76 + offset + e,
        83 + yoffset,
        "attempt1",
    )  # print the new values on the screen
    place_text(
        attempt_timer2.seconds,
        "gray",
        attempt_timer_font,
        83 + offset + e,
        83 + yoffset,
        "attempt2",
    )  # print the new values on the screen.
    place_text(
        attempt_timer3.seconds,
        "gray",
        attempt_timer_font,
        90 + offset + e,
        83 + yoffset,
        "attempt3",
    )  # print the new values on the screen


def system_reset():
    print("System Reset Requested...")
    global surface, breakMode, drlCorner, lifterID_image, attemptID_image, main_timer, attempt_timer1, attempt_timer2, attempt_timer3
    global leftSync, chiefSync, rightSync, left_currently_desync, chief_currently_desync, right_currently_desync
    global input_blocked, show_main_timer, show_main_timer
    surface.fill((23, 23, 23))  # color the screen black
    place_image(drlCorner, False)
    if show_main_timer:
        place_image(lifterID_image, False)
    place_image(attemptID_image, False)
    resetLights()  # reset all the booleans associated with the control logic.
    input_blocked = False  # this will prevent referee remotes from triggering decisions

    # Boolean values used to determine the current sync status from the
    # remotes.
    leftSync = True
    chiefSync = True
    rightSync = True
    attempt_timer_reset()
    left_currently_desync = False
    chief_currently_desync = False
    right_currently_desync = False

    breakMode = False
    input_blocked = False

    pygame.time.set_timer(main_timer_event, 0)  # Halt the repeating events.
    pygame.event.get(main_timer_event)
    # this should remove any late main timer events in the
    # queue.
    main_timer.reset()  # reset the clock to 1 minute.
    if show_main_timer:
        place_text(main_timer.status(), "white", main_timer_font, 50, 70, "mainTimer")
    # prints the main timer. #update the timerplace_text

    pygame.display.update()
    print("System Reset Complete")


def screen_reset():
    """print("Screen Reset Requested...")
    global surface
    surface.fill((23, 23, 23))  # color the screen black
    place_image(drlCorner, False)
    place_image(lifterID_image, False)
    place_image(attemptID_image, False)
    place_text(main_timer.status(), "white", main_timer_font, 50, 70,"mainTimer")  # prints the main timer. #update the timerplace_text
    pygame.display.update()
    print("Screen Reset Complete")"""
    print("Screen Reset Requested...")
    global surface, breakMode, drlCorner, lifterID_image, attemptID_image, main_timer, attempt_timer1, attempt_timer2, attempt_timer3
    global leftSync, chiefSync, rightSync, left_currently_desync, chief_currently_desync, right_currently_desync
    global input_blocked, show_main_timer, show_main_timer
    surface.fill((23, 23, 23))  # color the screen black
    # main_timer.reset()
    place_image(drlCorner, False)
    if show_main_timer:
        place_image(lifterID_image, False)
    place_image(attemptID_image, False)
    resetLights()  # reset all the booleans associated with the control logic.
    input_blocked = False  # this will prevent referee remotes from triggering decisions

    # Boolean values used to determine the current sync status from the
    # remotes.
    """leftSync = True
    chiefSync = True
    rightSync = True
    attempt_timer_reset()"""
    left_currently_desync = False
    chief_currently_desync = False
    right_currently_desync = False

    breakMode = False
    input_blocked = False

    pygame.time.set_timer(main_timer_event, 0)  # Halt the repeating events.
    pygame.event.get(main_timer_event)
    # this should remove any late main timer events in the
    # queue.
    if show_main_timer:
        place_text(main_timer.status(), "white", main_timer_font, 50, 70, "mainTimer")
    # prints the main timer. #update the timerplace_text

    pygame.display.update()
    print("Screen Reset Complete")


def menu():
    global left_soc, chief_soc, right_soc, IPF, infractionCards, leftSync, chiefSync, rightSync, spareSync, show_main_timer
    surface.fill((23, 23, 23))  # color the screen black
    # pygame.display.update((0, 0, dimensions.current_w, (dimensions.current_h/100)*90))
    pygame.display.update()  # update the entire screen.
    place_text(
        "00:00", "gray", main_timer_font, 50, 70, "mainTimer"
    )  # remove the main timer.
    ip = display_ip_address()  # check the IP.
    stayLooped = True
    place_text("MENU", "white", menu_font, 50, 3, "mainTimer")
    place_text("Liftingcast Management: " + ip + ":5000", "white", menu_font, 50, 10, "mainTimer")
    place_text(
        "Attemptdometer: " + str(odometer.read_mileage()),
        "red",
        menu_font,
        50,
        17,
        "mainTimer",
    )
    place_text("Version: " + version, "white", menu_font, 50, 24, "mainTimer")

    place_text("1 - Manual Remote Connect", "white", menu_font, 50, 70, "mainTimer")
    # need to put if config is IPF, give option to remove infraction cards.

    place_text("2 - Reset Bluetooth", "white", menu_font, 50, 77, "mainTimer")
    
    if show_main_timer:
        place_text("3 - Remove Main Timer", "white", menu_font, 50, 84, "mainTimer")
    else:
        place_text("3 - Restore Main Timer", "white", menu_font, 50, 84, "mainTimer")

    if infractionCards and IPF:
        place_text(
            "4 - Remove Infraction Cards", "white", menu_font, 50, 91, "mainTimer"
        )
    elif IPF and not infractionCards:
        place_text("4 - Restore Infraction Cards", "white", menu_font, 50, 91, "mainTimer")

    # place_text("Left Remote Battery: " + str(left_soc) + "%","white", menu_font, 50, 35, "mainTimer")
    # place_text("Chief Remote Battery: " + str(chief_soc) + "%","white", menu_font, 50, 55, "mainTimer")
    # place_text("Right Remote Battery: " + str(right_soc) + "%","white", menu_font, 50, 75, "mainTimer")

    if IPF:
        place_image(right_remote_ipf_image, True)
        place_image(left_remote_ipf_image, True)
        place_image(chief_remote_ipf_image, True)
        place_image(spare_remote_ipf_image, True)
    else:
        place_image(right_remote_nonipf_image, True)
        place_image(left_remote_nonipf_image, True)
        place_image(chief_remote_nonipf_image, True)
        place_image(spare_remote_nonipf_image, True)
    while stayLooped:
        place_text(str(left_soc) + "%", "white", menu_font, 35, 55, "mainTimer")
        place_text(str(chief_soc) + "%", "white", menu_font, 50, 55, "mainTimer")
        place_text(str(right_soc) + "%", "white", menu_font, 65, 55, "mainTimer")
        place_text(str(spare_soc) + "%", "white", menu_font, 90, 55, "mainTimer")
        for event in GAME_EVENTS.get():
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_KP1 or event.key == pygame.K_1:
                    print("user requested to manually connect remotes")
                    # run the autoconnect script.
                    #os.system("python3 /home/pi/Desktop/DRL3/autoconnect.py")  # run the autoconnect script.
                    autoconnect.manual_connect(leftSync, chiefSync, rightSync, spareSync)
                    stayLooped = False
                    system_reset()

                if event.key == pygame.K_KP2 or event.key == pygame.K_2:
                    # resets the bluetooth controller.
                    os.system(
                        "sudo systemctl restart bluetooth.service"
                    )  # run the autoconnect script.
                    stayLooped = False
                    system_reset()
                    
                if event.key == pygame.K_KP3 or event.key == pygame.K_3:
                    if show_main_timer:
                        show_main_timer = False
                    else:
                        show_main_timer = True
                    system_reset()

                if event.key == pygame.K_KP4 or event.key == pygame.K_4:
                    # toggle the infraction cards
                    if IPF:
                        if infractionCards:
                            infractionCards = False
                        else:
                            infractionCards = True
                        stayLooped = False
                    system_reset()

                if event.key == pygame.K_KP_ENTER or event.key == pygame.K_RETURN:  # EXIT CONDITION
                    stayLooped = False
                    system_reset()

                if event.key == pygame.K_ESCAPE:
                    pygame.event.clear()  # remove all events from the queue.
                    pygame.quit()
                    sys.exit()


def get_ip_address(ifname):
    testIP = "8.8.8.8"
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect((testIP, 0))
    ipaddr = s.getsockname()[0]
    return ipaddr


# --------------------------------------------------------------------
def display_ip_address():

    try:
        ip = str(get_ip_address("eth0"))
        return ip

    except:
        try:
            ip = str(get_ip_address("wlan0"))
            return ip

        except:
            ip = "No Connection"
            return ip


# ---------------------------------------------------------------------
def attempt_change():
    # this is the funcation that will handle attempt change events.
    global breakMode, revealDecision, main_timer, attempt_change_image, mainClock, left_arrow_image, right_arrow_image, attempt_change_mode
    # we only want to put an attempt change message if the clock is stopped,
    # and we are not in break mode, and the lights aren't shown.
    if not breakMode and not revealDecision and main_timer.currently_reset:
        attempt_timer_reset()
        # just in case, this removes any attempt selection
        # timers.
        attempt_change_mode = True
        # we are allowed to enter this function, place the attempt change
        # message.
        place_text("00:00", "gray", main_timer_font, 50, 70, "mainTimer")
        # this is the poor mans way to clear the area over the
        # clock.
        draw_background_box("lights", True)
        # draw_background_box("attemptChange") #this colors the entire area of
        # the screen where the arrows will move.
        place_image(attempt_change_image, True)
        # place_image(left_arrow_image, True)
        # place_image(right_arrow_image,True)

        stayLooped = True
        speed = 50  # the speed of the arrows

        rightxLocation = 0
        rightyLocation = dimensions.current_h / 100 * 10  # location of bottom arrow.

        leftxLocation = dimensions.current_w
        leftyLocation = dimensions.current_h / 100 * 23  # location of bottom arrow.

        print("Screen Width: " + str(dimensions.current_w))
        while stayLooped:

            if rightxLocation >= dimensions.current_w + int(right_arrow_image[1][2]):
                rightxLocation = 0
                print("right/toparrow going off screen, resetting position")
            else:
                print("changing location of the RIGHT arrow")
                rightxLocation = rightxLocation + speed  # incrment the arrow
            draw_arrow(
                right_arrow_image, rightxLocation, rightyLocation, "right"
            )  # draw the arrow.

            if leftxLocation <= 0 - int(left_arrow_image[1][2]):
                leftxLocation = dimensions.current_w
                print("left/bottomarrow going off screen, resetting position")
            else:
                print("changing location of the LEFT arrow")
                leftxLocation = leftxLocation - speed  # incrment the arrow
            draw_arrow(
                left_arrow_image, leftxLocation, leftyLocation, "left"
            )  # draw the arrow.

            width = dimensions.current_w
            height = (
                dimensions.current_h / 100
            ) * 30  # just color the top quarter of the screen.
            pygame.display.update((0, 0, width, height))
            # this should update both of the arrow
            # blocks.

            for event in GAME_EVENTS.get():
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE:
                        attempt_change_mode = False
                        stayLooped = False
                        system_reset()  # exit the loop and reset everything.

            mainClock.tick(360)  # maintain system frame rate
            print("Attempt Change Frame Rate: " + str(mainClock.get_fps()))

    print(
        "BreakMode: "
        + str(breakMode)
        + " "
        + "revealDecision: "
        + str(revealDecision)
        + " "
        + "maintimer_reset "
        + str(main_timer.currently_reset)
    )
    if not breakMode and revealDecision and main_timer.currently_reset:
        attempt_timer_reset()
        # just in case, this removes any attempt selection
        # timers.
        print("Attempt Change Submitted during lights being on")
        attempt_change_mode = True  # change it to attempt change mode.
        place_text("00:00", "gray", main_timer_font, 50, 70, "mainTimer")
        # this is the poor mans way to clear the area over the
        # clock.
        place_image(small_attempt_change_image, True)


def clock_event():
    global main_timer, breakMode, attempt_change_mode, show_main_timer
    print("Clock button pressed")
    if main_timer.running or main_timer.empty:
        if breakMode:
            main_timer.pause()  # just pause the clock. this may cause issues with liftingcast sync's.
        else:
            pygame.time.set_timer(main_timer_event, 0)  # Halt the repeating events.
            pygame.event.get(
                main_timer_event
            )  # this should remove any late main timer events in the queue.
            main_timer.reset()  # reset the clock to 1 minute.

            # need to wrap in a try block, only if we are configured for a LC sync.
            if lc.configured:
                try:
                    t3 = Thread(target=lc.reset_liftingcast_clock)
                    t3.daemon = True
                    t3.start()
                    # r = requests.post(lc.reset_clock_url,json=lc.password_data) #reset the liftingcast clock
                    place_image(good_sync_image, True)  # draw the green sync
                except:
                    place_image(no_sync_image, True)  # draw the red sync

            if show_main_timer:
                place_text(
                main_timer.status(), "white", main_timer_font, 50, 70, "mainTimer"
            )  # prints the main timer. #update the timerplace_text

    else:
        pygame.time.set_timer(main_timer_event, 1000)  # Begin the tick.
        print("Starting the Main Timer")
        main_timer.start()
        main_timer.tick()  # go ahead and decremete the first time.
        # need to wrap in a try block, only if we are configured for a LC sync.
        if lc.configured:
            # try:
            t4 = Thread(target=lc.start_liftingcast_clock)
            t4.daemon = True
            t4.start()

            # r = requests.post(lc.start_clock_url,json=lc.password_data) #start the liftingcast clock
            # place_image(good_sync_image, True) #draw the green sync
            # except:
            # place_image(no_sync_image, True) #draw the red sync

        if breakMode and not attempt_change_mode:
            # if we are in break mode, then only print the higher, smaller break timer.
            place_text(
                main_timer.break_status(),
                "white",
                main_timer_break_font,
                50,
                40,
                "breakTimer",
            )
            if main_timer.minutes <= openerChange - 1:
                # we only want to clear the area once, not each
                # time.
                place_text(
                    "00:00", "gray", opener_change_font, 50, 73, "openerChange"
                )  # this is used strictly to clear the space needed for the next message.
                place_text(
                    "NO MORE CHANGES",
                    "red",
                    no_more_changes_font,
                    50,
                    73,
                    "openerChange",
                )
            else:
                place_text(
                    main_timer.openerStatus(),
                    "red",
                    opener_change_font,
                    50,
                    73,
                    "openerChange",
                )
        else:
            if show_main_timer:
                place_text(
                main_timer.status(), "white", main_timer_font, 50, 70, "mainTimer"
            )  # prints the main timer. update the timerplace_text


def get_caps_lock():
    out = subprocess.run(
        ["xset", "-q"], stdout=subprocess.PIPE
    )  # query the OS for the state of the keys
    out_text = out.stdout.decode("utf-8")  # get the result and convert to a string
    match = re.search(
        "Caps Lock:\s*(off|on)", out_text
    )  # use a regex to search for the status (on/off)
    if match.group(1) == "on":
        capsLockOn = True
    else:
        capsLockOn = False
    return capsLockOn


def spare_config():
    # this menu will configure the spare remote.
    global spareSync, IPF
    surface.fill((23, 23, 23))  # color the screen black
    pygame.display.update()  # update the entire screen.

    stayLooped = True
    place_text("SPARE REMOTE CONFIGURATION", "white", menu_font, 50, 10, "mainTimer")
    place_text(
        "Press the red button to cycle through positions",
        "white",
        menu_font,
        50,
        20,
        "mainTimer",
    )
    place_text(
        "Press the white button to select the position",
        "white",
        menu_font,
        50,
        30,
        "mainTimer",
    )

    if IPF:  # initial highlighting of the left remote when the menu starts.
        place_image(left_remote_ipf_selected_image, True)
        place_image(chief_remote_ipf_image, True)
        place_image(right_remote_ipf_image, True)

    else:  # initial highlighting of the left remote when the menu starts.
        place_image(left_remote_nonipf_selected_image, True)
        place_image(chief_remote_nonipf_image, True)
        place_image(right_remote_nonipf_image, True)
    selected = "left"
    while stayLooped:
        if not spareSync:  # the spare remote is disconnected, exit the loop
            stayLooped = False
            system_reset()
            return None

        for event in GAME_EVENTS.get():
            if event.type == pygame.KEYDOWN:
                if (
                    event.key == pygame.K_v or event.key == pygame.K_m
                ):  # IPF White button pushed, which means select the desired remote.
                    # print a message asking for confirmation.
                    # place_text("Press the red button to cycle through positions", "gray",menu_font, 50,20,"mainTimer")
                    # place_text("Press the white button to select the side", "gray",menu_font, 50,30,"mainTimer")
                    draw_background_box("spareMenu", True)
                    place_text(
                        "Press the white button to confirm selection as:",
                        "white",
                        menu_font,
                        50,
                        20,
                        "mainTimer",
                    )
                    place_text(
                        selected + " remote", "red", menu_font, 50, 30, "mainTimer"
                    )
                    place_text(
                        "Press the red button to return to position selection",
                        "white",
                        menu_font,
                        50,
                        40,
                        "mainTimer",
                    )
                    confirm_selection = False
                    while (
                        not confirm_selection
                    ):  # wait for the user to make a decision.
                        if (
                            not spareSync
                        ):  # remote has been disconnected, exit the loop.
                            confirm_selection = True
                            stayLooped = False
                            system_reset()
                            return None
                        for event in GAME_EVENTS.get():
                            if event.type == pygame.KEYDOWN:
                                if event.key == pygame.K_v or event.key == pygame.K_m:
                                    confirm_selection = True
                                    stayLooped = False
                                    system_reset()  # exit the menu
                                    return selected  # return either, "left", "chief", or "right"
                                    # add in config output stuff.
                                if (
                                    event.key == pygame.K_b
                                ):  # this means the user doesnt want to confirm their decision, go back.
                                    confirm_selection = True
                                    draw_background_box("spareMenu", True)
                                    place_text(
                                        "Press the red button to cycle through positions",
                                        "white",
                                        menu_font,
                                        50,
                                        20,
                                        "mainTimer",
                                    )
                                    place_text(
                                        "Press the white button to select the position",
                                        "white",
                                        menu_font,
                                        50,
                                        30,
                                        "mainTimer",
                                    )

                if event.key == pygame.K_b:  # red button.
                    # cycle the selected images.
                    if selected == "left":
                        selected = "chief"
                        if (
                            IPF
                        ):  # if the set is configured as an IPF set, draw the appropriate remote images
                            place_image(
                                left_remote_ipf_image, True
                            )  # make the left remote white
                            place_image(
                                chief_remote_ipf_selected_image, True
                            )  # select the chief remote
                        else:
                            place_image(
                                left_remote_nonipf_image, True
                            )  # make the left remote white
                            place_image(
                                chief_remote_nonipf_selected_image, True
                            )  # select the chief remote

                    elif selected == "chief":
                        selected = "right"
                        if IPF:
                            place_image(
                                chief_remote_ipf_image, True
                            )  # make the chief remote white
                            place_image(
                                right_remote_ipf_selected_image, True
                            )  # select the right remote
                        else:
                            place_image(
                                chief_remote_nonipf_image, True
                            )  # make the chief remote white
                            place_image(
                                right_remote_nonipf_selected_image, True
                            )  # select the right remote

                    elif selected == "right":
                        selected = "left"
                        if IPF:
                            place_image(
                                right_remote_ipf_image, True
                            )  # select the right remote
                            place_image(
                                left_remote_ipf_selected_image, True
                            )  # select the left remote
                        else:
                            place_image(
                                right_remote_nonipf_image, True
                            )  # select the right remote
                            place_image(
                                left_remote_nonipf_selected_image, True
                            )  # select the left remote

                if event.key == pygame.K_KP_ENTER:  # EXIT CONDITION
                    stayLooped = False
                    system_reset()

                if event.key == pygame.K_ESCAPE:
                    pygame.event.clear()  # remove all events from the queue.
                    pygame.quit()
                    sys.exit()


main_timer = clock(1, 0)  # initialize the main timer.
attempt_timer1 = clock(0, 0)  # initialize the left most attempt timer.
attempt_timer2 = clock(0, 0)
attempt_timer3 = clock(0, 0)

# These are custom defined user events, that will be triggered in the queue
blinking_text_event = pygame.USEREVENT
main_timer_event = pygame.USEREVENT + 1  # custom user event.
attempt_timer1_event = (
    pygame.USEREVENT + 2
)  # this happnes every second to decimate the attempt 1 timer
attempt_timer2_event = (
    pygame.USEREVENT + 3
)  # this happnes every second to decimate the attempt 1 timer
attempt_timer3_event = (
    pygame.USEREVENT + 4
)  # this happnes every second to decimate the attempt 1 timer
reveal_lights_event = (
    pygame.USEREVENT + 5
)  # this event happens 2 seconds after the lights are shown.
clear_lights_event = (
    pygame.USEREVENT + 6
)  # this event happens 10 seconds after the lights are shown
watchdog_event = (
    pygame.USEREVENT + 7
)  # this will be the timer thats checks for inadvertant button pushes.
sync_check_event = pygame.USEREVENT


sync_check_postable_event = pygame.event.Event(sync_check_event)
input_blocked = False  # this will prevent referee remotes from triggering decisions

# Boolean values used to determine the current sync status from the remotes.
leftSync = False
chiefSync = False
rightSync = False
spareSync = False

spare_not_configured = True

left_currently_desync = True
chief_currently_desync = True
right_currently_desync = True
spare_currently_desync = True

breakMode = False

attempt_change_mode = False


# Load in All the Images used in the display.
drlCorner = format_image("/home/pi/Desktop/DRL3/DRLimages/DRLcorner.png", 15, 10, 93)

leftbatt100_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery100.png", 3, 8, 97.5
)  # left referee
leftbatt75_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery75.png", 3, 8, 97.5
)  # left referee
leftbatt50_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery50.png", 3, 8, 97.5
)  # left referee
leftbatt25_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery25.png", 3, 8, 97.5
)  # left referee

chiefbatt100_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery100.png", 3, 12, 97.5
)  # chief referee
chiefbatt75_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery75.png", 3, 12, 97.5
)  # chief referee
chiefbatt50_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery50.png", 3, 12, 97.5
)  # chief referee
chiefbatt25_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery25.png", 3, 12, 97.5
)  # chief referee

rightbatt100_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery100.png", 3, 16, 97.5
)  # right referee
rightbatt75_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery75.png", 3, 16, 97.5
)  # right referee
rightbatt50_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery50.png", 3, 16, 97.5
)  # right referee
rightbatt25_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/battery25.png", 3, 16, 97.5
)  # right referee


# Attempt and Lifter Clock Labels

offset = 2.5  # offset variable used for fine tuning adjustement of the bottom right half of the screen.
yoffset = 3
e = 1  # need to go in and remove these after image resolution tests.

z = 2
lifterID_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/liftertimerID.png", 7, 63 + offset, 91.5 + yoffset
)
attemptID_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/attempttimerID.png",
    7,
    83 + offset,
    91.5 + +yoffset,
)
# Attempt Clocks
attempt1_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/attempttimerbox.png",
    8,
    76 + offset + e,
    83 + yoffset,
)  # put it on the screen.
attempt2_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/attempttimerbox.png",
    8,
    83 + offset + e,
    83 + yoffset,
)
attempt3_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/attempttimerbox.png",
    8,
    90 + offset + e,
    83 + yoffset,
)
# Left Referee Decisions
leftGoodlift_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/goodlift.png", 40, 15, 20 + z
)  # left main good lift circle "check"
leftNolift_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/nolift.png", 40, 15, 20 + z
)  # left main no lift square "X"
leftRed_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/redcard.png", 8.5, 7, 46 + z
)  # left red card
leftBlue_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/bluecard.png", 8.5, 15, 46 + z
)  # left blue card
leftYellow_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/yellowcard.png", 8.5, 23, 46 + z
)  # left yellow card
# Chief Referee Decisions
chiefGoodlift_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/goodlift.png", 40, 50, 20 + z
)  # chief main good lift circle "check"
chiefNolift_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/nolift.png", 40, 50, 20 + z
)  # chief main no lift square "X"
chiefRed_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/redcard.png", 8.5, 42, 46 + z
)  # chief red card
chiefBlue_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/bluecard.png", 8.5, 50, 46 + z
)  # chief blue card
chiefYellow_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/yellowcard.png", 8.5, 58, 46 + z
)  # chief yellow card
# Right Referee Decisions
rightGoodlift_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/goodlift.png", 40, 85, 20 + z
)  # right main good lift circle "check"
rightNolift_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/nolift.png", 40, 85, 20 + z
)  # right main no lift square "X"
rightRed_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/redcard.png", 8.5, 77, 46 + z
)  # right red card
rightBlue_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/bluecard.png", 8.5, 85, 46 + z
)  # right blue card
rightYellow_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/yellowcard.png", 8.5, 93, 46 + z
)  # right yellow card
# Decision Circles
leftDecision_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/referee_input.png", 40, 15, 20 + z
)  # draw the left referee decision dot
chiefDecision_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/referee_input.png", 40, 50, 20 + z
)  # draw the chief referee decision dot
rightDecision_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/referee_input.png", 40, 85, 20 + z
)  # draw the right referee decision dot
# Desync Symbols
leftDesync_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/desync.png", 40, 15, 20 + z
)
chiefDesync_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/desync.png", 40, 50, 20 + z
)
rightDesync_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/desync.png", 40, 85, 20 + z
)
# Break Mode Frames
break_mode_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/flightstartbox.png", 70, 50, 50
)
# Atempt Change Images
attempt_change_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/change.png", 40, 50, 50
)
small_attempt_change_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/change.png", 20, 50, 70
)

chief_remote_ipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/IPF_Chief.png", 35, 50, 50
)
left_remote_ipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/IPF_Left-Right.png", 35, 35, 50
)
right_remote_ipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/IPF_Left-Right.png", 35, 65, 50
)
spare_remote_ipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/IPF_Chief.png", 35, 90, 50
)

# DRL remote images used for the main menu.
chief_remote_nonipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/non_ipf_chief.png", 35, 50, 50
)
left_remote_nonipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/non_ipf_left-right.png", 35, 35, 50
)
right_remote_nonipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/non_ipf_left-right.png", 35, 65, 50
)
spare_remote_nonipf_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/non_ipf_chief.png", 35, 90, 50
)

# DRL remote images used for the spare remote config menu
# IPF Remotes
left_remote_ipf_selected_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/IPF_Left-Right_selected.png", 35, 35, 50
)
chief_remote_ipf_selected_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/IPF_Chief_selected.png", 35, 50, 50
)
right_remote_ipf_selected_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/IPF_Left-Right_selected.png", 35, 65, 50
)
# non IPF
left_remote_nonipf_selected_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/non_ipf_left-right_selected.png", 35, 35, 50
)
chief_remote_nonipf_selected_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/non_ipf_chief_selected.png", 35, 50, 50
)
right_remote_nonipf_selected_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/non_ipf_left-right_selected.png", 35, 65, 50
)

# Attempt Change Arrows
left_arrow_image = init_arrow("/home/pi/Desktop/DRL3/DRLimages/changeicon_left.png")
right_arrow_image = init_arrow("/home/pi/Desktop/DRL3/DRLimages/changeicon_right.png")

# Liftingcast Sync Icons
no_sync_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/changeicon_red.png", 4, 22, 97
)  # red sync icon.
good_sync_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/changeicon_green.png", 4, 22, 97
)  # green sync icon.
lc_sync_image = format_image(
    "/home/pi/Desktop/DRL3/DRLimages/changeicon_gray.png", 4, 22, 97
)  # gray sync icon.


# Pre Render the background boxes for the arrows.
arrow_width = int(dimensions.current_w)
arrow_height = int((dimensions.current_h / 100) * 16.5)
# just color the top quarter of the screen.

top_arrow_surface = pygame.Surface((arrow_width, arrow_height))
bottom_arrow_surface = pygame.Surface((arrow_width, arrow_height))

top_arrow_surface.fill((23, 23, 23))  # fill the surface.
bottom_arrow_surface.fill((23, 23, 23))


# Pre render the Fonts.
main_timer_font = pygame.font.Font(
    "/home/pi/Desktop/DRL3/TitilliumWeb-Bold.ttf", int(dimensions.current_w / 100 * 25)
)
attempt_timer_font = pygame.font.Font(
    "/home/pi/Desktop/DRL3/TitilliumWeb-Bold.ttf", int(dimensions.current_w / 100 * 4)
)
main_timer_break_font = pygame.font.Font(
    "/home/pi/Desktop/DRL3/TitilliumWeb-Bold.ttf", int(dimensions.current_w / 100 * 15)
)  # used to be 20
opener_change_font = pygame.font.Font(
    "/home/pi/Desktop/DRL3/TitilliumWeb-Bold.ttf", int(dimensions.current_w / 100 * 11)
)
no_more_changes_font = pygame.font.Font(
    "/home/pi/Desktop/DRL3/TitilliumWeb-Bold.ttf", int(dimensions.current_w / 100 * 5)
)
menu_font = pygame.font.Font(
    "/home/pi/Desktop/DRL3/TitilliumWeb-Bold.ttf", int(dimensions.current_w / 100 * 3)
)


surface.fill((23, 23, 23))  # color the screen black

# Battery and DRL Icons
place_image(drlCorner, False)

if show_main_timer:
    place_image(lifterID_image, False)
place_image(attemptID_image, False)
place_image(leftDesync_image, False)
place_image(chiefDesync_image, False)
place_image(rightDesync_image, False)
resetLights()  # reset all the booleans associated with the control logic.


if show_main_timer: 
    place_text(
    main_timer.status(), "white", main_timer_font, 50, 70, "mainTimer"
)  # prints the main timer.


pygame.display.update()
print("display updated-main init")
pygame.time.set_timer(sync_check_event, 5000)
# check every 5 seconds if the remotes are connected.

# initial battery percentage initializations.
left_soc = 0
chief_soc = 0
right_soc = 0
spare_soc = 0

t = Thread(target=check_bluetooth_status)
t.daemon = True
t.start()  # start the bluetooth thread.

pygame.event.post(
    sync_check_postable_event
)  # check for remote connections at the very beginning!


capsLockOn = get_caps_lock()  # used for the attempt change button illumination.
if not capsLockOn:  # if caps lock is off, turn it on.
    os.system("xte 'key Caps_Lock' -x:0")

while True:
    # print("we are in the main loop")
    # we should constantly check for a spare remote connection event.

    if lc.good_sync and lc.configured:
        print("Drawing Green LC Sync from the Main Thread")
        place_image(good_sync_image, True)  # draw the green sync#draw the green icon.
        lc.good_sync = False  # reset the variable so we don't constantly draw it.

    if lc.bad_sync and lc.configured:
        print("Drawing Reed LC Sync from the Main Thread")
        place_image(no_sync_image, True)  # draw the green sync#draw the green icon.
        lc.bad_sync = False  # reset the variable so we don't constantly draw it.

    if (
        spareSync and spare_not_configured
    ):  # only configure the spare if its connected and hasn't been configured.
        print("Spare remote connected! configuring...\n\n\n")
        spare_not_configured = False  # we don't want to enter this state again.
        spare_side = spare_config()

    for event in GAME_EVENTS.get():

        if event.type == sync_check_event and not revealDecision:
            # sync check will also double as the callback function that clears a liftingcast stync icon status.

            if (
                lc.configured
            ):  # if we are configured to a liftingcast server, draw the gray icon.
                place_image(
                    lc_sync_image, True
                )  # draw the normal sync icon, overwriting whatever was there last.

            # check if the remotes are connected, if not draw the desync icon
            # in its place.
            print("")
            print("Sync Check Event! Checking Sync Status:")
            print("Break Mode status: " + str(breakMode))
            if (
                not leftSync
            ):  # if leftSync = True, don't draw the caution triangle. when a ping event comes in leftSync = True
                print("left remote is desynced...")
                print("Left currently desync status: " + str(left_currently_desync))
                if (
                    not breakMode and not left_currently_desync
                ):  # if its not break mode, go ahead and draw the caution logo
                    print("drawing caution logo on left side")
                    draw_background_box("left", True)
                    reset_leftLights()
                    place_image(leftDesync_image, True)
                    left_currently_desync = True  # this basically means we just drew the caution logo, so don't overide it next loop.

                draw_background_box("leftBatt", True)
            else:  # remove the left battery from the screen if leftSync = False
                if left_currently_desync == True and not breakMode:
                    draw_background_box("left", True)  # clear the desync icon.
                # place_image(leftbatt25_image,True)
                leftSync = True
                left_currently_desync = False
                draw_background_box("leftBatt", False)
                # remove the chief battery icon from the
                # screen
                # left_soc = get_battery_percent(leftMac)
                print("left battery percent is: " + str(left_soc) + "%")
                # try:
                if type(left_soc) == int:
                    draw_background_box("leftBatt", False)
                    if left_soc > 75:
                        print("drawing left 100% battery icon")
                        place_image(leftbatt100_image, True)
                    elif left_soc <= 75 and left_soc > 50:
                        print("drawing left 75% battery icon")
                        place_image(leftbatt75_image, True)
                    elif left_soc <= 50 and left_soc > 25:
                        print("drawing left 50% battery icon")
                        place_image(leftbatt50_image, True)
                    elif left_soc <= 25 and left_soc > 0:
                        print("drawing left 25% battery icon")
                        place_image(leftbatt25_image, True)
                print("")
            # leftSync = False #set it false, the next remote ping should
            # override this value before the next loop.

            # bl = Bluetoothctl()
            # chiefSync = bl.is_connected(
            # chiefMac)  # check if the chief remote is connected.
            if not chiefSync:  # and not chief_currently_desync:
                print("chief remote is desynced...")
                print("Chief currently desync status: " + str(chief_currently_desync))
                if (
                    not breakMode and not chief_currently_desync
                ):  # if its not break mode, then go ahead and draw.
                    print("drawing caution logo on chief side")
                    draw_background_box("chief", True)
                    reset_chiefLights()
                    place_image(chiefDesync_image, True)
                    chief_currently_desync = True
                draw_background_box("chiefBatt", True)
                # remove the left battery from the screen
            else:
                if chief_currently_desync == True and not breakMode:
                    draw_background_box("chief", True)  # clear the desync icon
                # place_image(chiefbatt50_image, True)
                chiefSync = True
                chief_currently_desync = False
                draw_background_box("chiefBatt", False)
                # remove the chief battery icon from the
                # screen
                # chief_soc = get_battery_percent(chiefMac)
                print("chief battery percent is: " + str(chief_soc) + "%")
                if type(chief_soc) == int:
                    draw_background_box("chiefBatt", False)
                    if chief_soc > 75:
                        print("drawing chief 100% battery icon")
                        place_image(chiefbatt100_image, True)
                    elif chief_soc <= 75 and chief_soc > 50:
                        print("drawing chief 75% battery icon")
                        place_image(chiefbatt75_image, True)
                    elif chief_soc <= 50 and chief_soc > 25:
                        print("drawing chief 50% battery icon")
                        place_image(chiefbatt50_image, True)
                    elif chief_soc <= 25 and chief_soc > 0:
                        print("drawing chief 25% battery icon")
                        place_image(chiefbatt25_image, True)
                print("")
            # chiefSync = False
            print("checking if right remote is connected")
            # bl = Bluetoothctl()
            # rightSync = bl.is_connected(
            # rightMac)  # check if the right remote is connected.
            if not rightSync:  # and not right_currently_desync:
                print("right remote is desynced...")
                print("right currently desync status: " + str(right_currently_desync))
                if (
                    not breakMode and not right_currently_desync
                ):  # if not break mode, then go ahead and draw.
                    print("drawing caution logo on right side")
                    draw_background_box(
                        "right", True
                    )  # this should handle the case where a remote de syncs mid decision.
                    reset_rightLights()
                    place_image(rightDesync_image, True)
                    right_currently_desync = True
                draw_background_box("rightBatt", True)
                # remove the left battery from the screen

            else:  # if the remote is synced, draw the proper stuff
                if right_currently_desync == True and not breakMode:
                    draw_background_box("right", True)  # clear the desync icon
                # place_image(rightbatt100_image,True) #we are polled, so keep
                # the battery icon up.
                # rightSync = True
                right_currently_desync = False
                print("checking bluetooth stack for right battery percentage")
                # right_soc = get_battery_percent(rightMac)
                print("right battery percent is: " + str(right_soc) + "%")

                if type(right_soc) == int:
                    draw_background_box("rightBatt", False)
                    if right_soc > 75:
                        print("drawing right 100% battery icon")
                        place_image(rightbatt100_image, True)
                    elif right_soc <= 75 and right_soc > 50:
                        print("drawing right 75% battery icon")
                        place_image(rightbatt75_image, True)
                    elif right_soc <= 50 and right_soc > 25:
                        print("drawing right 50% battery icon")
                        place_image(rightbatt50_image, True)
                    elif right_soc <= 25 and right_soc > 0:
                        print("drawing right 25% battery icon")
                        place_image(rightbatt25_image, True)
            print("")
            # rightSync = False
            print("Sync Status Check Complete")
            print("")
            # reset the booleans so if the remote doesnt re write them then we
            # can tell.

            # leftSync = False
            # chiefSync = False
            # rightSync = False

        if event.type == attempt_timer1_event:
            print("attempt timer1_event")
            attempt_timer1.tick()
            place_text(
                attempt_timer1.seconds,
                "black",
                attempt_timer_font,
                76 + offset + e,
                83 + yoffset,
                "attempt1",
            )  # print the new values on the screen.
            if attempt_timer1.empty:
                # if the clock is empty, then clear the queue from future
                # repeat calls.
                pygame.time.set_timer(
                    attempt_timer1_event, 0
                )  # Halt the repeating events.
                pygame.event.get(attempt_timer1_event)
                # this should remove any late main timer
                # events in the queue.
                place_text(
                    attempt_timer1.seconds,
                    "gray",
                    attempt_timer_font,
                    76 + offset + e,
                    83 + yoffset,
                    "attempt1",
                )  # print the new values on the screen.
                # we need to clear the textt

        if event.type == attempt_timer2_event:
            print("attempt timer2_event")
            attempt_timer2.tick()
            print("attempt timer 2 just ticked")
            place_text(
                attempt_timer2.seconds,
                "black",
                attempt_timer_font,
                83 + offset + e,
                83 + yoffset,
                "attempt2",
            )  # print the new values on the screen.
            if attempt_timer2.empty:
                print("Attempt Timer 2 is empty")
                # if the clock is empty, then clear the queue from future
                # repeat calls.
                pygame.time.set_timer(
                    attempt_timer2_event, 0
                )  # Halt the repeating events.
                pygame.event.get(attempt_timer2_event)
                # this should remove any late main timer
                # events in the queue.
                place_text(
                    attempt_timer2.seconds,
                    "gray",
                    attempt_timer_font,
                    83 + offset + e,
                    83 + yoffset,
                    "attempt2",
                )  # print the new values on the screen.
                # we need to clear the textt

        if event.type == attempt_timer3_event:
            print("attempt timer3_event")
            attempt_timer3.tick()
            print("attempt timer 3 just ticked")
            place_text(
                attempt_timer3.seconds,
                "black",
                attempt_timer_font,
                90 + offset + e,
                83 + yoffset,
                "attempt3",
            )  # print the new values on the screen.
            if attempt_timer3.empty:
                print("Attempt Timer 3 is empty")
                # if the clock is empty, then clear the queue from future
                # repeat calls.
                pygame.time.set_timer(
                    attempt_timer3_event, 0
                )  # Halt the repeating events.
                pygame.event.get(attempt_timer3_event)
                # this should remove any late main timer
                # events in the queue.
                place_text(
                    attempt_timer3.seconds,
                    "gray",
                    attempt_timer_font,
                    90 + offset + e,
                    83 + yoffset,
                    "attempt3",
                )  # print the new values on the screen.
                # we need to clear the textt

        if event.type == main_timer_event:
            print("main timer tick event...")
            main_timer.tick()  # count down.
            if not breakMode and not attempt_change_mode:  # regular operation
                print("Printing Main Timer - Regular Operation")
                place_text(
                    main_timer.status(), "white", main_timer_font, 50, 70, "mainTimer"
                )
                # prints the main timer. #update the timerplace_text

            else:  # this means we are in a break, and need to place the clock  up higher.
                if (
                    main_timer.minutes == 0
                    and main_timer.seconds == 0
                    and main_timer.hours == 0
                ):
                    print("Break Over, exiting to normal system operation")
                    system_reset()
                    # reset the system and get back to normal
                    # operation.
                elif not attempt_change_mode:
                    print("placing break clocks on screen")
                    place_text(
                        main_timer.break_status(),
                        "white",
                        main_timer_break_font,
                        50,
                        40,
                        "breakTimer",
                    )
                    if main_timer.minutes > openerChange - 1 or main_timer.hours > 0:
                        place_text(
                            main_timer.openerStatus(),
                            "red",
                            opener_change_font,
                            50,
                            73,
                            "openerChange",
                        )
                    else:
                        print("displaying NO MORE CHANGES")
                        print("Hours: " + str(main_timer.hours))
                        print("Minutes: " + str(main_timer.minutes))
                        print("Seconds: " + str(main_timer.seconds))
                        if (
                            main_timer.minutes == openerChange - 1
                            and main_timer.seconds == 59
                        ):
                            # we only want to clear the area once, not each
                            # time.
                            place_text(
                                "0:00:00",
                                "gray",
                                opener_change_font,
                                50,
                                73,
                                "openerChange",
                            )
                            # this is used strictly to clear the
                            # space needed for the next message.
                            place_text(
                                "NO MORE CHANGES",
                                "red",
                                no_more_changes_font,
                                50,
                                73,
                                "openerChange",
                            )

        if event.type == watchdog_event:
            # This has been called because we need to check if the button press that triggered it was inadvertant.
            # check if 2 decisions have come in.

            if leftDecision and not chiefDecision and not rightDecision:
                resetLights()
                draw_background_box("left", True)
                # remove the left decision.
            elif not leftDecision and chiefDecision and not rightDecision:
                # remove the chief decision
                resetLights()
                draw_background_box("chief", True)
            elif not leftDecision and not chiefDecision and rightDecision:
                # remove the right decision
                resetLights()
                draw_background_box("right", True)
            else:
                print("No need to do anything, watchdog ending")
                # at least 2 decisions have been entered, do nothing, and
                # remove the timer from the queue.
            pygame.time.set_timer(watchdog_event, 0)  # Halt the repeating events.
            pygame.event.get(watchdog_event)
            # clear the queue of the repeating events.

        if event.type == reveal_lights_event:
            print("Revealing the lights!")
            odometer.increase_mileage()
            pygame.time.set_timer(reveal_lights_event, 0)  # Halt the repeating events.
            pygame.event.get(reveal_lights_event)
            # this should remove any late timer events in the
            # queue.
            if leftGoodlift:
                place_image(leftGoodlift_image, False)
            if chiefGoodlift:
                place_image(chiefGoodlift_image, False)
            if rightGoodlift:
                place_image(rightGoodlift_image, False)

            if leftRed:
                place_image(leftNolift_image, False)
                if IPF and infractionCards:
                    place_image(leftRed_image, False)

            if leftBlue:
                place_image(leftNolift_image, False)
                if IPF and infractionCards:
                    place_image(leftBlue_image, False)
            if leftYellow:
                place_image(leftNolift_image, False)
                if IPF and infractionCards:
                    place_image(leftYellow_image, False)

            if chiefRed:
                place_image(chiefNolift_image, False)
                if IPF and infractionCards:
                    place_image(chiefRed_image, False)

            if chiefBlue:
                place_image(chiefNolift_image, False)
                if IPF and infractionCards:
                    place_image(chiefBlue_image, False)
            if chiefYellow:
                place_image(chiefNolift_image, False)
                if IPF and infractionCards:
                    place_image(chiefYellow_image, False)

            if rightRed:
                place_image(rightNolift_image, False)
                if (
                    IPF and infractionCards
                ):  # only draw the infraction card if its an IPF contest
                    place_image(rightRed_image, False)

            if rightBlue:
                place_image(rightNolift_image, False)
                if IPF and infractionCards:
                    place_image(rightBlue_image, False)

            if rightYellow:
                place_image(rightNolift_image, False)
                if IPF and infractionCards:
                    place_image(rightYellow_image, False)

            pygame.display.update(
                (0, 0, dimensions.current_w, (dimensions.current_h / 100) * 55)
            )  # this update reveals all aspects of the lights at once!
            main_timer.reset()  # reset the timer
            if show_main_timer:
                place_text(
                main_timer.status(), "white", main_timer_font, 50, 70, "mainTimer"
            )  # prints the main timer. #update the timerplace_text
            if lc.configured:  # if liftingcast configuration is setup
                try:
                    t1 = Thread(
                        target=lc.drl_decisions_to_liftingcast_decisions,
                        args=[
                            leftGoodlift,
                            leftRed,
                            leftBlue,
                            leftYellow,
                            chiefGoodlift,
                            chiefRed,
                            chiefBlue,
                            chiefYellow,
                            rightGoodlift,
                            rightRed,
                            rightBlue,
                            rightYellow,
                        ],
                    )
                    t1.daemon = True
                    t1.start()  # start the liftingcast update thread.
                    # lc.drl_decisions_to_liftingcast_decisions(leftGoodlift, leftRed, leftBlue,leftYellow,chiefGoodlift,chiefRed,chiefBlue,chiefYellow,rightGoodlift,rightRed, rightBlue,rightYellow)
                    print("decision detected, attempting to post to liftingcast")
                    place_image(good_sync_image, True)  # draw the red sync
                except:
                    place_image(no_sync_image, True)

            # set a 10 second timer to clear the lights.
            pygame.time.set_timer(clear_lights_event, 10000)
            print("Timer set to clear lights")
            input_blocked = True  # disregard input for 10 seconds.
            assign_timer_spot()

        if event.type == clear_lights_event:
            print("Clearing the lights")
            # Clear out the decision from the previous lifter.
            pygame.time.set_timer(clear_lights_event, 0)  # Halt the repeating events.
            pygame.event.get(clear_lights_event)
            # this should remove any late timer events in the
            # queue.
            input_blocked = False  # enable remote input again.
            resetLights()
            # now we need to clean the top half of the screen.
            draw_background_box("lights", True)
            print("Clearing Lights, posting sync check event")
            print(
                "Clear lights event, attempt_change_mode status: "
                + str(attempt_change_mode)
            )
            if attempt_change_mode:
                print(
                    "Attempt change submitted when lights were on, transfering to attempt change function"
                )
                # this means an attempt change event came in while the lights
                # were up, go to attempt change mode at the end.
                attempt_change()
            pygame.event.post(sync_check_postable_event)
            # check for any de syncs when the lights were
            # shown.

        if event.type == pygame.KEYDOWN:

            if event.key == pygame.K_c or event.key == pygame.K_KP_MINUS:
                if show_main_timer:
                    clock_event()

            # ---------------------SPARE REMOTE INPUTS-------------------
            # -----------------------------------------------------------
            # -----------------------------------------------------------
            # -----------------IPF SPARE GREEN BUTTON--------------------
            if event.key == pygame.K_q and not spare_not_configured:
                if spare_side == "chief":
                    clock_event()  # trigger the clock becuase this remote is a spare.

            # -----------IPF SPARE WHITE BUTTON or USPA GREEN BUTTON-----
            if (
                event.key == pygame.K_v
                and not input_blocked
                and not spare_not_configured
            ):
                # this is a spare remote IPF white button/ USPA clock button

                if (
                    IPF
                ):  # if this set is an IPF remote, the spare top right button is the white button.
                    if (
                        spare_side == "left"
                    ):  # if the spare is configured as a left remote
                        leftGoodlift = True
                        leftRed = False
                        leftBlue = False
                        leftYellow = False
                        leftDecision = True
                        place_image(leftDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)
                        # need to add some de sync stuff.

                    elif (
                        spare_side == "chief"
                    ):  # if the spare is configured as a chief remote
                        chiefGoodlift = True
                        chiefRed = False
                        chiefBlue = False
                        chiefYellow = False
                        chiefDecision = True
                        place_image(chiefDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)

                    elif (
                        spare_side == "right"
                    ):  # if the spare is configured as a right remote
                        rightGoodlift = True
                        rightRed = False
                        rightBlue = False
                        rightYellow = False
                        rightDecision = True
                        place_image(rightDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)
                else:  # this is a non IPF set, trigger the clock!
                    if spare_side == "chief":
                        clock_event()

            # -------------IPF & USPA SPARE RED BUTTON-------------------
            if (
                event.key == pygame.K_b
                and not input_blocked
                and not spare_not_configured
            ):
                if spare_side == "left":  # if the spare is configured as a left remote
                    leftRed = True
                    leftGoodlift = False
                    leftDecision = True
                    place_image(leftDecision_image, True)
                    pygame.time.set_timer(watchdog_event, 5000)
                    # need to add some de sync stuff.

                elif (
                    spare_side == "chief"
                ):  # if the spare is configured as a chief remote
                    chiefRed = True
                    chiefGoodlift = False
                    chiefDecision = True
                    place_image(chiefDecision_image, True)
                    pygame.time.set_timer(watchdog_event, 5000)

                elif (
                    spare_side == "right"
                ):  # if the spare is configured as a right remote
                    rightRed = True
                    rightGoodlift = False
                    rightDecision = True
                    place_image(rightDecision_image, True)
                    pygame.time.set_timer(watchdog_event, 5000)

            # -----------------IPF SPARE BLUE BUTTON---------------------
            if (
                event.key == pygame.K_n
                and not input_blocked
                and not spare_not_configured
            ):
                if spare_side == "left":  # if the spare is configured as a left remote
                    leftBlue = True
                    leftGoodlift = False
                    leftDecision = True
                    place_image(leftDecision_image, True)
                    pygame.time.set_timer(watchdog_event, 5000)
                    # need to add some de sync stuff.

                elif (
                    spare_side == "chief"
                ):  # if the spare is configured as a chief remote
                    chiefBlue = True
                    chiefGoodlift = False
                    chiefDecision = True
                    place_image(chiefDecision_image, True)
                    pygame.time.set_timer(watchdog_event, 5000)

                elif (
                    spare_side == "right"
                ):  # if the spare is configured as a right remote
                    rightBlue = True
                    rightGoodlift = False
                    rightDecision = True
                    place_image(rightDecision_image, True)
                    pygame.time.set_timer(watchdog_event, 5000)

            # ------IPF SPARE YELLOW BUTTON or USPA SPARE WHITE BUTTON---
            if (
                event.key == pygame.K_m
                and not input_blocked
                and not spare_not_configured
            ):
                if IPF:
                    if (
                        spare_side == "left"
                    ):  # if the spare is configured as a left remote
                        leftYellow = True
                        leftGoodlift = False
                        leftDecision = True
                        place_image(leftDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)
                        # need to add some de sync stuff.

                    elif (
                        spare_side == "chief"
                    ):  # if the spare is configured as a chief remote
                        chiefYellow = True
                        chiefGoodlift = False
                        chiefDecision = True
                        place_image(chiefDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)

                    elif (
                        spare_side == "right"
                    ):  # if the spare is configured as a right remote
                        rightYellow = True
                        rightGoodlift = False
                        rightDecision = True
                        place_image(rightDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)

                else:  # this is a USPA remote, which has a white button in place of "M"
                    if (
                        spare_side == "left"
                    ):  # if the spare is configured as a left remote
                        leftGoodlift = True
                        leftRed = False
                        leftBlue = False
                        leftYellow = False
                        leftDecision = True
                        place_image(leftDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)
                        # need to add some de sync stuff.

                    elif (
                        spare_side == "chief"
                    ):  # if the spare is configured as a chief remote
                        chiefGoodlift = True
                        chiefRed = False
                        chiefBlue = False
                        chiefYellow = False
                        chiefDecision = True
                        place_image(chiefDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)

                    elif (
                        spare_side == "right"
                    ):  # if the spare is configured as a right remote
                        rightGoodlift = True
                        rightRed = False
                        rightBlue = False
                        rightYellow = False
                        rightDecision = True
                        place_image(rightDecision_image, True)
                        pygame.time.set_timer(watchdog_event, 5000)

            # ----------------REGULAR REMOTE INPUT-----------------------
            # -----------------------------------------------------------
            # -----------------------------------------------------------
            # -------------------IPF LEFT WHITE--------------------------
            if event.key == pygame.K_w and not input_blocked:
                if (
                    left_currently_desync
                ):  # if there is a caution triangle in the spot, override it.
                    draw_background_box("left", True)
                leftGoodlift = True
                leftRed = False
                leftBlue = False
                leftYellow = False
                leftDecision = True
                place_image(leftDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                leftSync = True
                left_currently_desync = False

            # ------------IPF & USPA LEFT RED BUTTON---------------------
            if event.key == pygame.K_a and not input_blocked:
                if left_currently_desync:
                    draw_background_box("left", True)
                leftRed = True
                leftGoodlift = False
                leftDecision = True
                place_image(leftDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                leftSync = True
                left_currently_desync = False

            # ----------------IPF LEFT BLUE BUTTON----------------------
            if event.key == pygame.K_s and not input_blocked and IPF:
                if left_currently_desync:
                    draw_background_box("left", True)
                leftBlue = True
                leftGoodlift = False
                leftDecision = True
                place_image(leftDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                leftSync = True
                left_currently_desync = False

            # --------IPF LEFT YELLOW or USPA WHITE BUTTON---------------
            if event.key == pygame.K_d and not input_blocked:
                if left_currently_desync:
                    draw_background_box("left", True)
                if IPF:
                    leftYellow = True
                    leftGoodlift = False
                else:
                    leftRed = False
                    leftGoodlift = True  # this is a non-IPF white light
                leftDecision = True
                place_image(leftDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                leftSync = True
                left_currently_desync = False

            # ---------IPF CHIEF WHITE or USPA GREEN BUTTON--------------
            if event.key == pygame.K_t:
                if chief_currently_desync:
                    draw_background_box("chief", True)

                if IPF and not input_blocked:  # ipf white button
                    chiefGoodlift = True
                    chiefRed = False
                    chiefBlue = False
                    chiefYellow = False
                    chiefDecision = True
                    place_image(chiefDecision_image, True)
                elif not IPF:  # uspa green button
                    clock_event()
                chiefSync = True
                chief_currently_desync = False
                pygame.time.set_timer(watchdog_event, 5000)

            # -----------IPF & USPA CHIEF RED BUTTON---------------------
            if event.key == pygame.K_f and not input_blocked:
                if chief_currently_desync:
                    draw_background_box("chief", True)
                chiefRed = True
                chiefGoodlift = False
                chiefDecision = True
                place_image(chiefDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                chiefSync = True
                chief_currently_desync = False

            # ----------------IPF CHIEF BLUE BUTTON----------------------
            if event.key == pygame.K_g and not input_blocked and IPF:
                if chief_currently_desync:
                    draw_background_box("chief", True)
                chiefBlue = True
                chiefGoodlift = False
                chiefDecision = True
                place_image(chiefDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                chiefSync = True
                chief_currently_desync = False

            # -------IPF CHIEF YELLOW or USPA CHIEF WHITE BUTTON---------------
            if event.key == pygame.K_h and not input_blocked:
                if chief_currently_desync:
                    draw_background_box("chief", True)
                if IPF:
                    chiefYellow = True
                    chiefGoodlift = False
                else:
                    chiefRed = False
                    chiefGoodlift = True
                chiefDecision = True
                place_image(chiefDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                chiefSync = True

            # ------------IPF RIGHT WHITE BUTTON-------------------------
            if event.key == pygame.K_i and not input_blocked:
                if right_currently_desync:
                    draw_background_box("right", True)
                rightGoodlift = True
                rightRed = False
                rightBlue = False
                rightYellow = False
                rightDecision = True
                place_image(rightDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                rightSync = True
                right_currently_desync = False

            # -----------IPF & USPA RIGHT RED BUTTON---------------------
            if event.key == pygame.K_j and not input_blocked:
                if right_currently_desync:
                    draw_background_box("right", True)
                rightRed = True
                rightGoodlift = False
                rightDecision = True
                place_image(rightDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                rightSync = True
                right_currently_desync = False
            # ----------------IPF RIGHT BLUE BUTTON----------------------
            if event.key == pygame.K_k and not input_blocked and IPF:
                if right_currently_desync:
                    draw_background_box("right", True)
                rightBlue = True
                rightGoodlift = False
                rightDecision = True
                place_image(rightDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                rightSync = True
                right_currently_desync = False

            # -------IPF RIGHT YELLOW or USPA WHITE BUTTON---------------
            if event.key == pygame.K_l and not input_blocked:
                if right_currently_desync:
                    draw_background_box("right", True)
                if IPF:
                    rightYellow = True
                    rightGoodlift = False
                else:
                    rightRed = False
                    rightGoodlift = True
                rightDecision = True
                place_image(rightDecision_image, True)
                pygame.time.set_timer(watchdog_event, 5000)
                rightSync = True
                right_currently_desync = False

            if (
                event.key == pygame.K_EQUALS or event.key == pygame.K_KP_PLUS
            ):  # or pygame.K_EQUALS:  # need to change this to KP plus
                # we need to edit the edit the main timer.
                print("Editing the timer, calling the timer_edit() function")
                timer_edit()
                print("Timer Edit mode complete, checking if break condition")
                total_time = (
                    (main_timer.hours * 3600)
                    + (main_timer.minutes * 60)
                    + main_timer.seconds
                )

                # data package to set the liftingcast clock.
                if lc.configured:  # if liftingcast is configured
                    try:
                        # reset_data={"clockTimerLength": total_time,"password":lc.password} #create the json package to set the clock.
                        # r = requests.post(lc.set_clock_url,json=reset_data) #we have to include the time duration on this type of request
                        t2 = Thread(target=lc.set_liftingcast_clock, args=[total_time])
                        t2.daemon = True
                        t2.start()
                        place_image(good_sync_image, True)  # draw the green sync logo
                    except:
                        place_image(no_sync_image, True)  # draw the red sync logo

                if total_time > 240:
                    print("Timer value is greater than 4 minutes, entering break mode")
                    print(
                        "Clock is currently:"
                        + str(main_timer.hours)
                        + ":"
                        + str(main_timer.minutes)
                        + ":"
                        + str(main_timer.seconds)
                    )
                    breakMode = True  # we are now in a break.
                    break_mode()

            if event.key == pygame.K_SPACE:  # the space bar/attempt change button!
                print("Attempt Change button pressed")
                attempt_change()

            if event.key == pygame.K_KP_ENTER or event.key == pygame.K_RETURN:  # EXIT CONDITION
                menu()  #
            if event.key == pygame.K_ESCAPE:
                pygame.event.clear()  # remove all events from the queue.
                pygame.quit()
                sys.exit()

    if leftGoodlift or leftRed or leftBlue or leftYellow:
        if chiefGoodlift or chiefRed or chiefBlue or chiefYellow:
            if rightGoodlift or rightRed or rightBlue or rightYellow:
                # Every ref has made a decision, now display it!
                if not revealDecision:
                    revealDecision = True  # this removes the decision dots later on.
                    print("All 3 decisions made, setting timer for 2 seconds")
                    pygame.time.set_timer(reveal_lights_event, 1000)  # Begin the tick.

    mainClock.tick(120)
    # print("Main Loop Frame Rate: " + str(mainClock.get_fps()))
