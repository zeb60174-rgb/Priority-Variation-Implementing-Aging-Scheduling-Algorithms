// Process class definition
class Process {
    constructor(id, name, burstTime, arrivalTime, priority) {
        this.id = id;
        this.name = name;
        this.burstTime = burstTime;
        this.remainingTime = burstTime;
        this.arrivalTime = arrivalTime;
        this.priority = priority;
        this.originalPriority = priority;
        this.waitTime = 0;
        this.turnaroundTime = 0;
        this.startTime = null;
        this.completionTime = null;
        this.state = 'waiting'; // waiting, ready, running, completed
        this.agingCounter = 0;
        this.color = this.generateColor();
    }
    
    generateColor() {
        // Generate a consistent color based on process ID
        const colors = [
            '#2ea043', '#1f6feb', '#f0883e', '#da3633', 
            '#8957e5', '#f778ba', '#3fb950', '#ff7b72'
        ];
        return colors[this.id % colors.length];
    }
    
    updatePriorityByAging(agingRate) {
        // Increase priority (lower number = higher priority)
        // Only age waiting processes that haven't started yet
        if (this.state === 'waiting' || this.state === 'ready') {
            this.agingCounter++;
            
            // Apply aging every 5 time units
            if (this.agingCounter >= 5) {
                this.priority = Math.max(1, this.priority - agingRate);
                this.agingCounter = 0;
                return true; // Priority was updated
            }
        }
        return false; // Priority was not updated
    }
    
    execute(timeUnit = 1) {
        if (this.remainingTime > 0) {
            this.remainingTime -= timeUnit;
            
            if (this.remainingTime <= 0) {
                this.complete();
            }
            
            return true;
        }
        return false;
    }
    
    complete() {
        this.state = 'completed';
        this.remainingTime = 0;
        this.completionTime = scheduler.currentTime;
        this.turnaroundTime = this.completionTime - this.arrivalTime;
        this.waitTime = this.turnaroundTime - this.burstTime;
    }
}

// Scheduler class definition
class PriorityScheduler {
    constructor() {
        this.processes = [];
        this.completedProcesses = [];
        this.currentTime = 0;
        this.currentProcess = null;
        this.isRunning = false;
        this.timeQuantum = 1;
        this.agingRate = 1.0;
        this.ganttChart = [];
        this.nextProcessId = 1;
        this.simulationSpeed = 800;
        this.intervalId = null;
    }
    
    addProcess(name, burstTime, arrivalTime, priority) {
        const process = new Process(
            this.nextProcessId++, 
            name, 
            burstTime, 
            arrivalTime, 
            priority
        );
        this.processes.push(process);
        return process;
    }
    
    removeProcess(id) {
        this.processes = this.processes.filter(p => p.id !== id);
    }
    
    getNextProcess() {
        // Filter processes that have arrived and are not completed
        const availableProcesses = this.processes.filter(p => 
            p.arrivalTime <= this.currentTime && 
            p.state !== 'completed'
        );
        
        if (availableProcesses.length === 0) return null;
        
        // Sort by priority (lower number = higher priority)
        availableProcesses.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            // If priorities are equal, sort by arrival time
            return a.arrivalTime - b.arrivalTime;
        });
        
        return availableProcesses[0];
    }
    
    runStep() {
        if (!this.isRunning && this.processes.length === 0) return false;
        
        // Apply aging to all waiting/ready processes
        let agingApplied = false;
        this.processes.forEach(process => {
            if (process.state !== 'completed') {
                if (process.updatePriorityByAging(this.agingRate)) {
                    agingApplied = true;
                }
            }
        });
        
        // Get the next process to run
        const nextProcess = this.getNextProcess();
        
        // Handle process preemption if needed
        if (this.currentProcess && 
            this.currentProcess.state === 'running' && 
            nextProcess && 
            nextProcess.id !== this.currentProcess.id && 
            nextProcess.priority < this.currentProcess.priority) {
            
            // Preempt the current process
            this.currentProcess.state = 'ready';
            this.ganttChart.push({
                processId: this.currentProcess.id,
                processName: this.currentProcess.name,
                startTime: this.currentProcess.startTime,
                endTime: this.currentTime,
                preempted: true,
                color: this.currentProcess.color
            });
        }
        
        // Set the current process
        if (nextProcess && 
            (!this.currentProcess || 
             this.currentProcess.state !== 'running' || 
             nextProcess.id !== this.currentProcess.id)) {
            
            if (this.currentProcess && this.currentProcess.state === 'running') {
                this.currentProcess.state = 'ready';
            }
            
            this.currentProcess = nextProcess;
            this.currentProcess.state = 'running';
            
            // Record start time if this is the first time running
            if (this.currentProcess.startTime === null) {
                this.currentProcess.startTime = this.currentTime;
            }
            
            // Add to gantt chart if it's a new execution segment
            if (this.ganttChart.length === 0 || 
                this.ganttChart[this.ganttChart.length - 1].processId !== this.currentProcess.id ||
                this.ganttChart[this.ganttChart.length - 1].endTime !== this.currentTime) {
                
                this.ganttChart.push({
                    processId: this.currentProcess.id,
                    processName: this.currentProcess.name,
                    startTime: this.currentTime,
                    endTime: this.currentTime + this.timeQuantum,
                    preempted: false,
                    color: this.currentProcess.color
                });
            } else {
                // Extend the last gantt block
                this.ganttChart[this.ganttChart.length - 1].endTime = this.currentTime + this.timeQuantum;
            }
        }
        
        // Execute the current process
        if (this.currentProcess && this.currentProcess.state === 'running') {
            const executed = this.currentProcess.execute(this.timeQuantum);
            
            if (!executed || this.currentProcess.remainingTime <= 0) {
                // Process completed
                this.currentProcess.complete();
                
                // Update the last gantt chart entry
                if (this.ganttChart.length > 0) {
                    this.ganttChart[this.ganttChart.length - 1].endTime = this.currentTime + this.timeQuantum;
                }
                
                this.completedProcesses.push(this.currentProcess);
                this.removeProcess(this.currentProcess.id);
                
                this.currentProcess = null;
            }
        }
        
        // Update wait times for all waiting processes
        this.processes.forEach(process => {
            if (process.state === 'waiting' && process.arrivalTime <= this.currentTime) {
                process.state = 'ready';
            }
            
            if ((process.state === 'ready' || process.state === 'waiting') && 
                process !== this.currentProcess) {
                process.waitTime += this.timeQuantum;
            }
        });
        
        // Increment time
        this.currentTime += this.timeQuantum;
        
        // Check if all processes are completed
        if (this.processes.length === 0) {
            this.isRunning = false;
            return false;
        }
        
        return true;
    }
    
    start() {
        this.isRunning = true;
    }
    
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    reset() {
        this.stop();
        this.processes = [];
        this.completedProcesses = [];
        this.currentTime = 0;
        this.currentProcess = null;
        this.ganttChart = [];
        this.nextProcessId = 1;
    }
    
    getAverageWaitTime() {
        if (this.completedProcesses.length === 0) return 0;
        
        const totalWaitTime = this.completedProcesses.reduce((sum, process) => {
            return sum + process.waitTime;
        }, 0);
        
        return (totalWaitTime / this.completedProcesses.length).toFixed(2);
    }
    
    getAverageTurnaroundTime() {
        if (this.completedProcesses.length === 0) return 0;
        
        const totalTurnaroundTime = this.completedProcesses.reduce((sum, process) => {
            return sum + process.turnaroundTime;
        }, 0);
        
        return (totalTurnaroundTime / this.completedProcesses.length).toFixed(2);
    }
}

// DOM elements
const processNameInput = document.getElementById('processName');
const burstTimeInput = document.getElementById('burstTime');
const arrivalTimeInput = document.getElementById('arrivalTime');
const priorityInput = document.getElementById('priority');
const agingRateInput = document.getElementById('agingRate');
const agingRateValue = document.getElementById('agingRateValue');
const currentAgingRate = document.getElementById('currentAgingRate');
const addProcessButton = document.getElementById('addProcess');
const startSchedulerButton = document.getElementById('startScheduler');
const stepSchedulerButton = document.getElementById('stepScheduler');
const resetSchedulerButton = document.getElementById('resetScheduler');
const processList = document.getElementById('processList');
const schedulerStatus = document.getElementById('schedulerStatus');
const ganttChartContainer = document.getElementById('ganttChartContainer');
const currentTimeElement = document.getElementById('currentTime');
const completedProcessesElement = document.getElementById('completedProcesses');
const avgWaitTimeElement = document.getElementById('avgWaitTime');
const avgTurnaroundTimeElement = document.getElementById('avgTurnaroundTime');

// Initialize scheduler
const scheduler = new PriorityScheduler();

// Update aging rate display
function updateAgingRateDisplay() {
    const value = parseFloat(agingRateInput.value).toFixed(1);
    agingRateValue.textContent = value;
    currentAgingRate.textContent = value;
    scheduler.agingRate = parseFloat(value);
}

// REMOVED: Sample processes function - We only use user-added processes

// Update the process list UI
function updateProcessList() {
    processList.innerHTML = '';
    
    // Check if there are no processes
    if (scheduler.processes.length === 0 && scheduler.completedProcesses.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No processes added yet. Add a process to begin.';
        emptyMessage.style.cssText = `
            text-align: center;
            padding: 20px;
            color: #8b949e;
            font-style: italic;
        `;
        processList.appendChild(emptyMessage);
        return;
    }
    
    // Sort processes by arrival time for display
    const sortedProcesses = [...scheduler.processes, ...scheduler.completedProcesses]
        .sort((a, b) => a.id - b.id);
    
    sortedProcesses.forEach(process => {
        const processElement = document.createElement('div');
        processElement.className = `process-item ${process.state}`;
        processElement.dataset.processId = process.id;
        
        const processInfo = document.createElement('div');
        processInfo.className = 'process-info';
        
        const processName = document.createElement('div');
        processName.className = 'process-name';
        processName.textContent = `${process.name} (ID: ${process.id})`;
        
        const processDetails = document.createElement('div');
        processDetails.className = 'process-details';
        
        // Format priority with highlighting if it changed due to aging
        let priorityText = process.priority.toFixed(1);
        if (process.priority !== process.originalPriority) {
            priorityText = `${priorityText} <span style="color: #f0883e; font-size: 0.8em;">(▲ ${(process.originalPriority - process.priority).toFixed(1)})</span>`;
        }
        
        processDetails.innerHTML = `
            <span><i class="fas fa-clock"></i> Burst: ${process.burstTime}ms</span>
            <span><i class="fas fa-hourglass-start"></i> Arrival: ${process.arrivalTime}ms</span>
            <span><i class="fas fa-star"></i> Priority: <span class="priority-display">${priorityText}</span></span>
            <span><i class="fas fa-hourglass-end"></i> Remaining: ${process.remainingTime}ms</span>
            <span><i class="fas fa-${getStateIcon(process.state)}"></i> ${process.state.charAt(0).toUpperCase() + process.state.slice(1)}</span>
        `;
        
        processInfo.appendChild(processName);
        processInfo.appendChild(processDetails);
        
        const processIdBadge = document.createElement('div');
        processIdBadge.className = 'process-id';
        processIdBadge.textContent = process.id;
        processIdBadge.style.background = process.color;
        
        processElement.appendChild(processInfo);
        processElement.appendChild(processIdBadge);
        
        processList.appendChild(processElement);
    });
    
    // Scroll to bottom of process list
    processList.scrollTop = processList.scrollHeight;
}

// Get icon for process state
function getStateIcon(state) {
    switch(state) {
        case 'running': return 'play-circle';
        case 'ready': return 'pause-circle';
        case 'waiting': return 'hourglass-half';
        case 'completed': return 'check-circle';
        default: return 'question-circle';
    }
}

// Update the Gantt chart
function updateGanttChart() {
    ganttChartContainer.innerHTML = '';
    
    if (scheduler.ganttChart.length === 0) {
        // Show empty state for Gantt chart
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = 'No execution history yet. Start the scheduler to see the timeline.';
        emptyMessage.style.cssText = `
            text-align: center;
            padding: 30px;
            color: #8b949e;
            font-style: italic;
        `;
        ganttChartContainer.appendChild(emptyMessage);
        return;
    }
    
    // Find the maximum time to scale the chart
    const maxTime = Math.max(
        ...scheduler.ganttChart.map(entry => entry.endTime),
        scheduler.currentTime
    );
    
    const containerWidth = ganttChartContainer.offsetWidth;
    const scale = containerWidth / Math.max(maxTime + 5, 20); // Ensure minimum scale
    
    // Add time markers
    for (let time = 0; time <= maxTime; time += 5) {
        const marker = document.createElement('div');
        marker.className = 'gantt-time-marker';
        marker.style.left = `${time * scale}px`;
        
        const label = document.createElement('div');
        label.className = 'gantt-time-label';
        label.textContent = time;
        label.style.left = `${time * scale}px`;
        
        ganttChartContainer.appendChild(marker);
        ganttChartContainer.appendChild(label);
    }
    
    // Add process blocks
    scheduler.ganttChart.forEach(entry => {
        const blockWidth = Math.max((entry.endTime - entry.startTime) * scale, 5);
        
        const block = document.createElement('div');
        block.className = 'gantt-block';
        block.style.width = `${blockWidth}px`;
        block.style.left = `${entry.startTime * scale}px`;
        block.style.backgroundColor = entry.color;
        block.title = `${entry.processName}\n${entry.startTime}-${entry.endTime}ms\n${entry.preempted ? 'Preempted' : 'Executed'}`;
        block.textContent = entry.processName;
        
        // Add preemption indicator
        if (entry.preempted) {
            const preemptMarker = document.createElement('div');
            preemptMarker.style.position = 'absolute';
            preemptMarker.style.right = '0';
            preemptMarker.style.top = '0';
            preemptMarker.style.width = '0';
            preemptMarker.style.height = '0';
            preemptMarker.style.borderLeft = '10px solid transparent';
            preemptMarker.style.borderRight = '10px solid transparent';
            preemptMarker.style.borderTop = '10px solid #da3633';
            preemptMarker.style.transform = 'translate(50%, -50%)';
            block.appendChild(preemptMarker);
        }
        
        ganttChartContainer.appendChild(block);
    });
    
    // Add current time marker
    if (scheduler.isRunning || scheduler.currentTime > 0) {
        const currentMarker = document.createElement('div');
        currentMarker.style.position = 'absolute';
        currentMarker.style.left = `${scheduler.currentTime * scale}px`;
        currentMarker.style.top = '0';
        currentMarker.style.width = '3px';
        currentMarker.style.height = '100%';
        currentMarker.style.backgroundColor = '#ff7b72';
        currentMarker.style.zIndex = '10';
        currentMarker.title = `Current Time: ${scheduler.currentTime}ms`;
        ganttChartContainer.appendChild(currentMarker);
    }
}

// Update statistics
function updateStatistics() {
    currentTimeElement.textContent = scheduler.currentTime;
    completedProcessesElement.textContent = scheduler.completedProcesses.length;
    avgWaitTimeElement.textContent = scheduler.getAverageWaitTime();
    avgTurnaroundTimeElement.textContent = scheduler.getAverageTurnaroundTime();
}

// Update scheduler status
function updateSchedulerStatus() {
    const statusDot = schedulerStatus.querySelector('.status-dot');
    let statusText = '';
    
    if (scheduler.isRunning) {
        statusText = `Running (Time: ${scheduler.currentTime}ms)`;
        statusDot.style.backgroundColor = '#2ea043';
        statusDot.style.animation = 'pulse 0.5s infinite';
    } else if (scheduler.processes.length === 0 && scheduler.completedProcesses.length > 0) {
        statusText = `Completed (Time: ${scheduler.currentTime}ms)`;
        statusDot.style.backgroundColor = '#8b949e';
        statusDot.style.animation = 'none';
    } else {
        statusText = `Ready (Time: ${scheduler.currentTime}ms)`;
        statusDot.style.backgroundColor = '#58a6ff';
        statusDot.style.animation = 'pulse 2s infinite';
    }
    
    schedulerStatus.innerHTML = `<span class="status-dot"></span> Status: ${statusText}`;
}

// Run scheduler step
function runStep() {
    if (scheduler.processes.length === 0 && scheduler.completedProcesses.length === 0) {
        showNotification('Please add at least one process first!', 'warning');
        return false;
    }
    
    if (!scheduler.isRunning && scheduler.processes.length > 0) {
        scheduler.start();
    }
    
    const hasMore = scheduler.runStep();
    
    updateProcessList();
    updateGanttChart();
    updateStatistics();
    updateSchedulerStatus();
    
    if (!hasMore) {
        scheduler.stop();
        showNotification('All user processes completed!', 'success');
    }
    
    return hasMore;
}

// Run scheduler continuously
function runSchedulerContinuously() {
    if (scheduler.processes.length === 0 && scheduler.completedProcesses.length === 0) {
        showNotification('Please add at least one process first!', 'warning');
        return;
    }
    
    scheduler.start();
    updateSchedulerStatus();
    
    // Clear any existing interval
    if (scheduler.intervalId) {
        clearInterval(scheduler.intervalId);
    }
    
    // Run scheduler steps with a delay to visualize
    scheduler.intervalId = setInterval(() => {
        const hasMore = scheduler.runStep();
        
        updateProcessList();
        updateGanttChart();
        updateStatistics();
        updateSchedulerStatus();
        
        if (!hasMore) {
            clearInterval(scheduler.intervalId);
            scheduler.intervalId = null;
            scheduler.stop();
        }
    }, scheduler.simulationSpeed);
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Set color based on type
    if (type === 'warning') {
        notification.style.backgroundColor = '#da3633';
    } else if (type === 'success') {
        notification.style.backgroundColor = '#2ea043';
    } else {
        notification.style.backgroundColor = '#1f6feb';
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);

// Event listeners
addProcessButton.addEventListener('click', () => {
    const name = processNameInput.value.trim() || `Process ${scheduler.nextProcessId}`;
    const burstTime = parseInt(burstTimeInput.value) || 5;
    const arrivalTime = parseInt(arrivalTimeInput.value) || 0;
    const priority = parseInt(priorityInput.value) || 5;
    
    if (burstTime <= 0) {
        showNotification('Burst time must be positive!', 'warning');
        return;
    }
    
    if (priority < 1 || priority > 10) {
        showNotification('Priority must be between 1 and 10!', 'warning');
        return;
    }
    
    scheduler.addProcess(name, burstTime, arrivalTime, priority);
    
    // Update the process name for the next process
    processNameInput.value = `Process ${scheduler.nextProcessId}`;
    
    updateProcessList();
    updateStatistics();
    updateSchedulerStatus();
    
    showNotification(`User process "${name}" added successfully!`, 'success');
});

startSchedulerButton.addEventListener('click', () => {
    runSchedulerContinuously();
});

stepSchedulerButton.addEventListener('click', () => {
    runStep();
});

resetSchedulerButton.addEventListener('click', () => {
    scheduler.reset();
    updateProcessList();
    updateGanttChart();
    updateStatistics();
    updateSchedulerStatus();
    
    showNotification('Scheduler reset successfully! All user processes cleared.', 'info');
});

agingRateInput.addEventListener('input', updateAgingRateDisplay);

// Initialize the application
function init() {
    updateAgingRateDisplay();
    updateSchedulerStatus();
    
    // Add welcome message without sample processes
    setTimeout(() => {
        showNotification('Add your processes and start the scheduler to see real-time execution!', 'info');
    }, 1000);
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export for debugging in browser console
window.scheduler = scheduler;