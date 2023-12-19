from flask import Flask, request, send_file
from flask_cors import CORS
# from flask_ngrok import run_with_ngrok
import boto3
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt
import io
import time

# AWS s3 client configs

s3 = boto3.client('s3',
                  aws_access_key_id='AKIA5UDSK4HA7Y4EHANT',
                  aws_secret_access_key='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',
                  region_name='us-east-1')

def load_deltasvm_datasets(bucket_name):
    datasets = []
    object_keys = ['adrenal_dsvm.csv', 'arteryti_dsvm.csv', 'heart_dsvm.csv', 'kidney_dsvm.csv']

    for key in object_keys:
        obj = s3.get_object(Bucket=bucket_name, Key=key)
        dataset = pd.read_csv(BytesIO(obj['Body'].read()))
        datasets.append(dataset)

    return datasets

# Flask App
app = Flask(__name__)
CORS(app)
# run_with_ngrok(app)

bucket_name = 'capstone-deltasvm'
datasets = load_deltasvm_datasets(bucket_name)
print('data set load success')


def plot_delta_svm(datasets, chr_position_allele):
    y_axis_min = -0.05
    data_rsid = []
    rsids = []
    for dsvm in datasets:
        filtered_dsvm_rsid = dsvm[dsvm['chr_position_allele'] == chr_position_allele]
        rsid = filtered_dsvm_rsid['rsid'].values[0] if not filtered_dsvm_rsid.empty else 0
        first_score_rsid = filtered_dsvm_rsid['score2'].values[0] if not filtered_dsvm_rsid.empty else 0
        rsids.append(rsid)
        data_rsid.append(first_score_rsid)

    for i in rsids:
        if i != 0:
            rsid = i
            break

    # Plotting
    fig, ax = plt.subplots(figsize=(6, 5))
    colors = ['crimson', 'navy', 'green', 'purple']
    dsvmsn = ['adrenal', 'artery', 'heart', 'kidney']

    ax.bar(dsvmsn, data_rsid, label=chr_position_allele, color=colors, width=0.5, bottom=y_axis_min)
    ax.set_ylabel('deltaSVMs')
    ax.set_title(rsid)
    ax.set_ylim([y_axis_min, max(data_rsid)+y_axis_min])



@app.route('/generate_deltasvm_plot', methods=['POST'])
def generate_deltasvm_plot():
    
    start_time = time.time()
    
    data = request.get_json()
    
    chr_position_allele = data.get('chr_position_allele')

    # Call the plot function
    plot_delta_svm(datasets, chr_position_allele)
    print('plot success')

    # Save the plot to a BytesIO object
    buf = io.BytesIO()
    plt.savefig(buf, format='jpeg', dpi = 400, bbox_inches = 'tight')
    plt.close()
    buf.seek(0)
    
    end_time = time.time()
    elapsed_time = end_time - start_time
    print(f"Time taken to generate the image: {elapsed_time} seconds")

    # Send the plot as a response
    return send_file(buf, mimetype='image/jpeg')


@app.route('/test')
def test():
    return "Connection Success!"

# Run the Flask App
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8101)