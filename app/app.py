from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import pymongo
import random
import time
import os
import json
from base64 import b64decode
from hashlib import sha256
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

app = Flask(__name__)
load_dotenv()
mongo_key = os.getenv("MONGO_KEY")

try:
    client = pymongo.MongoClient(mongo_key, tlsAllowInvalidCertificates=True)
    client.admin.command('ping')
    print("Connection successful!")
except Exception as e:
    print("Connection failed:", e)
    exit(1) 
db = client.get_database("VotingSystem")
voters_collection = db['voters']
secretvotes_collection = db['secretvotes']

# Time limit (5 minutes for global timer)
global_time_limit = 300
time_started = None  # Start time for global timer

# פונקציה להצפנת ההצבעה
def aes_encrypt(plaintext):
    iv = os.urandom(16)  # יצירת IV אקראי
    key = b'16byteskey123456' 
    cipher = AES.new(key, AES.MODE_CBC, iv)  
    # ביצוע padding להצבעה
    padded_plaintext = pad(plaintext.encode(), AES.block_size)    
    # הצפנה של ההודעה
    encrypted_message = cipher.encrypt(padded_plaintext)
    return iv, encrypted_message

def get_shared_secret(voter_id):
    secret = sha256(voter_id.encode()).digest()  
    return secret[:16] 

# Initialize voters
def initialize_voters():
    voters = [
        {"voter_id": "318258274", "name": "Sapir Ovadya", "station": 1, "voted": False},
        {"voter_id": "315199810", "name": "May Zohar", "station": 2, "voted": False},
        {"voter_id": "318886082", "name": "Linoy Turgeman", "station": 3, "voted": False},
        {"voter_id": "318111112", "name": "David Cohen", "station": 1, "voted": False},
        {"voter_id": "318258276", "name": "Eve Ben", "station": 2, "voted": False},
        {"voter_id": "2009123443", "name": "Frank Levi", "station": 3, "voted": False},
        {"voter_id": "315123449", "name": "Grace Pitt", "station": 1, "voted": False},
        {"voter_id": "317689956", "name": "Bar lev", "station": 2, "voted": False},
        {"voter_id": "210089767", "name": "Ivan Cohen", "station": 3, "voted": False},
        {"voter_id": "318234384", "name": "Judy Lee", "station": 1, "voted": False},
        {"voter_id": "31456745", "name": "Alice Lee", "station": 2, "voted": False},
        {"voter_id": "2008767554", "name": "Daniel Bar", "station": 3, "voted": False},
        {"voter_id": "315266710", "name": "Mona Cohen", "station": 1, "voted": False},
        {"voter_id": "322700988", "name": "Nina Levi", "station": 2, "voted": False},
        {"voter_id": "318348356", "name": "Oscar Biton", "station": 3, "voted": False},
        {"voter_id": "318773884", "name": "Karen Cohen", "station": 2, "voted": False},
        {"voter_id": "2007767554", "name": "Leo Di", "station": 3, "voted": False},
        {"voter_id": "315786710", "name": "Mona Levi", "station": 1, "voted": False},
        {"voter_id": "344700988", "name": "Nina Cohen", "station": 2, "voted": False},
        {"voter_id": "318765390", "name": "Oscar Levi", "station": 3, "voted": False}
    ]
    # מחיקת כל הבוחרים הקיימים במסד הנתונים
    voters_collection.delete_many({})
    # הכנסת הבוחרים החדשים
    voters_collection.insert_many(voters)
    print(f"Initialized {len(voters)} voters successfully.")


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/authenticate', methods=['POST'])
def authenticate():
    voter_id = request.json.get("voter_id")
    voter = voters_collection.find_one({"voter_id": voter_id})
    
    if voter and not voter["voted"]:
        global time_started
        if not time_started:
            time_started = time.time()
        return jsonify({"status": "success", "station": voter["station"]})  # החזרת התחנה
    return jsonify({"status": "fail", "message": "Invalid voter or already voted."}), 400


@app.route('/vote', methods=['POST'])
def vote():
    global time_started
    voter_id = request.json.get("voter_id")
    candidate = request.json.get("candidate") 
    voter = voters_collection.find_one({"voter_id": voter_id})

    # בדיקה אם הזמן הגלובלי עבר
    if time_started and time.time() - time_started > global_time_limit:
        return jsonify({"status": "fail", "message": "Global voting time has expired."}), 400

    if voter and not voter["voted"]:
        shared_secret = get_shared_secret(voter_id)
        iv, encrypted_vote = aes_encrypt(candidate)  
        # שמור את ההצבעה המוצפנת בטבלת secretvotes
        secretvotes_collection.insert_one({
            "vote": encrypted_vote,
            "iv": iv
        })

        # עדכון המצביע כי הוא הצביע
        voters_collection.update_one({"voter_id": voter_id}, {"$set": {"voted": True}})
        
        return jsonify({"status": "success", "message": "Vote submitted successfully!"})

    return jsonify({"status": "fail", "message": "Invalid voter or already voted."}), 400


@app.route('/get_results', methods=['GET'])
def get_results():
    votes = secretvotes_collection.find()
    result = {"Democrat": 0, "Republican": 0}

    for vote in votes:
        iv = vote["iv"]
        encrypted_vote = vote["vote"]
        
        decrypted_vote = aes_decrypt(iv, encrypted_vote)
        
        if decrypted_vote == "Democrat":
            result["Democrat"] += 1
        elif decrypted_vote == "Republican":
            result["Republican"] += 1
    
    winner = ""
    if result["Democrat"] > result["Republican"]:
        winner = "The next presedent of USA is from the Democrat party"
    elif result["Republican"] > result["Democrat"]:
        winner = "The next presedent of USA is from the Republican party"
    else:
        winner = "It's a tie! A re-election is required."

    return jsonify({
        "result": result,
        "winner": winner
    })

# פונקציה לפענוח הצבעה
def aes_decrypt(iv, encrypted_vote):
    key = b'16byteskey123456' 
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted_message = unpad(cipher.decrypt(encrypted_vote), AES.block_size).decode()
    return decrypted_message


@app.route('/reset_election', methods=['POST'])
def reset_election():
    try:
        initialize_voters()
        secretvotes_collection.delete_many({})
        global time_started
        time_started = None
        return jsonify({"status": "success", "message": "Election has been reset successfully."})
    except Exception as e:
        return jsonify({"status": "fail", "message": str(e)}), 500

@app.route('/verify_graph', methods=['POST'])
def verify_graph():
    try:
        correct_edges = {
            "a,d": "2,4",
            "a,c": "2,1",
            "b,d": "3,4",
            "b,c": "3,1"
        }

        edges = request.json.get("edges")
        
        incorrect_edges = [
            f"{edge}: {value}" for edge, value in edges.items()
            if correct_edges.get(edge) != value
        ]

        if not incorrect_edges:
            return jsonify({"status": "success", "message": "Graph verified successfully!"})
        else:
            return jsonify({
                "status": "fail",
                "message": f"The following edges have incorrect mappings: {', '.join(incorrect_edges)}"
            }), 400
    except Exception as e:
        print(f"Error verifying graph: {e}")
        return jsonify({"status": "fail", "message": "An error occurred while verifying the graph."}), 500

if __name__ == "__main__":
    #initialize_voters() #for the first initializion
    app.run(debug=True, host='0.0.0.0', port=5001)
