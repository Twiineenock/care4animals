import requests
import json

# Testing the PUT endpoint locally (assuming backend is running or I can just check the logic)
# Actually I'll just check the logic in farmers.py more carefully.

url = "https://care4animals.onrender.com/farmers/1/profile"
data = {
    "username": "twiine",
    "email": "twiineenockfox@gmail.com",
    "phone_number": "+256771250497",
    "bio": "On my farm, I have cows and goats, my team works hard to keep them in a humane way",
    "profile_picture_url": "https://nyidwpimwxpbncdjkgka.supabase.co/storage/v1/object/public/profile_pictures/profile_pictures/1-0.2796122676834015.jpg"
}

print(f"Testing PUT to {url}...")
try:
    response = requests.put(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
