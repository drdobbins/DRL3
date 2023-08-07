import os

class haptic_feedback:
	def __init__(self):
		self.left = False
		self.chief = False
		self.right = False
		self.running = False
		self.haptic_reset()
		
	def startFeedback(self):
		if self.running == False:
		
			if self.left == True and self.chief == True: #buzz the right side
				os.system("xset led named 'Num Lock'") #turn on the feedback on the right remote
				print("buzzing right remote")
				self.running = True
				
			if self.chief == True and self.right == True: #buzz the left side
				os.system("xset led named 'Scroll Lock'") #turn on the feedback on the left remote
				print("buzzing left remote")
				self.running = True
				
			if self.left == True and self.right == True: #buzz the chief side
				os.system("xset led named 'Caps Lock'") #turn on the feedback on the chief remote
				print("buzzing chief remote")
				self.running = True
			
	def haptic_reset(self):
		os.system("xset -led named 'Scroll Lock'")
		print("scroll lock reset")
		os.system("xset -led named 'Caps Lock'")
		print("caps lock reset")
		os.system("xset -led named 'Num Lock'")
		print("num lock reset")
		self.running = False
	
