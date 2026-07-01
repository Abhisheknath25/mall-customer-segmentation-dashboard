// Dashboard Core Application Logic - Mall Customer Segmentation Insights

let rawData = null;
let filteredData = [];
let charts = {};

// Slicer/Filter State
let filters = {
    gender: 'all',
    segment: 'all',
    ageMin: 18,
    ageMax: 70,
    incomeMin: 15,
    incomeMax: 137,
    searchQuery: '',
    sortField: 'CustomerID',
    sortDirection: 'asc',
    currentPage: 1,
    pageSize: 10
};

// Segment configuration (matching python names and colors)
const segmentConfig = {
    "Low Income, Low Spending": { color: "#f59e0b", label: "Frugal Shoppers", tag: "low-income-low-spending" },
    "Low Income, High Spending": { color: "#f43f5e", label: "Spendthrifts", tag: "low-income-high-spending" },
    "Average Income, Average Spending": { color: "#10b981", label: "Standard Moderates", tag: "average-income-average-spending" },
    "High Income, Low Spending": { color: "#8b5cf6", label: "Careful Shoppers", tag: "high-income-low-spending" },
    "High Income, High Spending": { color: "#3b82f6", label: "Premium Target", tag: "high-income-high-spending" }
};

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
    // Load Segmented Data
    await loadData();
    
    // Set slider range values reactivity
    initSliders();
    
    // Event listeners for filters
    document.getElementById("genderFilter").addEventListener("change", (e) => {
        filters.gender = e.target.value;
        filters.currentPage = 1;
        updateDashboard();
    });
    
    document.getElementById("segmentFilter").addEventListener("change", (e) => {
        filters.segment = e.target.value;
        filters.currentPage = 1;
        updateDashboard();
    });
    
    // Search
    document.getElementById("tableSearch").addEventListener("input", (e) => {
        filters.searchQuery = e.target.value.toLowerCase();
        filters.currentPage = 1;
        updateDashboard();
    });

    // Reset Filters
    document.getElementById("resetFiltersBtn").addEventListener("click", () => {
        resetFilters();
    });

    // Theme toggle
    document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);

    // Open Power BI button click
    document.getElementById("openPbiBtn").addEventListener("click", () => {
        // Show notification that Power BI is being launched
        alert("Launching Power BI Desktop with CustomerSegmentationDashboard.pbip. Please wait...");
        fetch("/open-powerbi").catch(err => {
            console.log("Could not call local open endpoint directly, falling back.");
        });
    });

    // Sorting Headers
    const headers = {
        sortId: 'CustomerID',
        sortGender: 'Gender',
        sortAge: 'Age',
        sortIncome: 'Annual Income (k$)',
        sortSpending: 'Spending Score (1-100)',
        sortSegment: 'Segment'
    };

    Object.keys(headers).forEach(id => {
        document.getElementById(id).addEventListener("click", () => {
            const field = headers[id];
            if (filters.sortField === field) {
                filters.sortDirection = filters.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                filters.sortField = field;
                filters.sortDirection = 'asc';
            }
            updateSortIcons(id);
            updateDashboard();
        });
    });

    // Pagination
    document.getElementById("prevPageBtn").addEventListener("click", () => {
        if (filters.currentPage > 1) {
            filters.currentPage--;
            renderTable();
        }
    });

    document.getElementById("nextPageBtn").addEventListener("click", () => {
        const totalPages = Math.ceil(filteredData.length / filters.pageSize);
        if (filters.currentPage < totalPages) {
            filters.currentPage++;
            renderTable();
        }
    });
});

async function loadData() {
    try {
        const response = await fetch('customers_segmented.json');
        rawData = await response.json();
        filteredData = [...rawData.customers];
        
        // Populate dashboard
        updateDashboard(true); // true means create charts from scratch
    } catch (error) {
        console.error("Error loading JSON data:", error);
    }
}

function initSliders() {
    const ageMin = document.getElementById("ageMin");
    const ageMax = document.getElementById("ageMax");
    const incomeMin = document.getElementById("incomeMin");
    const incomeMax = document.getElementById("incomeMax");

    const updateAge = () => {
        let valMin = parseInt(ageMin.value);
        let valMax = parseInt(ageMax.value);
        if (valMin > valMax) {
            let temp = valMin;
            valMin = valMax;
            valMax = temp;
        }
        document.getElementById("ageMinVal").innerText = valMin;
        document.getElementById("ageMaxVal").innerText = valMax;
        filters.ageMin = valMin;
        filters.ageMax = valMax;
        filters.currentPage = 1;
        updateDashboard();
    };

    const updateIncome = () => {
        let valMin = parseInt(incomeMin.value);
        let valMax = parseInt(incomeMax.value);
        if (valMin > valMax) {
            let temp = valMin;
            valMin = valMax;
            valMax = temp;
        }
        document.getElementById("incomeMinVal").innerText = valMin;
        document.getElementById("incomeMaxVal").innerText = valMax;
        filters.incomeMin = valMin;
        filters.incomeMax = valMax;
        filters.currentPage = 1;
        updateDashboard();
    };

    ageMin.addEventListener("input", updateAge);
    ageMax.addEventListener("input", updateAge);
    incomeMin.addEventListener("input", updateIncome);
    incomeMax.addEventListener("input", updateIncome);
}

function resetFilters() {
    filters.gender = 'all';
    filters.segment = 'all';
    filters.ageMin = 18;
    filters.ageMax = 70;
    filters.incomeMin = 15;
    filters.incomeMax = 137;
    filters.searchQuery = '';
    filters.currentPage = 1;

    document.getElementById("genderFilter").value = 'all';
    document.getElementById("segmentFilter").value = 'all';
    document.getElementById("tableSearch").value = '';
    
    document.getElementById("ageMin").value = 18;
    document.getElementById("ageMax").value = 70;
    document.getElementById("ageMinVal").innerText = 18;
    document.getElementById("ageMaxVal").innerText = 70;

    document.getElementById("incomeMin").value = 15;
    document.getElementById("incomeMax").value = 137;
    document.getElementById("incomeMinVal").innerText = 15;
    document.getElementById("incomeMaxVal").innerText = 137;

    updateDashboard();
}

function updateSortIcons(activeId) {
    const headers = ['sortId', 'sortGender', 'sortAge', 'sortIncome', 'sortSpending', 'sortSegment'];
    headers.forEach(id => {
        const icon = document.querySelector(`#${id} i`);
        if (id === activeId) {
            icon.className = filters.sortDirection === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
        } else {
            icon.className = '';
        }
    });
}

function updateDashboard(initCharts = false) {
    if (!rawData) return;
    
    // Apply filters
    applyFilters();
    
    // Update KPIs
    updateKPIs();
    
    // Render Charts
    renderCharts(initCharts);
    
    // Render Table
    renderTable();
}

function applyFilters() {
    filteredData = rawData.customers.filter(c => {
        // Gender filter
        if (filters.gender !== 'all' && c.Gender !== filters.gender) return false;
        
        // Segment filter
        if (filters.segment !== 'all' && c.Segment !== filters.segment) return false;
        
        // Age Range
        if (c.Age < filters.ageMin || c.Age > filters.ageMax) return false;
        
        // Income Range
        const income = c['Annual Income (k$)'];
        if (income < filters.incomeMin || income > filters.incomeMax) return false;
        
        // Search query
        if (filters.searchQuery) {
            const matchQuery = c.CustomerID.toString().includes(filters.searchQuery) ||
                               c.Gender.toLowerCase().includes(filters.searchQuery) ||
                               c.Segment.toLowerCase().includes(filters.searchQuery);
            if (!matchQuery) return false;
        }
        
        return true;
    });

    // Sorting
    filteredData.sort((a, b) => {
        let valA = a[filters.sortField];
        let valB = b[filters.sortField];
        
        // For text columns
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        
        if (valA < valB) return filters.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return filters.sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function updateKPIs() {
    const total = filteredData.length;
    let avgAge = 0;
    let avgIncome = 0;
    let avgSpending = 0;

    if (total > 0) {
        avgAge = filteredData.reduce((sum, c) => sum + c.Age, 0) / total;
        avgIncome = filteredData.reduce((sum, c) => sum + c['Annual Income (k$)'], 0) / total;
        avgSpending = filteredData.reduce((sum, c) => sum + c['Spending Score (1-100)'], 0) / total;
    }

    animateCounter("kpiTotalCustomers", total, 0);
    animateCounter("kpiAvgAge", avgAge.toFixed(1), 1);
    animateCounter("kpiAvgIncome", `$${avgIncome.toFixed(1)}k`, 1, `$`, `k`);
    animateCounter("kpiAvgSpending", avgSpending.toFixed(1), 1);
}

function animateCounter(id, endValue, decimals = 0, prefix = "", suffix = "") {
    const element = document.getElementById(id);
    if (!element) return;
    
    // Quick swap if it's a string representation or no animation is needed
    if (isNaN(parseFloat(endValue.toString().replace(/[^0-9.]/g, "")))) {
        element.innerText = endValue;
        return;
    }

    const numericEnd = parseFloat(endValue.toString().replace(/[^0-9.]/g, ""));
    let start = 0;
    const duration = 800; // ms
    const stepTime = 16; // ~60fps
    const steps = duration / stepTime;
    const increment = numericEnd / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
        currentStep++;
        start += increment;
        if (currentStep >= steps) {
            clearInterval(timer);
            element.innerText = prefix + numericEnd.toFixed(decimals) + suffix;
        } else {
            element.innerText = prefix + start.toFixed(decimals) + suffix;
        }
    }, stepTime);
}

function renderCharts(init = false) {
    const isDark = document.documentElement.getAttribute("data-theme") === 'dark';
    const textThemeColor = isDark ? '#9ca3af' : '#475569';
    const gridThemeColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // 1. SCATTER CHART (Income vs Spending Score)
    const scatterDataSets = Object.keys(segmentConfig).map(segmentName => {
        const segData = filteredData.filter(c => c.Segment === segmentName);
        return {
            label: segmentConfig[segmentName].label,
            data: segData.map(c => ({
                x: c['Annual Income (k$)'],
                y: c['Spending Score (1-100)'],
                id: c.CustomerID,
                age: c.Age,
                gender: c.Gender
            })),
            backgroundColor: segmentConfig[segmentName].color,
            pointRadius: 6,
            pointHoverRadius: 8
        };
    });

    if (init || !charts.scatter) {
        if (charts.scatter) charts.scatter.destroy();
        const ctx = document.getElementById("scatterChart").getContext("2d");
        charts.scatter = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: scatterDataSets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: textThemeColor, font: { family: 'Plus Jakarta Sans', weight: 500 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const pt = context.raw;
                                return [
                                    `Customer ID: ${pt.id}`,
                                    `Gender: ${pt.gender}, Age: ${pt.age}`,
                                    `Annual Income: $${pt.x}k`,
                                    `Spending Score: ${pt.y}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Annual Income (k$)', color: textThemeColor },
                        ticks: { color: textThemeColor },
                        grid: { color: gridThemeColor }
                    },
                    y: {
                        title: { display: true, text: 'Spending Score (1-100)', color: textThemeColor },
                        ticks: { color: textThemeColor },
                        grid: { color: gridThemeColor }
                    }
                }
            }
        });
    } else {
        charts.scatter.data.datasets = scatterDataSets;
        charts.scatter.options.scales.x.title.color = textThemeColor;
        charts.scatter.options.scales.x.ticks.color = textThemeColor;
        charts.scatter.options.scales.x.grid.color = gridThemeColor;
        charts.scatter.options.scales.y.title.color = textThemeColor;
        charts.scatter.options.scales.y.ticks.color = textThemeColor;
        charts.scatter.options.scales.y.grid.color = gridThemeColor;
        charts.scatter.options.plugins.legend.labels.color = textThemeColor;
        charts.scatter.update();
    }

    // 2. DONUT CHART (Gender Ratio)
    const maleCount = filteredData.filter(c => c.Gender === 'Male').length;
    const femaleCount = filteredData.filter(c => c.Gender === 'Female').length;
    const donutData = {
        labels: ['Female', 'Male'],
        datasets: [{
            data: [femaleCount, maleCount],
            backgroundColor: ['#e0f2fe', '#0284c7'], // Custom blue shades
            borderColor: isDark ? '#090d16' : '#ffffff',
            borderWidth: 2
        }]
    };

    if (init || !charts.donut) {
        if (charts.donut) charts.donut.destroy();
        const ctx = document.getElementById("donutChart").getContext("2d");
        charts.donut = new Chart(ctx, {
            type: 'doughnut',
            data: donutData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textThemeColor, font: { family: 'Plus Jakarta Sans', weight: 500 } }
                    }
                },
                cutout: '65%'
            }
        });
    } else {
        charts.donut.data.datasets[0].data = [femaleCount, maleCount];
        charts.donut.data.datasets[0].borderColor = isDark ? '#090d16' : '#ffffff';
        charts.donut.options.plugins.legend.labels.color = textThemeColor;
        charts.donut.update();
    }

    // 3. BAR CHART (Customer Count by Segment)
    const segmentCounts = Object.keys(segmentConfig).map(segmentName => {
        return filteredData.filter(c => c.Segment === segmentName).length;
    });
    const segmentLabels = Object.keys(segmentConfig).map(segmentName => segmentConfig[segmentName].label);
    const segmentColors = Object.keys(segmentConfig).map(segmentName => segmentConfig[segmentName].color);

    const segmentCountData = {
        labels: segmentLabels,
        datasets: [{
            label: 'Customers',
            data: segmentCounts,
            backgroundColor: segmentColors,
            borderRadius: 8
        }]
    };

    if (init || !charts.segmentCount) {
        if (charts.segmentCount) charts.segmentCount.destroy();
        const ctx = document.getElementById("segmentCountChart").getContext("2d");
        charts.segmentCount = new Chart(ctx, {
            type: 'bar',
            data: segmentCountData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { color: textThemeColor }, grid: { display: false } },
                    y: { ticks: { color: textThemeColor }, grid: { color: gridThemeColor } }
                }
            }
        });
    } else {
        charts.segmentCount.data.datasets[0].data = segmentCounts;
        charts.segmentCount.options.scales.x.ticks.color = textThemeColor;
        charts.segmentCount.options.scales.y.ticks.color = textThemeColor;
        charts.segmentCount.options.scales.y.grid.color = gridThemeColor;
        charts.segmentCount.update();
    }

    // 4. AVERAGE SPENDING SCORE BY SEGMENT (Horizontal Bar Chart)
    const avgSpendingData = Object.keys(segmentConfig).map(segmentName => {
        const segData = filteredData.filter(c => c.Segment === segmentName);
        if (segData.length === 0) return 0;
        return segData.reduce((sum, c) => sum + c['Spending Score (1-100)'], 0) / segData.length;
    });

    const spendingSegmentData = {
        labels: segmentLabels,
        datasets: [{
            label: 'Avg Spending Score',
            data: avgSpendingData,
            backgroundColor: segmentColors.map(color => color + '80'), // Add transparency
            borderColor: segmentColors,
            borderWidth: 1.5,
            borderRadius: 6
        }]
    };

    if (init || !charts.spendingSegment) {
        if (charts.spendingSegment) charts.spendingSegment.destroy();
        const ctx = document.getElementById("spendingSegmentChart").getContext("2d");
        charts.spendingSegment = new Chart(ctx, {
            type: 'bar',
            data: spendingSegmentData,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { color: textThemeColor }, grid: { color: gridThemeColor } },
                    y: { ticks: { color: textThemeColor }, grid: { display: false } }
                }
            }
        });
    } else {
        charts.spendingSegment.data.datasets[0].data = avgSpendingData;
        charts.spendingSegment.options.scales.x.ticks.color = textThemeColor;
        charts.spendingSegment.options.scales.x.grid.color = gridThemeColor;
        charts.spendingSegment.options.scales.y.ticks.color = textThemeColor;
        charts.spendingSegment.update();
    }
}

function renderTable() {
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    const startIdx = (filters.currentPage - 1) * filters.pageSize;
    const endIdx = startIdx + filters.pageSize;
    const pageData = filteredData.slice(startIdx, endIdx);
    
    if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No customers match the current filter criteria.</td></tr>`;
        document.getElementById("paginationInfo").innerText = "Showing 0-0 of 0 entries";
        document.getElementById("prevPageBtn").disabled = true;
        document.getElementById("nextPageBtn").disabled = true;
        return;
    }
    
    pageData.forEach(c => {
        const seg = segmentConfig[c.Segment];
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><b>${c.CustomerID}</b></td>
            <td>${c.Gender}</td>
            <td>${c.Age}</td>
            <td>$${c['Annual Income (k$)']}k</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 60px; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${c['Spending Score (1-100)']}%; height: 100%; background: ${seg ? seg.color : 'var(--primary)'}"></div>
                    </div>
                    <span>${c['Spending Score (1-100)']}</span>
                </div>
            </td>
            <td><span class="cluster-tag ${seg ? seg.tag : ''}">${seg ? seg.label : c.Segment}</span></td>
        `;
        tableBody.appendChild(row);
    });
    
    // Update pagination status
    const showingStart = startIdx + 1;
    const showingEnd = Math.min(endIdx, filteredData.length);
    document.getElementById("paginationInfo").innerText = `Showing ${showingStart}-${showingEnd} of ${filteredData.length} entries`;
    
    document.getElementById("prevPageBtn").disabled = filters.currentPage === 1;
    document.getElementById("nextPageBtn").disabled = endIdx >= filteredData.length;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute("data-theme", newTheme);
    
    const themeBtnIcon = document.querySelector("#themeToggleBtn i");
    if (newTheme === 'dark') {
        themeBtnIcon.className = "fa-solid fa-moon";
    } else {
        themeBtnIcon.className = "fa-solid fa-sun";
    }
    
    // Update charts styling for new theme colors
    updateDashboard();
}
