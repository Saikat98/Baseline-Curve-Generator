// script.js
var uploadButton = document.getElementById("uploadButton");
var uploadButton_label = document.getElementById("uploadButton_label");
var selectedData = document.getElementById("selectedData");
// const uploadData = document.getElementById("uploadData");
var windowSize = document.getElementById("windowSize");
var windowSize_label = document.getElementById("windowSize_label");
var smoothFactor = document.getElementById("smoothFactor");
var smoothFactor_label = document.getElementById("smoothFactor_label");
var verticalShift = document.getElementById("verticalShift");
var verticalShift_label = document.getElementById("verticalShift_label");
var startEndSame = document.getElementById("startEndSame");
var ctx = document.getElementById("chartCanvas");
var exportButton = document.getElementById("exportButton");

var upload_file;

var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Original Data', // Name the series
            data: [], // Specify the data values array
            fill: false,
            borderColor: '#2196f3', // Add custom color border (Line)
            backgroundColor: '#2196f3', // Add custom color background (Points and Fill)
            borderWidth: 2, // Specify bar border width
            pointRadius: 0,
            tension: 0.1 // round edges in chart
        },
        {
            label: 'Baseline', // Name the series
            data: [], // Specify the data values array
            fill: false,
            borderColor: '#FF7F0E', // Add custom color border (Line)
            backgroundColor: '#FF7F0E', // Add custom color background (Points and Fill)
            borderWidth: 2, // Specify bar border width
            pointRadius: 0,
            tension: 0.1 // round edges in chart
        }]
    },
    options: {
        responsive: false,
        scales: {
          x: {
            display: false
          },
          y: {
            display: true
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          }
        }
    }
});

windowSize_label.innerHTML = windowSize.value;
smoothFactor_label.innerHTML = smoothFactor.value;
verticalShift_label.innerHTML = verticalShift.value;

selectedData.addEventListener('change', function() {
    // selected_data = selectedData.value;
    updateChart();
});

// uploadData.addEventListener('click',function(event) {
//     var file = event.target.files[0];
//     selected_data = file;
//     uploaded = 1;
// });

windowSize.addEventListener('change', function() {
    windowSize_label.innerHTML = windowSize.value;
    updateChart();
});

smoothFactor.addEventListener('change', function() {
    smoothFactor_label.innerHTML = smoothFactor.value;
    updateChart();
});

verticalShift.addEventListener('change', function() {
    verticalShift_label.innerHTML = verticalShift.value;
    updateChart();
});

startEndSame.addEventListener('change', function() {
    updateChart();
});


function updateChart() {
    var selected_data = selectedData.value;
    var window_size = parseInt(windowSize.value);
    var smooth_factor = parseInt(smoothFactor.value);
    var vertical_shift = parseFloat(verticalShift.value);
    var start_end_same = startEndSame.checked;

    // Send the data to the backend for chart update
    fetch('/calculate', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(
        {
            selected_data:selected_data,
            // uploaded:uploaded,
            window_size:window_size,
            smooth_factor:smooth_factor,
            vertical_shift:vertical_shift,
            start_end_same:start_end_same
        })
    })
    .then(response => response.json())  
    .then(data => {
        myChart.data.labels = data.labels
        myChart.data.datasets[0].data = data.original_data
        myChart.data.datasets[1].data = data.baseline
        myChart.update();
    })
    .catch(function(error) {
        console.log('Error:', error);
    });
}

exportButton.disabled = true;
exportButton.addEventListener('click', function() {
    // Get the chart data
    console.log("click");
    var chartData = myChart.data.datasets;

    fetch('/export_to_excel', {
        method: 'POST',
        body: JSON.stringify(
            {
                original_data:chartData[0].data,
                baseline:chartData[1].data
            }
        ),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(function(response) {
        return response.blob();
    })
    .then(function(blob) {
        // Create a temporary URL for the downloaded file
        var url = window.URL.createObjectURL(blob);

        // Create a link element and trigger the download
        var link = document.createElement('a');
        link.href = url;
        var filename = selectedData.value.toUpperCase() + '_CHART_DATA - ' + new Date().toISOString() + '.xlsx';
        link.download = filename;
        link.click();

        // Clean up the temporary URL
        window.URL.revokeObjectURL(url);
    })
    .catch(function(error) {
        console.log(error);
    });
});

uploadButton.addEventListener('change', function(event)  {
    upload_file = event.target.files[0];

    var client_data = new FormData();
    client_data.append('upload_file', upload_file);

    // Send the data to the backend for chart update
    fetch('/upload', {
        method: 'POST',
        body: client_data
    })
    .then(response => response.json())  
    .then(data => {
        // updating the dropdown
        var options_data = data.options;
        selectedData.innerHTML = '';
        options_data.forEach(option => {
            console.log(option);
            var optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectedData.appendChild(optionElement);
        });

        // enabling the buttons
        uploadButton_label.classList.add('uploaded');
        uploadButton_label.innerHTML = 'Data Loaded';
        exportButton.disabled = false;
        exportButton.classList.remove('disabled');
    })
    .catch(error => {
    console.error('Error:', error);
    });
});