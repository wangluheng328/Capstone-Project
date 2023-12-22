from flask import Flask, request, send_file
from flask_cors import CORS
# from flask_ngrok import run_with_ngrok
import boto3
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt
import io
import time
import sqlite3
import seaborn as sns

# Flask App
app = Flask(__name__)
CORS(app)
# run_with_ngrok(app)

def plot_tpm_violin(gene):
    # Connect to database
    conn = sqlite3.connect(r"/root/Capstone-Project/TPM/tpm.db")
    cursor = conn.cursor()

    # Get list of tables in the database
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(len(tables))

    # Create graphs
    plt.figure(figsize=(20, 10))

    # Violin plot
    all_data = []
    positions = []
    for i, table in enumerate(tables):
        # Query
        query = f"SELECT TPM FROM {table} WHERE Description = '{gene}'"
        df = pd.read_sql_query(query, conn)
        if not df.empty:
            all_data.append(df['TPM'])
            positions.append(i)

    # Plot
    sns.violinplot(data=all_data, positions=positions, scale='width')
    plt.xticks(positions, tables, fontsize=24)
    plt.xlabel('Tissue Name', fontsize=24)
    plt.ylabel('TPM', fontsize=24)
    plt.title(f"{gene} in Different Tissues", fontsize=30)
    plt.tight_layout()

@app.route('/generate_tpm_plot', methods=['POST'])
def generate_tpm_plot():
    
    start_time = time.time()
    
    data = request.get_json()
    
    gene = data.get('gene')

    # Call the plot function
    plot_tpm_violin(gene)

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
    app.run(host='0.0.0.0', port=8102)