from flask import Flask, request, send_file
from flask_cors import CORS
import boto3
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt
import io
import time


# AWS S3 client configs
s3_CRE = boto3.client('s3',
                  aws_access_key_id='AKIA5UDSK4HAQV3AMJ3K',
                  aws_secret_access_key='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',
                  region_name='us-east-1')


# Load CRE data from AWS S3
def load_CRE_datasets(bucket_name):
    datasets = []
    object_keys = ['Kidney.csv', 'Heart.csv', 'Artery.csv', 'Adrenal.csv']

    for key in object_keys:
        obj = s3_CRE.get_object(Bucket=bucket_name, Key=key)
        dataset = pd.read_csv(BytesIO(obj['Body'].read()))
        datasets.append(dataset)

    return datasets


# Flask App
app = Flask(__name__)
CORS(app)

bucket_name = 'capstone-cre'
datasets = load_CRE_datasets(bucket_name)

def draw_CRE_barchart(chrom, start_pos, end_pos=False, dfs=datasets, tissues = ['Kidney', 'Heart', 'Artery', 'Adrenal']):
    
    chrom = 'chr'+chrom
    start_pos = float(start_pos)*1e6
    end_pos = float(end_pos)*1e6 if end_pos else start_pos + 1e5
    
    y_positions = {tissue: i+1 for i, tissue in enumerate(tissues)}
    
    fig, ax = plt.subplots(figsize=(14, 5))
    def draw_bars(df, tissue_name, color):
        df_filtered = df[(df['chr'] == chrom) & (df['start'] >= start_pos) & (df['end'] <= end_pos)]
        for index, row in df_filtered.iterrows():
            width = row['end'] - row['start']
            ax.barh(y_positions[tissue_name], width, left=row['start'], color=color)
     
    colors = ['purple','green', 'blue', 'red']
    for df, tissue_name, color in zip(dfs, tissues, colors):
        draw_bars(df, tissue_name, color)
    
    ax.text(1, -0.15, chrom, verticalalignment='top', horizontalalignment='left', transform=ax.transAxes, fontsize=10)
    ax.set_yticks(list(y_positions.values()))
    ax.set_yticklabels(list(y_positions.keys()),size=10)
    ax.set_xlim(start_pos-1e4, end_pos+1e4)
    plt.ylabel('CRE',size=15)


@app.route('/generate_CRE_plot', methods=['POST'])
def generate_CRE_plot():
    
    start_time = time.time()
    
    data = request.get_json()
    chrom = data.get('chromosome')
    start_pos = data.get('start')
    end_pos = data.get('end', False)

    # Call the plot function
    draw_CRE_barchart(chrom, start_pos, end_pos)

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



# Run the Flask App
if __name__ == '__main__':
    app.run()