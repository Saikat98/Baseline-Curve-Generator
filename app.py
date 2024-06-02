# Author: Saikat Sutradhar
# Date: 06/2023

from flask import Flask, render_template, request, jsonify, send_file
import numpy as np
import pandas as pd
from io import BytesIO

app = Flask(__name__)

# test data
data_map = {
    # "**Sample**":
    # [0.564018307606669,	0.474743565755783,	0.519380936681226,	0.479651839615605,	0.447880530658719,	0.463766185137162,	0.463536645371374,	0.444819829831877,	0.454178237601625,	0.455749114861253,	0.454963676231439,	0.458946014402635,	0.469831678895123,	0.464388846648879,	0.474350707327236,	0.469369776988057,	0.462972402996468,	0.398069861025596,	0.405808894124376,	0.401939377574986,	0.403874135849681,	0.407685292304574,	0.370652914754018,	0.388595797871363,	0.409400360570171,	0.413159779494748,	0.403723895087833,	0.382836845561459,	0.393280370324646,	0.392736406218179,	0.387285786753516,	0.391518721885155,	0.408866056190385,	0.383487025895664,	0.38698853824611,	0.358513888153132,	0.319587912087912,	0.33831172937085,	0.328949820729381,	0.333630775050116,	0.331290297889749,	0.332460536469932,	0.33187541717984,	0.332167976824886,	0.353099730458221,	0.346017922504102,	0.34216345018569],
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    upload_file = pd.read_excel(io=request.files["upload_file"])
    for col in upload_file.columns.tolist():
        data_map[col] = upload_file[col].dropna().values.tolist()
    print(list(data_map.keys()))
    # options = [{'value': str(val), 'text': str(val)} for val in list(data_map.keys())]
    # print(options)
    return jsonify(
        {
            'options':list(data_map.keys())
        }
    )

@app.route('/calculate', methods=['POST'])
def updateChart():
    response = request.get_json()
    selected_data = response["selected_data"]
    # uploaded = response["uploaded"]
    window_size = response["window_size"]
    smooth_factor = response["smooth_factor"]
    vertical_shift = response["vertical_shift"]
    start_end_same = response["start_end_same"]

    # if uploaded == 0:
    #     selected_data = response["selected_data"]
    #     original_data = data_map[selected_data]
    # elif uploaded == 1:
    #     selected_data = request.files['selected_data']
    #     df = pd.read_excel(selected_data)
    #     original_data = df.iloc[:,0].values.tolist()
    
    original_data = data_map[selected_data]

    # Calculate baseline curve with local minima and moving average
    baseline = calculate_baseline(
        data=original_data, 
        window_size=window_size, 
        smooth_factor=smooth_factor,
        start_end_same=start_end_same,
        vertical_shift=vertical_shift
    )

    return jsonify(
        {
            "labels":np.arange(0,len(original_data)).tolist(),
            "original_data":original_data,
            "baseline":baseline.tolist()
        }
    )

@app.route('/export_to_excel', methods=['POST'])
def export_to_excel():
    response = request.get_json()

    original_data = response["original_data"]
    baseline = response["baseline"]
    # print(original_data)
    # Combine data and baseline into a DataFrame
    df = pd.DataFrame({'original_data': original_data, 'baseline': baseline})

    output = BytesIO()
    writer = pd.ExcelWriter(output, engine='xlsxwriter')

    #taken from the original question
    df.to_excel(writer, startrow=0, merge_cells=False, sheet_name="Sheet_1",index=False)

    #the writer has done its job
    writer.close()

    #go back to the beginning of the stream
    output.seek(0)

    #finally return the file
    return send_file(output, download_name="chart_data.xlsx", as_attachment=True)

    # return jsonify({'success': True})

# HELPER FUNCTION
def calculate_baseline(data, window_size, smooth_factor, start_end_same:bool=True,vertical_shift:int=0):
    baseline = np.copy(data)  # Create a copy of the data to store the baseline curve
    for i in range(window_size, len(data) - window_size):
        window = data[i - window_size : i + window_size + 1]
        local_min = np.min(window)
        baseline[i] = local_min
    
    # Apply moving average smoothing
    smoothed_baseline = np.convolve(baseline, np.ones(smooth_factor) / smooth_factor, mode='same')
    
    # smoothed_baseline = np.copy(baseline)
    # for i in range(smooth_factor, len(baseline) - smooth_factor):
    #     smoothed_baseline[i] = np.mean(baseline[i - smooth_factor : i + smooth_factor + 1])
    
    # Apply vertical shift
    min_val = np.min(smoothed_baseline)
    max_val = np.max(smoothed_baseline)
    range_val = max_val - min_val
    scaled_shift = vertical_shift * range_val
    shifted_baseline = smoothed_baseline + scaled_shift

    # Keep the first and last points the same as original data
    if start_end_same:
        shifted_baseline[0] = data[0]
        shifted_baseline[-1] = data[-1]
    
    return shifted_baseline
    

if __name__ == '__main__':
    app.run(debug=True)
    # webview.start()
