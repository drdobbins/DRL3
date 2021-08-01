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

def manual_connect(left_status, chief_status, right_status, spare_status):
	print("manual remote connect command issued")
	if not left_status:
		trust_left()
		connect_left()
		
	if not chief_status:
		trust_chief
		connect_chief()
		
	if not right_status:
		trust_right()
		connect_right()
	print("manual connect scripts complete")
		
	if not spare_status:
		trust_spare()
		connect_spare()
	

def connect_left():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	#stdout_data = p.communicate(input=("trust" + leftMac).encode('utf-8'))[0] #force connect to left remote
	stdout_data = p.communicate(input=(conn_str + leftMac).encode('utf-8'))[0] #force connect to left remote
	time.sleep(0.5)
	
def connect_chief():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	#stdout_data = p.communicate(input=("trust" + chiefMac).encode('utf-8'))[0] #force connect to chief remote
	stdout_data = p.communicate(input=(conn_str + chiefMac).encode('utf-8'))[0] #force connect to chief remote
	time.sleep(0.5)
	
def connect_right():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	#stdout_data = p.communicate(input=("trust" + rightMac).encode('utf-8'))[0] #force connect to right remote
	stdout_data = p.communicate(input=(conn_str + rightMac).encode('utf-8'))[0] #force connect to right remote
	time.sleep(0.5)
	
def connect_spare():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	#stdout_data = p.communicate(input=("trust" + spareMac).encode('utf-8'))[0] #force connect to spare remote
	stdout_data = p.communicate(input=(conn_str + spareMac).encode('utf-8'))[0] #force connect to spare remote



def trust_left():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	stdout_data = p.communicate(input=("trust" + leftMac).encode('utf-8'))[0] #force connect to left remote
	#stdout_data = p.communicate(input=(conn_str + leftMac).encode('utf-8'))[0] #force connect to left remote
	time.sleep(0.5)
	
def trust_chief():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	stdout_data = p.communicate(input=("trust" + chiefMac).encode('utf-8'))[0] #force connect to chief remote
	#stdout_data = p.communicate(input=(conn_str + chiefMac).encode('utf-8'))[0] #force connect to chief remote
	time.sleep(0.5)
	
def trust_right():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	stdout_data = p.communicate(input=("trust" + rightMac).encode('utf-8'))[0] #force connect to right remote
	#stdout_data = p.communicate(input=(conn_str + rightMac).encode('utf-8'))[0] #force connect to right remote
	time.sleep(0.5)
	
def trust_spare():
	global conn_str
	p = Popen(['bluetoothctl'], stdout=PIPE, stdin=PIPE, stderr=PIPE)
	stdout_data = p.communicate(input=("trust" + spareMac).encode('utf-8'))[0] #force connect to spare remote
	#stdout_data = p.communicate(input=(conn_str + spareMac).encode('utf-8'))[0] #force connect to spare remote













