# Priority-Variation-Implementing-Aging-Scheduling-Algorithms
operating system : Scheduling Algorithm for priority variation  
# Preemptive Priority Scheduling with Aging  
### Operating Systems Simulation (Web-Based)

📌 Project Overview

This project is a **web-based simulation of the Preemptive Priority CPU Scheduling Algorithm with Aging**.  
It is designed to help students understand how **priority scheduling works** and how the **aging mechanism prevents starvation**.

The simulation allows users to:
- Add processes manually
- Assign burst time, arrival time, and priority
- Observe preemption in real time
- Visualize execution using a **Gantt Chart**
- See how priorities improve over time due to aging

This project is especially useful for **Operating Systems courses** in **BSCS / BSSE / MSCS**.

---
🔴 Live Demo:
https://zeb60174-rgb.github.io/Priority-Variation-Implementing-Aging-Scheduling-Algorithms/

🧠 What is Preemptive Priority Scheduling?

In **Preemptive Priority Scheduling**:
- Each process is assigned a priority
- **Lower number = higher priority**
- If a higher-priority process arrives, it **preempts** the currently running process
- This can cause **starvation** for low-priority processes

---

⏳ What is Aging?

**Aging** is a solution to the starvation problem.

- Waiting processes gradually **increase their priority**
- Over time, every process gets CPU time
- In this project:
  - Aging is applied **every 5 time units**
  - Priority is improved based on a **user-defined aging rate**

---

🎯 Project Features

✔ Preemptive Priority Scheduling  
✔ Aging mechanism to prevent starvation  
✔ User-controlled aging rate  
✔ Step-by-step execution mode  
✔ Automatic execution mode  
✔ Gantt chart visualization  
✔ Real-time process states  
✔ Average waiting time calculation  
✔ Average turnaround time calculation  

---

🛠 Technologies Used

| Technology | Purpose |
|----------|--------|
| HTML | Structure of the web page |
| CSS | Styling and layout |
| JavaScript | Scheduling logic & simulation |
| Font Awesome | Icons for better UI |

---

## 📂 Project Structure

