const globalTimerElement = document.getElementById('globalTimer');
let globalTimeLeft = 300;
let timerStarted = false;

window.onload = function () {
    if (!timerStarted) {
        startGlobalTimer();
        timerStarted = true;
    }
};

function startGlobalTimer() {
    const globalTimerInterval = setInterval(function () {
        if (globalTimeLeft > 0) {
            let minutes = Math.floor(globalTimeLeft / 60);
            let seconds = globalTimeLeft % 60;
            globalTimerElement.textContent = `${formatTime(minutes)}:${formatTime(seconds)}`;
            globalTimeLeft--;
        } else {
            clearInterval(globalTimerInterval);
            disableGlobalVoting();
            showResults();
        }
    }, 1000);
}

// 1 פונקציית הצגת אלרט
function showAlert(title, message) {
    const alertBox = document.getElementById('customAlert');
    alertBox.querySelector(".alert-title").textContent = title;
    alertBox.querySelector(".alert-message").textContent = message;
    alertBox.style.display = "block";
    alertBox.classList.add("fade-in");

}

// 1 פונקציית סגירת אלרט
function closeAlert() {
    console.log("Close button clicked"); // בדיקה אם הכפתור נלחץ
    const alertBox = document.getElementById("customAlert");
    alertBox.style.display = "none"; // הסתרת האלרט
    alertBox.classList.remove("fade-in"); // הסרת האפקט
}

//2 פונקציית הצגת אלרט
function showAlerts(title, message) {
    const alertBox = document.getElementById('customalert');
    alertBox.querySelector(".alert-Title").textContent = title;
    alertBox.querySelector(".alert-Message").textContent = message;
    console.log("open alert time clicked"); // בדיקה אם הכפתור נלחץ
    alertBox.style.display = "block";
    alertBox.classList.add("fade-in");

}

//2 פונקציית סגירת אלרט
function closeAlerts() {
    console.log("Close button clicked"); // בדיקה אם הכפתור נלחץ
    const alertBox = document.getElementById("customalert");
    alertBox.style.display = "none"; // הסתרת האלרט
}

function disableGlobalVoting() {

    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('graphSection').classList.add('hidden');
    document.getElementById('stationSection').classList.add('hidden');
    document.getElementById('voteSection').classList.add('hidden');
    // חסום את כל הכפתורים למעט כפתור איפוס הבחירות
    document.querySelectorAll('button').forEach(button => {
        if (button.id !== "resetElectionButton") {
            button.disabled = true;
        }
    });
        // הסתרת כל החלקים והצגת חלון התוצאות בלבד

        showResults(); // הצגת תוצאות
}


function formatTime(time) {
    return time < 10 ? '0' + time : time;
}

// פונקציה תעודת זהות
document.getElementById('authForm').onsubmit = function (e) {
    e.preventDefault();
    const voterId = document.getElementById('voter_id').value;

    fetch('/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                console.log(`Authenticated successfully. Assigned Station: ${data.station}`);
                localStorage.setItem('validStation', data.station); // שמירת תחנה
                document.getElementById('authSection').classList.add('hidden');
                document.getElementById('graphSection').classList.remove('hidden'); // מעבר לשלב אימות הגרף
            } else {
                showAlert("Error", data.message);
            }
        })
        .catch(err => console.error("Error:", err));
};


// פונקציה לבחירת תחנה
function selectStation(station) {
    const validStation = localStorage.getItem('validStation');
    if (parseInt(validStation) === station) {
            document.getElementById('stationSection').classList.add('hidden');
            document.getElementById('voteSection').classList.remove('hidden');

    } else {
        showAlert("Error", `You are not assigned to Station ${station}. Please choose your assigned station.`);
    }
}

// פונקציה להצבעה
function vote(candidate) {
    const voterId = document.getElementById('voter_id').value;
    fetch('/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId, candidate })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                showAlert("Thank you", data.message);
                delayAction(() => {
                    resetVote();
                });
            } else {
                showAlert("Error", data.message);
            }
        });
}

// איפוס הצבעה
function resetVote() {
    localStorage.removeItem('validStation');
    document.getElementById('voteSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('voter_id').value = '';
    resetGraphForm();
}

function showResults() {
    fetch('/get_results', {
        method: 'GET'
    })
        .then(response => response.json())
        .then(data => {
            const resultsContainer = document.getElementById('resultsSection');
            resultsContainer.classList.remove('hidden');

            const democratVotes = data.result.Democrat;
            const republicanVotes = data.result.Republican;
            const winnerMessage = data.winner;

            document.getElementById('democratVotes').textContent = democratVotes;
            document.getElementById('republicanVotes').textContent = republicanVotes;

            const winnerRow = document.getElementById('winnerRow');
            const winnerMessageElement = document.getElementById('winnerMessage');
            const tieRow = document.getElementById('tieRow');
            const tieMessageRow = document.getElementById('tieMessageRow');

            if (winnerMessage.includes("tie")) {
                tieRow.classList.remove('hidden');
                tieMessageRow.classList.remove('hidden');
                winnerRow.classList.add('hidden');
            } else {
                tieRow.classList.add('hidden');
                tieMessageRow.classList.add('hidden');
                winnerRow.classList.remove('hidden');
                winnerMessageElement.textContent = winnerMessage;
            }

            document.getElementById('authSection').classList.add('hidden');
            document.getElementById('stationSection').classList.add('hidden');
            document.getElementById('voteSection').classList.add('hidden');
        });
}


function resetElection() {
    console.log("Reset Election button clicked"); // בדיקה אם הכפתור נלחץ
    fetch('/reset_election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => response.json())
        .then(data => {
            console.log("Response from server:", data); 
            if (data.status === "success") {
                showAlert(data.message); 
                setTimeout(() => {
                    location.reload(); 
                }, 1500);
            } else {
                showAlert(`Error: ${data.message}`);
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showAlert("An error occurred while resetting the election.");
        });
}


document.getElementById("graphForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const edges = {
        "a,d": document.getElementById("edge1").value.trim(),
        "a,c": document.getElementById("edge2").value.trim(),
        "b,d": document.getElementById("edge3").value.trim(),
        "b,c": document.getElementById("edge4").value.trim()
    };

    fetch('/verify_graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edges: edges })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showAlert("Success", "Graph verification successful!");
                // הצגת גרף H
                document.getElementById('graphSection').classList.add('hidden');
                const graphHSection = document.getElementById('graphHSection');
                graphHSection.classList.remove('hidden');
               

                delayAction(() => {
                    document.getElementById('graphSection').classList.add('hidden');
                    document.getElementById('graphHSection').classList.add('hidden');
                    document.getElementById('stationSection').classList.remove('hidden');
                });

                resetGraphForm(); // איפוס השדות
            } else {
                showAlert("Error", data.message);
            }
        })
        .catch(err => {
            console.error("Error in fetch:", err);
            showAlert("Error", "An error occurred while verifying the graph.");
        });
});


function resetGraphForm() {
    document.getElementById("edge1").value = "";
    document.getElementById("edge2").value = "";
    document.getElementById("edge3").value = "";
    document.getElementById("edge4").value = "";
}

function delayAction(action, delay = 2500) {
    setTimeout(action, delay);
}



