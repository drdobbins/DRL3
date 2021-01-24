#!/usr/bin/python3

import subprocess
import time
import json

from subprocess import Popen, PIPE, STDOUT

with open('/home/pi/Desktop/DRL3/config.json') as f:
    config_data = json.load(f)

leftMac = config_data["left_mac_address"]
chiefMac = config_data["chief_mac_address"]
rightMac = config_data["right_mac_address"]
spareMac = config_data["spare_mac_address"]

conn_str = 'connect '


p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
stdout_data = p.communicate(input=(conn_str + leftMac).encode('utf-8'))[0] #force connect to left remote
time.sleep(1)

p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
stdout_data = p.communicate(input=(conn_str + chiefMac).encode('utf-8'))[0] #force connect to chief remote
time.sleep(1)

p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
stdout_data = p.communicate(input=(conn_str + rightMac).encode('utf-8'))[0] #force connect to right remote
time.sleep(1)

p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
stdout_data = p.communicate(input=(conn_str + spareMac).encode('utf-8'))[0] #force connect to spare remote


