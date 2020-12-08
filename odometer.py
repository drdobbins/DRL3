import json

def increase_mileage():
	read_file = open('.mileage.json', 'r') #open the json file
	data = json.load(read_file) #read in the data
	read_file.close() #close the json file. 
	#current_attempts = read_mileage()
	current_attempts = data["attempts"] #extract the current mileage
	data["attempts"] = current_attempts + 1 #increment the count

	write_file = open('.mileage.json','w')
	json.dump(data,write_file)
	write_file.close()
	
def read_mileage():
	read_file = open('.mileage.json', 'r') #open the json file
	data = json.load(read_file) #read in the data
	read_file.close() #close the json file. 

	return data["attempts"] #extract the current mileage

